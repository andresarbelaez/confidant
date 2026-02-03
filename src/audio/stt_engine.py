"""Speech-to-text engine using offline Whisper."""

from typing import Optional, Union
import numpy as np
from faster_whisper import WhisperModel

from ..config.settings import get_settings


class STTEngine:
    """Speech-to-text using offline Whisper model."""
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        model_size: Optional[str] = None,
        device: Optional[str] = None,
        compute_type: Optional[str] = None,
        language: Optional[str] = None
    ):
        """
        Initialize STT engine.
        
        Args:
            model_path: Path to Whisper model. If None, uses default from config.
            model_size: Model size (tiny, base, small, medium, large). If None, uses default from config.
            device: Device to run on ('cpu', 'cuda'). If None, uses default from config.
            compute_type: Compute type (int8, int8_float16, float16, float32). If None, uses default from config.
            language: Language code (e.g., 'en'). If None, uses default from config.
        """
        settings = get_settings()
        self.model_size = model_size or settings.get("stt.model_size", "base")
        self.device = device or settings.get("stt.device", "cpu")
        self.compute_type = compute_type or settings.get("stt.compute_type", "int8")
        self.language = language or settings.get("stt.language", "en")
        
        # Use model_path if provided, otherwise use model_size
        if model_path:
            self.model_path = model_path
        else:
            # Use model_size to download/load model
            self.model_path = self.model_size
        
        print(f"Loading Whisper model: {self.model_path} on {self.device} ({self.compute_type})")
        self.model = WhisperModel(
            self.model_path,
            device=self.device,
            compute_type=self.compute_type
        )
        print("Whisper model loaded successfully")
    
    def transcribe(
        self,
        audio: np.ndarray,
        sample_rate: int = 16000,
        language: Optional[str] = None,
        beam_size: int = 5,
        best_of: int = 5,
        temperature: float = 0.0,
        vad_filter: bool = True
    ) -> str:
        """
        Transcribe audio to text.
        
        Args:
            audio: Audio data as numpy array (float32, normalized to [-1, 1])
            sample_rate: Sample rate of audio
            language: Language code. If None, uses instance default.
            beam_size: Beam size for decoding
            best_of: Number of candidates to consider
            temperature: Temperature for sampling
            vad_filter: Whether to use voice activity detection filter
            
        Returns:
            Transcribed text
        """
        lang = language or self.language
        
        # Convert audio to int16 if needed
        if audio.dtype != np.int16:
            # Normalize and convert
            audio_int16 = (audio * 32767.0).astype(np.int16)
        else:
            audio_int16 = audio
        
        segments, info = self.model.transcribe(
            audio_int16,
            language=lang,
            beam_size=beam_size,
            best_of=best_of,
            temperature=temperature,
            vad_filter=vad_filter,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        # Collect all segments
        text_parts = []
        for segment in segments:
            text_parts.append(segment.text)
        
        full_text = " ".join(text_parts).strip()
        return full_text
    
    def transcribe_stream(
        self,
        audio_chunks: list,
        sample_rate: int = 16000
    ) -> str:
        """
        Transcribe streaming audio chunks.
        
        Args:
            audio_chunks: List of audio chunks (numpy arrays)
            sample_rate: Sample rate of audio
            
        Returns:
            Transcribed text
        """
        # Concatenate chunks
        if len(audio_chunks) == 0:
            return ""
        
        full_audio = np.concatenate(audio_chunks)
        return self.transcribe(full_audio, sample_rate=sample_rate)
