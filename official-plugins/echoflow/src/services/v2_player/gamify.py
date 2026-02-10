"""
v2_player gamify - Gamified shadowing challenge service.

This module provides the gamified dubbing/shadowing challenge for Smart Player v2.
After watching, users can practice selected sentences in a fun, interactive way.

Features:
1. Star sentence selection (based on length, difficulty, key phrases)
2. Collection during playback (lightweight prompts)
3. End-of-video summary with collected sentences
4. Dubbing challenge using existing scoring system

Usage:
    from services.v2_player.gamify import GamifyService
    
    service = GamifyService(paths, bundle)
    stars = service.select_star_sentences()
    challenge = service.create_challenge(stars)
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, cast

from storage.v2_player import AnalysisBundle, SubtitleData, V2PlayerPaths

logger = logging.getLogger("echoflow.v2_player.gamify")


@dataclass
class StarSentence:
    """A sentence selected for practice."""
    index: int                      # Subtitle index
    text: str                       # Sentence text
    start_time: float              # Start time
    end_time: float                # End time
    difficulty: str                # "easy", "medium", "hard"
    reason: str                    # Why this was selected
    collected: bool = False        # Whether user collected it
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "text": self.text,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "difficulty": self.difficulty,
            "reason": self.reason,
            "collected": self.collected,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StarSentence":
        return cls(
            index=int(data.get("index", 0)),
            text=str(data.get("text", "")),
            start_time=float(data.get("start_time", 0)),
            end_time=float(data.get("end_time", 0)),
            difficulty=str(data.get("difficulty", "medium")),
            reason=str(data.get("reason", "")),
            collected=bool(data.get("collected", False)),
        )


@dataclass
class DubbingChallenge:
    """A dubbing challenge session."""
    course_id: str
    sentences: List[StarSentence]
    current_index: int = 0
    scores: List[Optional[float]] = field(default_factory=list)
    completed: bool = False
    
    def __post_init__(self):
        if not self.scores:
            self.scores = cast(List[Optional[float]], [None for _ in self.sentences])
    
    @property
    def total_score(self) -> float:
        valid_scores = [s for s in self.scores if s is not None]
        if not valid_scores:
            return 0.0
        return sum(valid_scores) / len(valid_scores)
    
    @property
    def progress(self) -> float:
        if not self.sentences:
            return 1.0
        completed = sum(1 for s in self.scores if s is not None)
        return completed / len(self.sentences)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "course_id": self.course_id,
            "sentences": [s.to_dict() for s in self.sentences],
            "current_index": self.current_index,
            "scores": self.scores,
            "completed": self.completed,
        }


class GamifyService:
    """
    Gamified shadowing challenge service.
    
    Selects interesting sentences and creates practice challenges.
    """
    
    # Selection criteria
    MIN_WORD_COUNT = 4
    MAX_WORD_COUNT = 20
    TARGET_SENTENCE_COUNT = 5
    
    # Difficulty thresholds (words per second)
    EASY_THRESHOLD = 2.0
    HARD_THRESHOLD = 3.5
    
    def __init__(
        self,
        paths: V2PlayerPaths,
        bundle: Optional[AnalysisBundle] = None,
    ):
        """
        Initialize gamify service.
        
        Args:
            paths: V2PlayerPaths instance
            bundle: Analysis bundle with subtitles
        """
        self.paths = paths
        self.bundle = bundle
    
    def select_star_sentences(
        self,
        count: int = TARGET_SENTENCE_COUNT,
    ) -> List[StarSentence]:
        """
        Select star sentences for practice.
        
        Criteria:
        - Appropriate length (not too short or long)
        - Good variety of difficulty
        - Interesting content (questions, exclamations, key phrases)
        
        Args:
            count: Number of sentences to select
        
        Returns:
            List of StarSentence
        """
        if not self.bundle or not self.bundle.subtitles:
            return []
        
        candidates = []
        
        for sub in self.bundle.subtitles:
            # Filter by length
            word_count = len(sub.text.split())
            if word_count < self.MIN_WORD_COUNT or word_count > self.MAX_WORD_COUNT:
                continue
            
            # Calculate difficulty
            wps = sub.words_per_second
            if wps < self.EASY_THRESHOLD:
                difficulty = "easy"
            elif wps > self.HARD_THRESHOLD:
                difficulty = "hard"
            else:
                difficulty = "medium"
            
            # Determine reason for selection
            reason = self._get_selection_reason(sub)
            
            star = StarSentence(
                index=sub.index,
                text=sub.text,
                start_time=sub.start_time,
                end_time=sub.end_time,
                difficulty=difficulty,
                reason=reason,
            )
            
            candidates.append((star, self._score_candidate(sub, reason)))
        
        # Sort by score and select top candidates
        candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Ensure variety in difficulty
        selected = self._select_varied(candidates, count)
        
        logger.info(f"Selected {len(selected)} star sentences")
        
        return selected
    
    def _get_selection_reason(self, sub: SubtitleData) -> str:
        """Determine why a sentence is interesting."""
        text = sub.text.lower()
        
        if "?" in sub.text:
            return "question"
        elif "!" in sub.text:
            return "exclamation"
        elif any(phrase in text for phrase in ["i think", "i believe", "in my opinion"]):
            return "opinion"
        elif any(phrase in text for phrase in ["because", "so that", "in order to"]):
            return "complex_structure"
        elif any(phrase in text for phrase in ["if ", "when ", "while "]):
            return "conditional"
        else:
            return "general"
    
    def _score_candidate(self, sub: SubtitleData, reason: str) -> float:
        """Score a candidate for selection."""
        score = 0.0
        
        # Prefer medium length
        word_count = len(sub.text.split())
        if 6 <= word_count <= 12:
            score += 2.0
        elif 4 <= word_count <= 15:
            score += 1.0
        
        # Prefer interesting reasons
        reason_scores = {
            "question": 2.0,
            "complex_structure": 1.5,
            "conditional": 1.5,
            "opinion": 1.0,
            "exclamation": 0.5,
            "general": 0.0,
        }
        score += reason_scores.get(reason, 0)
        
        # Prefer medium difficulty
        wps = sub.words_per_second
        if 2.0 <= wps <= 3.0:
            score += 1.0
        
        return score
    
    def _select_varied(
        self,
        candidates: List[tuple],
        count: int,
    ) -> List[StarSentence]:
        """Select varied candidates by difficulty."""
        if not candidates:
            return []
        
        # Group by difficulty
        easy = [c for c in candidates if c[0].difficulty == "easy"]
        medium = [c for c in candidates if c[0].difficulty == "medium"]
        hard = [c for c in candidates if c[0].difficulty == "hard"]
        
        selected = []
        
        # Select in balanced ratio: 1 easy, 3 medium, 1 hard
        targets = [
            (easy, 1),
            (medium, 3),
            (hard, 1),
        ]
        
        for group, target in targets:
            for i, (star, _) in enumerate(group):
                if len(selected) >= count:
                    break
                if i < target:
                    selected.append(star)
        
        # Fill remaining from any group
        all_remaining = [c[0] for c in candidates if c[0] not in selected]
        for star in all_remaining:
            if len(selected) >= count:
                break
            selected.append(star)
        
        # Sort by time
        selected.sort(key=lambda s: s.start_time)
        
        return selected
    
    def create_challenge(
        self,
        sentences: List[StarSentence],
    ) -> DubbingChallenge:
        """
        Create a dubbing challenge.
        
        Args:
            sentences: Sentences to practice
        
        Returns:
            DubbingChallenge
        """
        return DubbingChallenge(
            course_id=self.bundle.course_id if self.bundle else "",
            sentences=sentences,
        )
    
    def save_stars(self, stars: List[StarSentence]) -> None:
        """Save star sentences to disk."""
        self.paths.ensure_dirs()
        stars_file = self.paths.root / "star_sentences.json"
        data = {
            "course_id": self.bundle.course_id if self.bundle else "",
            "sentences": [s.to_dict() for s in stars],
        }
        stars_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    
    def load_stars(self) -> List[StarSentence]:
        """Load star sentences from disk."""
        stars_file = self.paths.root / "star_sentences.json"
        if not stars_file.exists():
            return []
        
        try:
            data = json.loads(stars_file.read_text(encoding="utf-8"))
            return [StarSentence.from_dict(s) for s in data.get("sentences", [])]
        except Exception:
            return []
    
    def get_collected_stars(self) -> List[StarSentence]:
        """Get only collected star sentences."""
        stars = self.load_stars()
        return [s for s in stars if s.collected]
