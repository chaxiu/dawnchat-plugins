"""
Grapheme-to-Phoneme conversion using g2p-en.
"""

import logging
from typing import Any, List, Tuple

logger = logging.getLogger("echoflow.phoneme")


class G2PConverter:
    """
    Converts English text to phoneme sequences using g2p-en.
    
    This is used to:
    1. Pre-process target text for alignment
    2. Map phonemes back to words for feedback
    """
    
    # ARPAbet to IPA mapping (optional, for display)
    ARPABET_TO_IPA = {
        "AA": "ɑ", "AE": "æ", "AH": "ʌ", "AO": "ɔ",
        "AW": "aʊ", "AY": "aɪ", "B": "b", "CH": "tʃ",
        "D": "d", "DH": "ð", "EH": "ɛ", "ER": "ɝ",
        "EY": "eɪ", "F": "f", "G": "ɡ", "HH": "h",
        "IH": "ɪ", "IY": "i", "JH": "dʒ", "K": "k",
        "L": "l", "M": "m", "N": "n", "NG": "ŋ",
        "OW": "oʊ", "OY": "ɔɪ", "P": "p", "R": "ɹ",
        "S": "s", "SH": "ʃ", "T": "t", "TH": "θ",
        "UH": "ʊ", "UW": "u", "V": "v", "W": "w",
        "Y": "j", "Z": "z", "ZH": "ʒ",
    }
    
    def __init__(self):
        self._g2p: Any = None
    
    def _ensure_g2p(self):
        """Lazy load g2p-en."""
        if self._g2p is not None:
            return
        
        try:
            # Ensure NLTK data is available
            import nltk
            import os
            
            # Check for NLTK_DATA environment variable (passed by Host)
            nltk_data_env = os.environ.get("NLTK_DATA")
            if nltk_data_env:
                logger.info(f"Using NLTK_DATA from environment: {nltk_data_env}")
                if nltk_data_env in nltk.data.path:
                    nltk.data.path.remove(nltk_data_env)
                nltk.data.path.insert(0, nltk_data_env)
            
            parts = []
            for p in nltk.__version__.split("."):
                try:
                    parts.append(int(p))
                except ValueError:
                    break
            nltk_version = tuple(parts[:2])

            required_resources = [('corpora/cmudict', 'cmudict')]
            if nltk_version >= (3, 9):
                required_resources.append(('taggers/averaged_perceptron_tagger_eng', 'averaged_perceptron_tagger_eng'))
            else:
                required_resources.append(('taggers/averaged_perceptron_tagger', 'averaged_perceptron_tagger'))
            
            for resource_path, resource_name in required_resources:
                try:
                    nltk.data.find(resource_path)
                except LookupError:
                    logger.info(f"Downloading missing NLTK resource: {resource_name}")
                    # If NLTK_DATA is set, try to download there
                    download_dir = nltk_data_env if nltk_data_env else None
                    nltk.download(resource_name, download_dir=download_dir, quiet=True)

            from g2p_en import G2p
            self._g2p = G2p()
            logger.info("g2p-en loaded")
        except Exception as e:
            logger.error(f"Failed to load g2p-en: {e}")
            raise
    
    def text_to_phonemes(self, text: str) -> List[str]:
        """
        Convert text to phoneme sequence.
        
        Args:
            text: English text
            
        Returns:
            List of ARPAbet phonemes (e.g., ["DH", "AH0", "K", "W", "IH1", "K"])
        """
        self._ensure_g2p()
        logger.debug(f"text_to_phonemes input_len={len(text)}")
        g2p = self._g2p
        if g2p is None:
            raise RuntimeError("G2P model not initialized")
        phonemes = g2p(text)
        
        # Filter out spaces and punctuation
        filtered = []
        for p in phonemes:
            # Remove stress markers for matching (keep base phoneme)
            p_clean = p.rstrip("0123456789")
            if p_clean and p_clean.isalpha():
                filtered.append(p)
        logger.debug(f"text_to_phonemes raw={len(phonemes)} filtered={len(filtered)}")
        return filtered
    
    def text_to_word_phonemes(self, text: str) -> List[Tuple[str, List[str]]]:
        """
        Convert text to word-level phoneme mapping.
        
        Args:
            text: English text
            
        Returns:
            List of (word, phonemes) tuples
        """
        self._ensure_g2p()
        words = text.split()
        logger.debug(f"text_to_word_phonemes words={len(words)} input_len={len(text)}")
        result = []
        
        for word in words:
            # Clean word of punctuation for phoneme lookup
            clean_word = ''.join(c for c in word if c.isalpha())
            if clean_word:
                g2p = self._g2p
                if g2p is None:
                    raise RuntimeError("G2P model not initialized")
                phonemes = g2p(clean_word)
                # Filter and clean
                filtered = [p for p in phonemes if p.rstrip("0123456789").isalpha()]
                result.append((word, filtered))
        total_phonemes = sum(len(p) for _, p in result)
        logger.debug(f"text_to_word_phonemes mapped_words={len(result)} total_phonemes={total_phonemes}")
        return result
    
    def phoneme_to_ipa(self, phoneme: str) -> str:
        """
        Convert ARPAbet phoneme to IPA.
        
        Args:
            phoneme: ARPAbet phoneme (e.g., "AH0")
            
        Returns:
            IPA character (e.g., "ʌ")
        """
        # Remove stress marker
        base = phoneme.rstrip("0123456789")
        return self.ARPABET_TO_IPA.get(base, phoneme)
    
    def get_phoneme_string(self, text: str) -> str:
        """
        Get space-separated phoneme string for display.
        
        Args:
            text: English text
            
        Returns:
            Space-separated phoneme string
        """
        phonemes = self.text_to_phonemes(text)
        return " ".join(phonemes)


