"""
v2_player unified_events - Unified Event List for LLM input.

This module builds a linear sequence of events from multiple sources:
- [VISUAL] - Scene changes and visual descriptions
- [SUB] - Subtitle events with speaker info
- [GAP] - Silent gaps between subtitles

The unified event list is used as input for LLM-based script generation.

Usage:
    from services.v2_player.unified_events import UnifiedEventBuilder
    
    builder = UnifiedEventBuilder()
    events = builder.build(bundle)
    events_text = builder.to_llm_input(events)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from storage.v2_player import (
    AnalysisBundle,
    SubtitleData,
    GapInfo,
    SceneInfo,
    VisualFeatures,
    SpeakerMap,
)

logger = logging.getLogger("echoflow.v2_player.unified_events")


@dataclass
class UnifiedEvent:
    """
    A single event in the unified event list.
    
    Events are sorted by time and can be of different types.
    """
    time: float                     # Event time (seconds)
    event_type: str                 # "visual", "sub", "gap"
    content: str                    # Event content/description
    
    # Additional metadata
    duration: Optional[float] = None
    speaker: Optional[str] = None
    scene_id: Optional[int] = None
    subtitle_index: Optional[int] = None
    raw_data: Optional[Dict[str, Any]] = None
    
    def to_llm_line(self) -> str:
        """Convert to a line for LLM input."""
        time_str = f"{self.time:.1f}s"
        
        if self.event_type == "visual":
            scene_part = f"#{self.scene_id}" if self.scene_id is not None else ""
            return f"[VISUAL{scene_part} @ {time_str}] {self.content}"
        elif self.event_type == "sub":
            speaker_prefix = f"[{self.speaker}] " if self.speaker else ""
            sub_part = f"#{self.subtitle_index}" if self.subtitle_index is not None else ""
            return f"[SUB{sub_part} @ {time_str}] {speaker_prefix}{self.content}"
        elif self.event_type == "gap":
            after_part = f"(after#{self.subtitle_index})" if self.subtitle_index is not None else ""
            duration_str = f" ({self.duration:.1f}s)" if self.duration else ""
            return f"[GAP{after_part} @ {time_str}]{duration_str} {self.content}"
        else:
            return f"[{self.event_type.upper()} @ {time_str}] {self.content}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "time": self.time,
            "event_type": self.event_type,
            "content": self.content,
            "duration": self.duration,
            "speaker": self.speaker,
            "scene_id": self.scene_id,
            "subtitle_index": self.subtitle_index,
        }


class UnifiedEventBuilder:
    """
    Builder for unified event lists.
    
    Combines visual, subtitle, and gap events into a linear sequence.
    """
    
    def __init__(
        self,
        *,
        include_visual: bool = True,
        include_gaps: bool = True,
        min_gap_duration: float = 1.0,
    ):
        """
        Initialize builder.
        
        Args:
            include_visual: Whether to include visual events
            include_gaps: Whether to include gap events
            min_gap_duration: Minimum gap duration to include
        """
        self.include_visual = include_visual
        self.include_gaps = include_gaps
        self.min_gap_duration = min_gap_duration
    
    def build(
        self,
        bundle: AnalysisBundle,
        *,
        speaker_map: Optional[SpeakerMap] = None,
    ) -> List[UnifiedEvent]:
        """
        Build unified event list from analysis bundle.
        
        Args:
            bundle: Analysis bundle
            speaker_map: Optional speaker ID to name mapping
        
        Returns:
            List of UnifiedEvent, sorted by time
        """
        events: List[UnifiedEvent] = []
        
        # Add subtitle events
        events.extend(self._build_subtitle_events(bundle.subtitles, speaker_map))
        
        # Add gap events
        if self.include_gaps and bundle.timeline_features:
            events.extend(self._build_gap_events(bundle.timeline_features.gaps))
        
        # Add visual events
        if self.include_visual and bundle.visual_features:
            events.extend(self._build_visual_events(
                bundle.scenes,
                bundle.visual_features,
            ))
        
        # Sort by time
        events.sort(key=lambda e: (e.time, self._event_priority(e.event_type)))
        
        return events
    
    def _build_subtitle_events(
        self,
        subtitles: List[SubtitleData],
        speaker_map: Optional[SpeakerMap],
    ) -> List[UnifiedEvent]:
        """Build events from subtitles."""
        events = []
        
        for sub in subtitles:
            speaker = None
            if sub.speaker_id:
                if speaker_map:
                    speaker = speaker_map.get_name(sub.speaker_id)
                else:
                    speaker = sub.speaker_id
            
            event = UnifiedEvent(
                time=sub.start_time,
                event_type="sub",
                content=sub.text,
                duration=sub.duration,
                speaker=speaker,
                subtitle_index=sub.index,
            )
            events.append(event)
        
        return events
    
    def _build_gap_events(
        self,
        gaps: List[GapInfo],
    ) -> List[UnifiedEvent]:
        """Build events from gaps."""
        events = []
        
        for gap in gaps:
            if gap.duration < self.min_gap_duration:
                continue
            
            content = f"Silent gap after subtitle #{gap.after_index}"
            
            event = UnifiedEvent(
                time=gap.start_time,
                event_type="gap",
                content=content,
                duration=gap.duration,
                subtitle_index=gap.after_index,
            )
            events.append(event)
        
        return events
    
    def _build_visual_events(
        self,
        scenes: List[SceneInfo],
        visual_features: List[VisualFeatures],
    ) -> List[UnifiedEvent]:
        """Build events from visual features."""
        events = []
        
        # Create a mapping of scene_id to visual features
        visual_map = {vf.scene_id: vf for vf in visual_features}
        
        for scene in scenes:
            vf = visual_map.get(scene.scene_id)
            
            if vf and vf.caption:
                content = vf.caption
                if vf.characters:
                    content += f" Characters: {', '.join(vf.characters)}"
            else:
                content = f"Scene {scene.scene_id} starts"
            
            event = UnifiedEvent(
                time=scene.start_time,
                event_type="visual",
                content=content,
                duration=scene.end_time - scene.start_time,
                scene_id=scene.scene_id,
            )
            events.append(event)
        
        return events
    
    def _event_priority(self, event_type: str) -> int:
        """Get priority for event type (lower = earlier at same time)."""
        priorities = {
            "visual": 0,
            "gap": 1,
            "sub": 2,
        }
        return priorities.get(event_type, 3)
    
    def to_llm_input(
        self,
        events: List[UnifiedEvent],
        *,
        max_events: Optional[int] = None,
        context_window: Optional[tuple[float, float]] = None,
    ) -> str:
        """
        Convert events to LLM input text.
        
        Args:
            events: List of events
            max_events: Maximum events to include
            context_window: Optional (start_time, end_time) filter
        
        Returns:
            Multi-line text for LLM input
        """
        filtered = events
        
        # Filter by context window
        if context_window:
            start, end = context_window
            filtered = [e for e in filtered if start <= e.time <= end]
        
        # Limit number of events
        if max_events and len(filtered) > max_events:
            filtered = filtered[:max_events]
        
        lines = [e.to_llm_line() for e in filtered]
        return "\n".join(lines)
    
    def to_sliding_windows(
        self,
        events: List[UnifiedEvent],
        *,
        window_size: float = 60.0,
        window_overlap: float = 10.0,
    ) -> List[List[UnifiedEvent]]:
        """
        Split events into sliding windows for LLM processing.
        
        Args:
            events: All events
            window_size: Window size in seconds
            window_overlap: Overlap between windows
        
        Returns:
            List of event lists, one per window
        """
        if not events:
            return []
        
        windows = []
        start_time = 0.0
        max_time = max(e.time for e in events)
        
        while start_time < max_time:
            end_time = start_time + window_size
            
            window_events = [
                e for e in events
                if start_time <= e.time < end_time
            ]
            
            if window_events:
                windows.append(window_events)
            
            start_time += window_size - window_overlap
        
        return windows
