"""
Audio recorder - Handles audio chunk processing from frontend.
"""

import base64
import logging
import tempfile
from pathlib import Path
from typing import List, Optional
import numpy as np

logger = logging.getLogger("echoflow.recorder")


class AudioRecorder:
    """
    Processes audio chunks received from the frontend.
    
    The actual recording happens in JavaScript (Web Audio API).
    This class handles:
    - Decoding base64 audio chunks
    - Converting formats
    - Saving to WAV for processing
    """
    
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self._chunks: List[bytes] = []
        self._temp_dir = Path(tempfile.gettempdir()) / "echoflow"
        self._temp_dir.mkdir(parents=True, exist_ok=True)
    
    def reset(self):
        """Reset for new recording."""
        self._chunks = []
    
    def add_chunk(self, base64_data: str):
        """
        Add an audio chunk from the frontend.
        
        Args:
            base64_data: Base64-encoded audio data (WebM format)
        """
        try:
            audio_bytes = base64.b64decode(base64_data)
            self._chunks.append(audio_bytes)
        except Exception as e:
            logger.error(f"Failed to decode audio chunk: {e}")
    
    def get_audio_array(self) -> Optional[np.ndarray]:
        """
        Get the recorded audio as a numpy array.
        
        Returns:
            Audio samples as float32 numpy array, or None if no audio
        """
        if not self._chunks:
            return None
        
        try:
            import torchaudio
            
            # Combine all chunks
            combined = b''.join(self._chunks)
            
            # Save to temp file (torchaudio needs a file)
            temp_file = self._temp_dir / "temp_recording.webm"
            with open(temp_file, 'wb') as f:
                f.write(combined)
            
            # Load and convert
            waveform, sample_rate = torchaudio.load(str(temp_file))
            
            # Resample if needed
            if sample_rate != self.sample_rate:
                resampler = torchaudio.transforms.Resample(sample_rate, self.sample_rate)
                waveform = resampler(waveform)
            
            # Convert to mono if stereo
            if waveform.shape[0] > 1:
                waveform = waveform.mean(dim=0, keepdim=True)
            
            # Convert to numpy
            audio_array = waveform.squeeze().numpy().astype(np.float32)
            
            return audio_array
            
        except Exception as e:
            logger.error(f"Failed to process audio: {e}")
            return None
    
    def save_wav(self, output_path: Optional[str] = None) -> Optional[str]:
        """
        Save the recorded audio to a WAV file.
        
        Args:
            output_path: Optional output path. If None, uses temp directory.
            
        Returns:
            Path to the saved WAV file, or None if failed
        """
        audio_array = self.get_audio_array()
        if audio_array is None:
            return None
        
        try:
            import torchaudio
            import torch
            
            if output_path is None:
                output_path = str(self._temp_dir / "recording.wav")
            
            # Convert to tensor
            waveform = torch.from_numpy(audio_array).unsqueeze(0)
            
            # Save as WAV
            torchaudio.save(output_path, waveform, self.sample_rate)
            
            logger.info(f"Saved recording to: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to save WAV: {e}")
            return None
    
    def get_duration(self) -> float:
        """Get the duration of the recorded audio in seconds."""
        audio_array = self.get_audio_array()
        if audio_array is None:
            return 0.0
        return len(audio_array) / self.sample_rate




