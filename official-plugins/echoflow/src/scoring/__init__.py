"""
Pronunciation scoring module using Wav2Vec2 forced alignment.
"""

from .scorer import PronunciationScorer
from .phoneme import G2PConverter

__all__ = ["PronunciationScorer", "G2PConverter"]




