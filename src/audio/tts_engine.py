"""Text-to-speech engine using offline TTS."""

from typing import Optional, List
import numpy as np
from TTS.api import TTS

from ..config.settings import get_settings


class TTSEngine:
    """Text-to-speech using offline TTS model."""
    
    def __init__(
        self,
        model_name: Optional[str] = None,
        device: Optional[str] = None
    ):
        """
        Initialize TTS engine.
        
        Args:
            model_name: Name of TTS model. If None, uses default from config.
            device: Device to run on ('cpu', 'cuda'). If None, uses default from config.
        """
        settings = get_settings()
        self.model_name = model_name or settings.get("tts.model_name", "tts_models/en/ljspeech/tacotron2-DDC")
        self.device = device or settings.get("tts.device", "cpu")
        
        print(f"Loading TTS model: {self.model_name} on {self.device}")
        try:
            self.tts = TTS(model_name=self.model_name, progress_bar=False).to(self.device)
            print("TTS model loaded successfully")
        except Exception as e:
            print(f"Warning: Could not load TTS model {self.model_name}: {e}")
            print("Falling back to default model")
            # Try a simpler model
            try:
                self.model_name = "tts_models/en/ljspeech/tacotron2-DDC"
                self.tts = TTS(model_name=self.model_name, progress_bar=False).to(self.device)
            except Exception as e2:
                raise RuntimeError(f"Failed to load any TTS model: {e2}")
    
    def synthesize(
        self,
        text: str,
        speaker: Optional[str] = None,
        language: Optional[str] = None,
        output_path: Optional[str] = None
    ) -> np.ndarray:
        """
        Synthesize speech from text.
        
        Args:
            text: Text to synthesize
            speaker: Optional speaker ID (for multi-speaker models)
            language: Optional language code
            output_path: Optional path to save audio file
            
        Returns:
            Audio data as numpy array (float32, normalized to [-1, 1])
        """
        if output_path:
            # Save to file
            self.tts.tts_to_file(
                text=text,
                file_path=output_path,
                speaker=speaker,
                language=language
            )
            # Load back as numpy array
            import soundfile as sf
            audio, sr = sf.read(output_path)
            return audio.astype(np.float32)
        else:
            # Generate directly to numpy array
            # Note: TTS library may not support direct numpy output for all models
            # So we'll use a temporary file approach
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            try:
                self.tts.tts_to_file(
                    text=text,
                    file_path=tmp_path,
                    speaker=speaker,
                    language=language
                )
                
                # Load audio
                import soundfile as sf
                audio, sr = sf.read(tmp_path)
                audio = audio.astype(np.float32)
                
                # Normalize if needed
                max_val = np.abs(audio).max()
                if max_val > 1.0:
                    audio = audio / max_val
                
                return audio
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
    
    def synthesize_stream(
        self,
        text: str,
        chunk_size: int = 50,
        speaker: Optional[str] = None,
        language: Optional[str] = None
    ) -> List[np.ndarray]:
        """
        Synthesize speech in chunks (for streaming).
        
        Args:
            text: Text to synthesize
            chunk_size: Number of characters per chunk
            speaker: Optional speaker ID
            language: Optional language code
            
        Returns:
            List of audio chunks
        """
        # Split text into chunks
        chunks = []
        words = text.split()
        current_chunk = []
        current_length = 0
        
        for word in words:
            word_length = len(word) + 1  # +1 for space
            if current_length + word_length > chunk_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = [word]
                current_length = word_length
            else:
                current_chunk.append(word)
                current_length += word_length
        
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        # Synthesize each chunk
        audio_chunks = []
        for chunk in chunks:
            if chunk.strip():
                audio = self.synthesize(chunk, speaker=speaker, language=language)
                audio_chunks.append(audio)
        
        return audio_chunks
