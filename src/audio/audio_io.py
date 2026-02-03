"""Audio input/output handling."""

import sounddevice as sd
import numpy as np
from typing import Optional, Callable, List

from ..config.settings import get_settings


class AudioIO:
    """Handles microphone input and speaker output."""
    
    def __init__(
        self,
        sample_rate: Optional[int] = None,
        chunk_size: Optional[int] = None,
        input_device: Optional[int] = None,
        output_device: Optional[int] = None
    ):
        """
        Initialize audio I/O.
        
        Args:
            sample_rate: Audio sample rate. If None, uses default from config.
            chunk_size: Audio chunk size. If None, uses default from config.
            input_device: Input device index. If None, uses default from config or auto-detects.
            output_device: Output device index. If None, uses default from config or auto-detects.
        """
        settings = get_settings()
        self.sample_rate = sample_rate or settings.get("audio.sample_rate", 16000)
        self.chunk_size = chunk_size or settings.get("audio.chunk_size", 1024)
        self.input_device = input_device if input_device is not None else settings.get("audio.input_device")
        self.output_device = output_device if output_device is not None else settings.get("audio.output_device")
        
        # Validate devices
        self._validate_devices()
    
    def _validate_devices(self) -> None:
        """Validate and set audio devices."""
        devices = sd.query_devices()
        
        if self.input_device is not None:
            if self.input_device >= len(devices):
                print(f"Warning: Input device {self.input_device} not found. Using default.")
                self.input_device = None
        
        if self.output_device is not None:
            if self.output_device >= len(devices):
                print(f"Warning: Output device {self.output_device} not found. Using default.")
                self.output_device = None
    
    def list_devices(self) -> List[dict]:
        """List all available audio devices."""
        return sd.query_devices()
    
    def record(
        self,
        duration: Optional[float] = None
    ) -> np.ndarray:
        """
        Record audio from microphone.
        
        Args:
            duration: Duration in seconds. If None, raises ValueError.
            
        Returns:
            Recorded audio as numpy array
        """
        if duration is None:
            raise ValueError("Duration must be provided for recording")
        
        # Fixed duration recording
        recording = sd.rec(
            int(duration * self.sample_rate),
            samplerate=self.sample_rate,
            channels=1,
            device=self.input_device,
            dtype=np.float32
        )
        sd.wait()  # Wait until recording is finished
        return recording.flatten()
    
    def create_input_stream(self, callback: Callable):
        """
        Create an input stream with callback for continuous recording.
        
        Args:
            callback: Callback function that receives audio chunks
            
        Returns:
            sd.InputStream context manager
        """
        def stream_callback(indata, frames, time_info, status):
            if status:
                print(f"Audio status: {status}")
            callback(indata.copy())
        
        return sd.InputStream(
            device=self.input_device,
            channels=1,
            samplerate=self.sample_rate,
            blocksize=self.chunk_size,
            callback=stream_callback,
            dtype=np.float32
        )
    
    def play(self, audio: np.ndarray, blocking: bool = True) -> None:
        """
        Play audio through speaker.
        
        Args:
            audio: Audio data as numpy array
            blocking: Whether to block until playback is complete
        """
        # Ensure audio is 1D
        if len(audio.shape) > 1:
            audio = audio.flatten()
        
        # Normalize if needed
        max_val = np.abs(audio).max()
        if max_val > 1.0:
            audio = audio / max_val
        
        sd.play(audio, samplerate=self.sample_rate, device=self.output_device)
        
        if blocking:
            sd.wait()
    
    def play_stream(self, audio_chunks: List[np.ndarray]) -> None:
        """
        Play audio in chunks (for streaming TTS).
        
        Args:
            audio_chunks: List of audio chunks to play
        """
        for chunk in audio_chunks:
            self.play(chunk, blocking=True)
    
    def save_wav(self, audio: np.ndarray, filepath: str) -> None:
        """
        Save audio to WAV file.
        
        Args:
            audio: Audio data as numpy array
            filepath: Path to save WAV file
        """
        try:
            import soundfile as sf
            sf.write(filepath, audio, self.sample_rate)
        except ImportError:
            # Fallback to scipy if soundfile not available
            from scipy.io import wavfile
            # Convert to int16
            audio_int16 = (audio * 32767).astype(np.int16)
            wavfile.write(filepath, self.sample_rate, audio_int16)
    
    def load_wav(self, filepath: str) -> np.ndarray:
        """
        Load audio from WAV file.
        
        Args:
            filepath: Path to WAV file
            
        Returns:
            Audio data as numpy array
        """
        try:
            import soundfile as sf
            audio, sr = sf.read(filepath)
            if sr != self.sample_rate:
                # Resample if needed (simple approach)
                from scipy import signal
                num_samples = int(len(audio) * self.sample_rate / sr)
                audio = signal.resample(audio, num_samples)
            return audio.astype(np.float32)
        except ImportError:
            # Fallback to scipy
            from scipy.io import wavfile
            sr, audio = wavfile.read(filepath)
            audio = audio.astype(np.float32) / 32767.0  # Normalize to [-1, 1]
            if sr != self.sample_rate:
                from scipy import signal
                num_samples = int(len(audio) * self.sample_rate / sr)
                audio = signal.resample(audio, num_samples)
            return audio
