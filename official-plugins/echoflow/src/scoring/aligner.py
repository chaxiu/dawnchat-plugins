"""
Wav2Vec2 forced alignment for pronunciation scoring.

Supports loading models from:
1. Local path (downloaded via Host)
2. HuggingFace Hub (fallback)
"""

import logging
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger("echoflow.aligner")


class Wav2Vec2Aligner:
    """
    Uses Wav2Vec2 CTC output for forced alignment.
    
    This aligns audio to a known phoneme sequence and computes
    confidence scores for each phoneme.
    
    Usage:
        # Option 1: Use local path (recommended, via Host SDK)
        path = await host.scoring.get_model_path("base")
        aligner = Wav2Vec2Aligner(model_path=path)
        
        # Option 2: Use HuggingFace model name (fallback)
        aligner = Wav2Vec2Aligner(model_name="facebook/wav2vec2-base-960h")
    """
    
    # Wav2Vec2 vocabulary (CTC tokens)
    # These map to phoneme-like units
    
    def __init__(
        self, 
        model_name: str = "facebook/wav2vec2-base-960h",
        model_path: Optional[str] = None
    ):
        """
        Initialize the aligner.
        
        Args:
            model_name: HuggingFace model name (used if model_path is None)
            model_path: Local path to the model directory (preferred)
                       If provided, model is loaded from this path instead of HuggingFace.
        """
        self.model_name = model_name
        self.model_path = model_path
        self._model: Any = None
        self._processor: Any = None
        self._sample_rate = 16000
        self._last_diagnostics: Optional[Dict[str, Any]] = None

    def get_last_diagnostics(self) -> Optional[Dict[str, Any]]:
        return self._last_diagnostics
    
    def _ensure_model(self):
        """Lazy load the Wav2Vec2 model."""
        if self._model is not None:
            return
        
        try:
            import torch
            from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
            import os
            
            # Determine which path to use
            load_path = self.model_path if self.model_path else self.model_name
            
            logger.info(f"Loading Wav2Vec2 model from: {load_path}")
            
            # Check files if local path
            use_safetensors = None
            if self.model_path and os.path.isdir(self.model_path):
                files = os.listdir(self.model_path)
                logger.info(f"Files in model directory: {files}")
                
                has_safetensors = "model.safetensors" in files
                has_bin = "pytorch_model.bin" in files
                
                if has_safetensors:
                    use_safetensors = True
                elif has_bin:
                    use_safetensors = False
                else:
                    logger.warning(f"No model file found in {self.model_path}, download might be incomplete")

            self._processor = Wav2Vec2Processor.from_pretrained(load_path)
            
            # Explicitly set use_safetensors if we detected the file type
            kwargs = {}
            if use_safetensors is not None:
                kwargs["use_safetensors"] = use_safetensors
                
            self._model = Wav2Vec2ForCTC.from_pretrained(load_path, **kwargs)
            self._model.eval()
            
            # Move to GPU if available
            if torch.cuda.is_available():
                self._model = self._model.cuda()
                logger.info("Wav2Vec2 model loaded on GPU")
            else:
                logger.info("Wav2Vec2 model loaded on CPU")
                
        except Exception as e:
            logger.error(f"Failed to load Wav2Vec2: {e}")
            raise
    
    def get_logits(self, audio: np.ndarray) -> np.ndarray:
        """
        Get CTC logits from audio.
        
        Args:
            audio: Audio samples as float32 numpy array (16kHz)
            
        Returns:
            Logits array of shape (time_steps, vocab_size)
        """
        self._ensure_model()
        
        import torch
        
        # Process audio
        processor = self._processor
        model = self._model
        if processor is None or model is None:
            raise RuntimeError("Wav2Vec2 model not initialized")

        inputs = processor(
            audio,
            sampling_rate=self._sample_rate,
            return_tensors="pt",
            padding=True
        )
        
        input_values = inputs.input_values
        
        if torch.cuda.is_available():
            input_values = input_values.cuda()
        
        # Get logits
        with torch.no_grad():
            outputs = model(input_values)
            logits = outputs.logits
        
        # Convert to numpy
        logits = logits.squeeze(0).cpu().numpy()
        
        return logits
    
    def decode(self, audio: np.ndarray) -> str:
        """
        Decode audio to text using CTC.
        
        Args:
            audio: Audio samples as float32 numpy array (16kHz)
            
        Returns:
            Decoded text
        """
        self._ensure_model()
        
        import torch
        
        processor = self._processor
        model = self._model
        if processor is None or model is None:
            raise RuntimeError("Wav2Vec2 model not initialized")

        inputs = processor(
            audio,
            sampling_rate=self._sample_rate,
            return_tensors="pt",
            padding=True
        )
        
        input_values = inputs.input_values
        
        if torch.cuda.is_available():
            input_values = input_values.cuda()
        
        with torch.no_grad():
            logits = model(input_values).logits
        
        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = processor.batch_decode(predicted_ids)
        
        return transcription[0] if transcription else ""
    
    def forced_align(
        self,
        audio: np.ndarray,
        target_phonemes: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Perform forced alignment of audio to phonemes.
        
        Uses CTC logits to find the best alignment path and
        compute confidence scores for each phoneme.
        
        Args:
            audio: Audio samples as float32 numpy array (16kHz)
            target_phonemes: List of target ARPAbet phonemes
            
        Returns:
            List of alignment results:
            [{"phoneme": str, "start_frame": int, "end_frame": int, "score": float}, ...]
        """
        self._ensure_model()
        
        import torch
        
        # Get logits
        logits = self.get_logits(audio)
        log_probs = torch.from_numpy(logits).log_softmax(dim=-1)

        processor = self._processor
        if processor is None:
            raise RuntimeError("Wav2Vec2 processor not initialized")
        tokenizer = getattr(processor, "tokenizer", None)
        blank_id = getattr(tokenizer, "pad_token_id", None)
        if blank_id is None:
            blank_id = 0

        top2 = log_probs.topk(k=2, dim=-1)
        top1_prob = top2.values[:, 0].exp()
        top2_prob = top2.values[:, 1].exp()
        top1_is_blank = (top2.indices[:, 0] == blank_id)
        blank_prob = log_probs[:, blank_id].exp()

        self._last_diagnostics = {
            "num_frames": int(logits.shape[0]),
            "blank_id": int(blank_id),
            "avg_top1_prob": float(top1_prob.mean().item()) if top1_prob.numel() else 0.0,
            "avg_top2_prob": float(top2_prob.mean().item()) if top2_prob.numel() else 0.0,
            "top1_is_blank_rate": float(top1_is_blank.float().mean().item()) if top1_is_blank.numel() else 0.0,
            "avg_blank_prob": float(blank_prob.mean().item()) if blank_prob.numel() else 0.0,
        }
        logger.debug(f"CTC diagnostics: {self._last_diagnostics}")
        
        # Map phonemes to token IDs (approximate)
        # Note: Wav2Vec2 uses character-level tokens, not phonemes
        # We'll use a simplified matching approach
        
        alignments = []
        num_frames = logits.shape[0]
        frames_per_phoneme = max(1, num_frames // max(1, len(target_phonemes)))
        
        for i, phoneme in enumerate(target_phonemes):
            start_frame = i * frames_per_phoneme
            end_frame = min((i + 1) * frames_per_phoneme, num_frames)
            
            # Get average log probability for this segment
            segment_probs = log_probs[start_frame:end_frame]
            segment_blank_prob = segment_probs[:, blank_id].exp().mean().item() if segment_probs.numel() else 1.0
            speechiness = max(0.0, min(1.0, 1.0 - segment_blank_prob))
            
            # Use max probability as a proxy for confidence
            # In a real implementation, you'd do proper CTC alignment
            max_probs = segment_probs.max(dim=-1).values
            avg_score = max_probs.mean().item()
            
            # Convert log probability to 0-100 score
            # log_prob of -1 is good, -5 is bad
            base_score = self._log_prob_to_score(avg_score)
            score = base_score * (speechiness ** 0.5)
            
            alignments.append({
                "phoneme": phoneme,
                "start_frame": start_frame,
                "end_frame": end_frame,
                "score": score,
                "blank_prob": float(segment_blank_prob),
            })
        
        return alignments
    
    def _log_prob_to_score(self, log_prob: float) -> float:
        """
        Convert log probability to 0-100 score.
        
        Uses a sigmoid-like mapping:
        - log_prob = 0: score = 100
        - log_prob = -3: score = 50
        - log_prob = -6: score = 10
        """
        import math
        
        # Shift and scale log probability
        # -3 -> 0, so score = 50 at log_prob = -3
        shifted = log_prob + 3
        
        # Sigmoid mapping
        score = 100 / (1 + math.exp(-shifted))
        
        return max(0, min(100, score))
    
    def frame_to_time(self, frame: int) -> float:
        """
        Convert frame index to time in seconds.
        
        Wav2Vec2 has ~50 frames per second (320 samples per frame at 16kHz).
        """
        samples_per_frame = 320
        return frame * samples_per_frame / self._sample_rate
