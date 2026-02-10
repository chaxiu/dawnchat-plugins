"""
v2_player subtitle_model - Unified subtitle data model.

This module defines format-agnostic subtitle data structures that the business
layer uses. The actual parsing of different subtitle formats is handled by
the subtitle_parser module.

Supported concepts:
- SubtitleSegment: A single subtitle line with timing
- SubtitleDocument: A collection of segments with metadata
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterator, List, Optional
import json


@dataclass
class SubtitleSegment:
    """
    A single subtitle segment (format-agnostic).
    
    This is the unified model that all subtitle formats are converted to.
    The business layer only interacts with this model.
    """
    index: int                              # Sequence number (0-based)
    start_time: float                       # Start time in seconds
    end_time: float                         # End time in seconds
    text: str                               # Original text content
    speaker_id: Optional[str] = None        # Speaker ID (filled by diarization)
    
    # Extended metadata (optional)
    style: Optional[str] = None             # ASS/SSA style name
    position: Optional[Dict[str, Any]] = None  # Position info (if available)
    
    def __post_init__(self):
        # Normalize text
        self.text = self.text.strip()
        # Ensure times are valid
        self.start_time = max(0.0, float(self.start_time))
        self.end_time = max(self.start_time, float(self.end_time))
    
    @property
    def duration(self) -> float:
        """Duration of this segment in seconds."""
        return max(0.0, self.end_time - self.start_time)
    
    @property
    def word_count(self) -> int:
        """Number of words in the text."""
        return len(self.text.split())
    
    @property
    def words_per_second(self) -> float:
        """Speech rate (words per second)."""
        if self.duration <= 0:
            return 0.0
        return self.word_count / self.duration
    
    @property
    def is_empty(self) -> bool:
        """Check if this segment has no meaningful content."""
        return len(self.text.strip()) == 0
    
    def overlaps(self, other: "SubtitleSegment") -> bool:
        """Check if this segment overlaps with another."""
        return (
            self.start_time < other.end_time and
            self.end_time > other.start_time
        )
    
    def gap_to(self, next_segment: "SubtitleSegment") -> float:
        """
        Calculate gap duration to the next segment.
        
        Returns:
            Gap duration in seconds (positive if there's a gap, negative if overlap)
        """
        return next_segment.start_time - self.end_time
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = {
            "index": self.index,
            "start_time": round(self.start_time, 3),
            "end_time": round(self.end_time, 3),
            "text": self.text,
        }
        if self.speaker_id is not None:
            result["speaker_id"] = self.speaker_id
        if self.style is not None:
            result["style"] = self.style
        if self.position is not None:
            result["position"] = self.position
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SubtitleSegment":
        """Create from dictionary."""
        return cls(
            index=int(data.get("index", 0)),
            start_time=float(data.get("start_time", 0.0)),
            end_time=float(data.get("end_time", 0.0)),
            text=str(data.get("text", "")),
            speaker_id=data.get("speaker_id"),
            style=data.get("style"),
            position=data.get("position"),
        )
    
    def __repr__(self) -> str:
        return (
            f"SubtitleSegment(index={self.index}, "
            f"time={self.start_time:.2f}-{self.end_time:.2f}, "
            f"text={self.text[:30]!r}{'...' if len(self.text) > 30 else ''})"
        )


@dataclass
class SubtitleDocument:
    """
    A collection of subtitle segments with metadata.
    """
    segments: List[SubtitleSegment] = field(default_factory=list)
    
    # Source file info
    source_path: Optional[str] = None
    source_format: Optional[str] = None     # "srt", "vtt", "ass", etc.
    
    # Metadata
    title: Optional[str] = None
    language: Optional[str] = None
    
    def __post_init__(self):
        # Sort segments by start time if not already sorted
        self._ensure_sorted()
    
    def _ensure_sorted(self) -> None:
        """Ensure segments are sorted by start time."""
        self.segments.sort(key=lambda s: (s.start_time, s.index))
    
    def __len__(self) -> int:
        return len(self.segments)
    
    def __iter__(self) -> Iterator[SubtitleSegment]:
        return iter(self.segments)
    
    def __getitem__(self, index: int) -> SubtitleSegment:
        return self.segments[index]
    
    @property
    def duration(self) -> float:
        """Total duration from first segment start to last segment end."""
        if not self.segments:
            return 0.0
        return self.segments[-1].end_time - self.segments[0].start_time
    
    @property
    def total_text_length(self) -> int:
        """Total character count of all text."""
        return sum(len(s.text) for s in self.segments)
    
    @property
    def total_word_count(self) -> int:
        """Total word count of all segments."""
        return sum(s.word_count for s in self.segments)
    
    def filter_empty(self) -> "SubtitleDocument":
        """Return a new document with empty segments removed."""
        return SubtitleDocument(
            segments=[s for s in self.segments if not s.is_empty],
            source_path=self.source_path,
            source_format=self.source_format,
            title=self.title,
            language=self.language,
        )
    
    def reindex(self) -> "SubtitleDocument":
        """Return a new document with re-indexed segments (0-based)."""
        new_segments = []
        for i, seg in enumerate(self.segments):
            new_seg = SubtitleSegment(
                index=i,
                start_time=seg.start_time,
                end_time=seg.end_time,
                text=seg.text,
                speaker_id=seg.speaker_id,
                style=seg.style,
                position=seg.position,
            )
            new_segments.append(new_seg)
        return SubtitleDocument(
            segments=new_segments,
            source_path=self.source_path,
            source_format=self.source_format,
            title=self.title,
            language=self.language,
        )
    
    def get_gaps(self, min_gap: float = 0.0) -> List[Dict[str, Any]]:
        """
        Get gaps between consecutive segments.
        
        Args:
            min_gap: Minimum gap duration to include (seconds)
        
        Returns:
            List of gap info dicts
        """
        gaps = []
        for i in range(len(self.segments) - 1):
            current = self.segments[i]
            next_seg = self.segments[i + 1]
            gap_duration = current.gap_to(next_seg)
            
            if gap_duration >= min_gap:
                gaps.append({
                    "after_index": current.index,
                    "start_time": current.end_time,
                    "end_time": next_seg.start_time,
                    "duration": gap_duration,
                })
        return gaps
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "segments": [s.to_dict() for s in self.segments],
            "source_path": self.source_path,
            "source_format": self.source_format,
            "title": self.title,
            "language": self.language,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SubtitleDocument":
        """Create from dictionary."""
        return cls(
            segments=[SubtitleSegment.from_dict(s) for s in data.get("segments", [])],
            source_path=data.get("source_path"),
            source_format=data.get("source_format"),
            title=data.get("title"),
            language=data.get("language"),
        )
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)
    
    @classmethod
    def from_json(cls, json_str: str) -> "SubtitleDocument":
        """Create from JSON string."""
        return cls.from_dict(json.loads(json_str))
    
    def save(self, path: str) -> None:
        """Save to JSON file."""
        from pathlib import Path
        Path(path).write_text(self.to_json(), encoding="utf-8")
    
    @classmethod
    def load(cls, path: str) -> "SubtitleDocument":
        """Load from JSON file."""
        from pathlib import Path
        return cls.from_json(Path(path).read_text(encoding="utf-8"))

