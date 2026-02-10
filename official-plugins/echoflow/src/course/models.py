"""
Data models for courses and segments.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class SegmentStatus(str, Enum):
    """Status of a practice segment."""
    LOCKED = "locked"
    CURRENT = "current"
    PASSED = "passed"
    SKIPPED = "skipped"


class WordScore(BaseModel):
    """Score for a single word."""
    word: str
    score: int = Field(ge=0, le=100)
    phonemes: str = ""
    status: str = "good"  # perfect, good, needs_work, missed


class Segment(BaseModel):
    """A single practice segment (sentence)."""
    id: int
    start_time: float
    end_time: float
    text: str
    norm_text: Optional[str] = None
    token_count: Optional[int] = Field(default=None, ge=0)
    difficulty: Optional[float] = Field(default=None, ge=0.0)
    phonemes: str = ""  # Pre-processed phoneme sequence
    user_best_score: int = 0
    attempts: int = 0
    status: SegmentStatus = SegmentStatus.LOCKED
    word_scores: List[WordScore] = Field(default_factory=list)


class Course(BaseModel):
    """A course generated from a video/audio source."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    audio_path: str
    subtitle_path: Optional[str] = None
    video_path: Optional[str] = None
    cover_path: Optional[str] = None
    source_url: Optional[str] = None
    library_id: Optional[str] = None  # Reference to media library
    relative_path: Optional[str] = None  # Path relative to library root
    tags_json: Optional[str] = None  # JSON string of tags
    segments: List[Segment] = Field(default_factory=list)
    pass_threshold: int = 80
    current_segment_index: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    
    @property
    def total_segments(self) -> int:
        return len(self.segments)
    
    @property
    def passed_segments(self) -> int:
        return sum(1 for s in self.segments if s.status == SegmentStatus.PASSED)
    
    @property
    def progress_percent(self) -> float:
        if not self.segments:
            return 0.0
        return (self.passed_segments / self.total_segments) * 100
    
    @property
    def average_score(self) -> float:
        scores = [s.user_best_score for s in self.segments if s.user_best_score > 0]
        return sum(scores) / len(scores) if scores else 0.0
    
    def get_current_segment(self) -> Optional[Segment]:
        """Get the current segment to practice."""
        if 0 <= self.current_segment_index < len(self.segments):
            return self.segments[self.current_segment_index]
        return None
    
    def advance_to_next(self) -> bool:
        """Move to the next segment. Returns False if at end."""
        if self.current_segment_index < len(self.segments) - 1:
            self.current_segment_index += 1
            if self.segments[self.current_segment_index].status == SegmentStatus.LOCKED:
                self.segments[self.current_segment_index].status = SegmentStatus.CURRENT
            return True
        return False
    
    def go_to_previous(self) -> bool:
        """Move to the previous segment. Returns False if at start."""
        if self.current_segment_index > 0:
            self.current_segment_index -= 1
            return True
        return False


