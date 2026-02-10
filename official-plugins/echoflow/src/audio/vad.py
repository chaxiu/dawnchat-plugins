"""
Voice Activity Detection using Silero VAD.
"""

import logging
from typing import Any, Tuple
import numpy as np

logger = logging.getLogger("echoflow.vad")


class SileroVAD:
    """
    Voice Activity Detection using Silero VAD model.
    
    Used to detect when user stops speaking.
    """
    
    def __init__(self, threshold: float = 0.5, sample_rate: int = 16000):
        self.threshold = threshold
        self.sample_rate = sample_rate
        self._model: Any = None
        self._utils: Any = None
        
        # State for speech detection
        self._silence_duration = 0.0
        self._last_speech_time = 0.0
        self._is_speaking = False
    
    def _ensure_model(self):
        """Lazy load the VAD model."""
        if self._model is not None:
            return
        
        try:
            import torch
            
            result = torch.hub.load(
                repo_or_dir='snakers4/silero-vad',
                model='silero_vad',
                force_reload=False,
                trust_repo=True
            )

            if isinstance(result, tuple) and len(result) >= 2:
                self._model = result[0]
                self._utils = result[1]
            else:
                self._model = result
                self._utils = None
            logger.info("Silero VAD model loaded")
            
        except Exception as e:
            logger.error(f"Failed to load Silero VAD: {e}")
            raise
    
    def reset(self):
        """Reset VAD state for new recording."""
        self._silence_duration = 0.0
        self._last_speech_time = 0.0
        self._is_speaking = False
        
        if self._model is not None:
            reset_fn = getattr(self._model, "reset_states", None)
            if callable(reset_fn):
                reset_fn()
    
    def process_chunk(
        self,
        audio_chunk: np.ndarray,
        chunk_duration: float = 0.5
    ) -> Tuple[bool, float]:
        """
        Process an audio chunk and detect speech activity.
        
        Args:
            audio_chunk: Audio samples as numpy array (float32, normalized)
            chunk_duration: Duration of the chunk in seconds
            
        Returns:
            (is_speech_ended, silence_duration)
        """
        self._ensure_model()
        
        import torch
        
        # Convert to tensor
        if audio_chunk.dtype != np.float32:
            audio_chunk = audio_chunk.astype(np.float32)
        
        # Normalize if needed
        if np.abs(audio_chunk).max() > 1.0:
            audio_chunk = audio_chunk / 32768.0
        
        tensor = torch.from_numpy(audio_chunk)
        
        # Get speech probability
        if self._model is None:
            raise RuntimeError("Silero VAD model not initialized")
        speech_prob = self._model(tensor, self.sample_rate).item()
        
        is_speech = speech_prob > self.threshold
        
        if is_speech:
            self._is_speaking = True
            self._silence_duration = 0.0
            self._last_speech_time = chunk_duration
        else:
            if self._is_speaking:
                self._silence_duration += chunk_duration
        
        # Consider speech ended if we had speech and now have significant silence
        SILENCE_THRESHOLD = 1.5  # seconds
        speech_ended = self._is_speaking and self._silence_duration >= SILENCE_THRESHOLD
        
        return speech_ended, self._silence_duration
    
    def is_speaking(self) -> bool:
        """Check if user is currently speaking."""
        return self._is_speaking and self._silence_duration < 0.5
    
    def get_silence_duration(self) -> float:
        """Get current silence duration in seconds."""
        return self._silence_duration
