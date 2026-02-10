"""
Pronunciation scorer - Main scoring interface.
"""

import logging
from typing import Dict, Any, List, Optional
import math
import re
from collections import Counter
from difflib import SequenceMatcher
import numpy as np

from .aligner import Wav2Vec2Aligner
from .phoneme import G2PConverter
from course.models import WordScore

logger = logging.getLogger("echoflow.scorer")


class PronunciationScorer:
    """
    Scores pronunciation using Wav2Vec2 forced alignment.
    
    Scoring dimensions:
    - Accuracy (50%): Phoneme alignment confidence
    - Completeness (30%): Percentage of words attempted
    - Fluency (20%): Based on timing and pauses
    
    Usage:
        # Get model path from Host SDK
        result = await host.scoring.list_installed()
        if result['total'] > 0:
            scorer = get_scorer()
            scorer.set_model_path(result['models'][0]['path'])
    """
    
    # Score weights
    WEIGHT_ACCURACY = 0.50
    WEIGHT_COMPLETENESS = 0.30
    WEIGHT_FLUENCY = 0.20
    
    # Thresholds for word-level feedback
    THRESHOLD_PERFECT = 85
    THRESHOLD_GOOD = 60
    THRESHOLD_NEEDS_WORK = 30

    _SILENCE_RMS_DBFS = -45.0
    _SILENCE_PEAK = 0.02
    _MIN_AUDIO_SECONDS = 0.25
    
    def __init__(self):
        self._aligner: Optional[Wav2Vec2Aligner] = None
        self._g2p: Optional[G2PConverter] = None
        self._is_loaded = False
        self._model_path: Optional[str] = None
    
    def set_model_path(self, path: str):
        """
        Set the local model path to use.
        
        Should be called before ensure_loaded() with the path
        obtained from host.scoring.list_installed().
        
        Args:
            path: Local path to the Wav2Vec2 model directory
        """
        if self._is_loaded and self._model_path != path:
            # Model path changed, need to reload
            self._is_loaded = False
            self._aligner = None
        self._model_path = path
        logger.info(f"Scoring model path set to: {path}")
    
    def ensure_loaded(self):
        """Ensure models are loaded."""
        if self._is_loaded:
            return
        
        logger.info("Loading pronunciation scorer models...")
        
        # Use local path if set, otherwise fall back to HuggingFace
        self._aligner = Wav2Vec2Aligner(model_path=self._model_path)
        self._g2p = G2PConverter()
        
        # Force model loading
        self._aligner._ensure_model()
        self._g2p._ensure_g2p()
        
        self._is_loaded = True
        logger.info("Pronunciation scorer models loaded")
    
    def score(
        self,
        audio: np.ndarray,
        target_text: str,
    ) -> Dict[str, Any]:
        """
        Score pronunciation of audio against target text.
        
        Args:
            audio: Audio samples as float32 numpy array (16kHz)
            target_text: The expected text to be spoken
            
        Returns:
            {
                "overall_score": int (0-100),
                "accuracy_score": int,
                "completeness_score": int,
                "fluency_score": int,
                "words": [WordScore, ...],
                "phoneme_alignments": [...],
            }
        """
        self.ensure_loaded()
        aligner = self._aligner
        g2p = self._g2p
        if aligner is None or g2p is None:
            return self._empty_result_for_target(target_text)
        
        try:
            audio = self._prepare_audio(audio)
            audio_stats = self._get_audio_stats(audio)
            logger.info(
                "score step=audio_stats "
                f"duration_s={audio_stats['duration_s']:.3f} "
                f"samples={audio_stats['num_samples']} "
                f"rms_dbfs={audio_stats['rms_dbfs']:.1f} "
                f"peak={audio_stats['peak']:.4f}"
            )

            if not self._has_speech(audio_stats):
                logger.info("score step=speech_check result=no_speech")
                return self._empty_result_for_target(target_text)

            # Step 1: Convert target text to phonemes
            logger.info("score step=g2p start")
            word_phonemes = g2p.text_to_word_phonemes(target_text)
            all_phonemes = []
            word_phoneme_ranges = []
            
            for word, phonemes in word_phonemes:
                start_idx = len(all_phonemes)
                all_phonemes.extend(phonemes)
                end_idx = len(all_phonemes)
                word_phoneme_ranges.append((word, start_idx, end_idx))
            
            if not all_phonemes:
                logger.warning("No phonemes extracted from target text")
                return self._empty_result_for_target(target_text)

            logger.info(
                "score step=g2p done "
                f"words={len(word_phoneme_ranges)} phonemes={len(all_phonemes)}"
            )

            logger.info("score step=decode start")
            transcript = aligner.decode(audio)
            transcript_norm = self._normalize_text(transcript)
            logger.info(
                "score step=decode done "
                f"transcript_len={len(transcript.strip())} norm_len={len(transcript_norm)}"
            )
            
            # Step 2: Perform forced alignment
            logger.info("score step=forced_align start")
            alignments = aligner.forced_align(audio, all_phonemes)
            diagnostics = aligner.get_last_diagnostics()
            if diagnostics is not None:
                logger.info(f"score step=forced_align diagnostics={diagnostics}")
            logger.info("score step=forced_align done")
            
            # Step 3: Calculate word-level scores
            logger.info("score step=word_scores start")
            word_scores = []
            for word, start_idx, end_idx in word_phoneme_ranges:
                word_alignments = alignments[start_idx:end_idx]
                
                if word_alignments:
                    avg_score = sum(a["score"] for a in word_alignments) / len(word_alignments)
                else:
                    avg_score = 0
                
                status = self._score_to_status(avg_score)
                
                word_scores.append(WordScore(
                    word=word,
                    score=int(avg_score),
                    phonemes=" ".join(all_phonemes[start_idx:end_idx]),
                    status=status,
                ))
            logger.info("score step=word_scores done")
            
            # Step 4: Calculate dimension scores
            speechiness = 1.0
            if diagnostics is not None:
                avg_blank_prob = float(diagnostics.get("avg_blank_prob", 0.0))
                speechiness = max(0.0, min(1.0, 1.0 - avg_blank_prob))

            alignment_accuracy = self._calculate_accuracy(word_scores)
            content_similarity = self._calculate_content_similarity(target_text, transcript)
            accuracy_score = int(round(alignment_accuracy * 0.7 + content_similarity * 0.3))
            completeness_score = self._calculate_completeness(target_text, transcript)
            fluency_score = self._calculate_fluency(audio, transcript, speechiness=speechiness)

            logger.info(
                "score step=dimension_scores "
                f"alignment_accuracy={alignment_accuracy} content_similarity={content_similarity} "
                f"accuracy={accuracy_score} completeness={completeness_score} "
                f"fluency={fluency_score} speechiness={speechiness:.3f}"
            )
            
            # Step 5: Calculate overall score
            overall_score = int(
                accuracy_score * self.WEIGHT_ACCURACY +
                completeness_score * self.WEIGHT_COMPLETENESS +
                fluency_score * self.WEIGHT_FLUENCY
            )
            logger.info(f"score step=overall_score overall={overall_score}")
            
            return {
                "overall_score": overall_score,
                "accuracy_score": accuracy_score,
                "completeness_score": completeness_score,
                "fluency_score": fluency_score,
                "words": word_scores,
                "phoneme_alignments": alignments,
            }
            
        except Exception as e:
            logger.error(f"Scoring failed: {e}", exc_info=True)
            return self._empty_result_for_target(target_text)

    def _prepare_audio(self, audio: np.ndarray) -> np.ndarray:
        if audio is None:
            return np.array([], dtype=np.float32)
        audio = np.asarray(audio, dtype=np.float32).reshape(-1)
        audio = np.nan_to_num(audio, nan=0.0, posinf=0.0, neginf=0.0)
        audio = self._trim_silence(audio)
        return audio

    def _trim_silence(self, audio: np.ndarray) -> np.ndarray:
        if audio is None or audio.shape[0] == 0:
            return np.array([], dtype=np.float32)
        peak = float(np.max(np.abs(audio))) if audio.size else 0.0
        if peak <= 0.0:
            return audio
        threshold = max(0.02, peak * 0.03)
        mask = np.abs(audio) >= threshold
        if not np.any(mask):
            return audio
        first = int(np.argmax(mask))
        last = int(audio.shape[0] - 1 - np.argmax(mask[::-1]))
        pad = int(0.2 * 16000)
        start = max(0, first - pad)
        end = min(audio.shape[0], last + pad + 1)
        if end - start <= 0:
            return audio
        return audio[start:end]

    def _get_audio_stats(self, audio: np.ndarray) -> Dict[str, float]:
        num_samples = int(audio.shape[0]) if audio is not None else 0
        if num_samples <= 0:
            return {
                "num_samples": 0,
                "duration_s": 0.0,
                "rms": 0.0,
                "rms_dbfs": float("-inf"),
                "peak": 0.0,
            }
        duration_s = num_samples / 16000.0
        peak = float(np.max(np.abs(audio)))
        rms = float(np.sqrt(np.mean(np.square(audio))))
        rms_dbfs = float(20.0 * math.log10(rms + 1e-12))
        return {
            "num_samples": num_samples,
            "duration_s": duration_s,
            "rms": rms,
            "rms_dbfs": rms_dbfs,
            "peak": peak,
        }

    def _has_speech(self, audio_stats: Dict[str, float]) -> bool:
        duration_s = float(audio_stats.get("duration_s", 0.0))
        peak = float(audio_stats.get("peak", 0.0))
        rms_dbfs = float(audio_stats.get("rms_dbfs", float("-inf")))
        if duration_s < self._MIN_AUDIO_SECONDS:
            return False
        if rms_dbfs < self._SILENCE_RMS_DBFS and peak < self._SILENCE_PEAK:
            return False
        return True

    def _normalize_text(self, text: str) -> str:
        text = (text or "").lower()
        text = re.sub(r"[^a-z\s']", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _extract_words(self, text: str) -> List[str]:
        normalized = self._normalize_text(text)
        return [w for w in normalized.split(" ") if w]

    def _calculate_content_similarity(self, target_text: str, transcript: str) -> int:
        a = self._normalize_text(target_text)
        b = self._normalize_text(transcript)
        if not a or not b:
            return 0
        return int(round(SequenceMatcher(None, a, b).ratio() * 100))
    
    def _calculate_accuracy(self, word_scores: List[WordScore]) -> int:
        """Calculate accuracy score from word scores."""
        if not word_scores:
            return 0
        
        total = sum(ws.score for ws in word_scores)
        return int(total / len(word_scores))
    
    def _calculate_completeness(self, target_text: str, transcript: str) -> int:
        target_words = self._extract_words(target_text)
        spoken_words = self._extract_words(transcript)
        if not target_words or not spoken_words:
            return 0
        target_counter = Counter(target_words)
        spoken_counter = Counter(spoken_words)
        matched = sum((target_counter & spoken_counter).values())
        return int(round((matched / len(target_words)) * 100))
    
    def _calculate_fluency(self, audio: np.ndarray, transcript: str, speechiness: float = 1.0) -> int:
        if audio is None or audio.shape[0] == 0:
            return 0
        duration = audio.shape[0] / 16000.0
        if duration <= 0:
            return 0
        spoken_words = self._extract_words(transcript)
        if not spoken_words:
            return 0

        words_per_second = len(spoken_words) / duration
        if words_per_second < 0.5:
            base = (words_per_second / 0.5) * 50.0
        elif words_per_second <= 3.0:
            base = 100.0
        else:
            base = max(40.0, 100.0 - (words_per_second - 3.0) * 15.0)

        base *= max(0.0, min(1.0, speechiness)) ** 0.5
        return int(round(max(0.0, min(100.0, base))))
    
    def _score_to_status(self, score: float) -> str:
        """Convert numeric score to status string."""
        if score >= self.THRESHOLD_PERFECT:
            return "perfect"
        elif score >= self.THRESHOLD_GOOD:
            return "good"
        elif score >= self.THRESHOLD_NEEDS_WORK:
            return "needs_work"
        else:
            return "missed"
    
    def _empty_result(self) -> Dict[str, Any]:
        return {
            "overall_score": 0,
            "accuracy_score": 0,
            "completeness_score": 0,
            "fluency_score": 0,
            "words": [],
            "phoneme_alignments": [],
        }

    def _empty_result_for_target(self, target_text: str) -> Dict[str, Any]:
        words = []
        for w in (target_text or "").split():
            if w.strip():
                words.append(WordScore(word=w, score=0, phonemes="", status="missed"))
        return {
            "overall_score": 0,
            "accuracy_score": 0,
            "completeness_score": 0,
            "fluency_score": 0,
            "words": words,
            "phoneme_alignments": [],
        }


# Global scorer instance (lazy loaded)
_scorer: Optional[PronunciationScorer] = None


def get_scorer() -> PronunciationScorer:
    """Get the global pronunciation scorer instance."""
    global _scorer
    if _scorer is None:
        _scorer = PronunciationScorer()
    return _scorer
