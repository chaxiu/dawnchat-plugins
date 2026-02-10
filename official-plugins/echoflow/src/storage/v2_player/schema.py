"""
v2_player schema - Data models for Smart Player v2.

Core data structures:
- SmartScript: Time-based script entries for commentary playback
- AnalysisBundle: Aggregated analysis results (subtitles, gaps, scenes, visual features)
- WidgetPayload: Structured widget content for overlay display
- ChapterInfo: Chapter/section information for navigation
- NarrationDirectives: User-selected narration directions
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import json


# ============================================================================
# Widget Payload - Structured content for overlay widgets
# ============================================================================

@dataclass
class WidgetPayload:
    """
    Structured content for overlay widgets.
    
    Supports different widget types:
    - explain_card: Educational explanation card
    - qa_card: Question and answer card
    - graph: Concept relationship graph (future)
    - mindmap: Mind map structure (future)
    - steps: Step-by-step guide (future)
    """
    widget_type: str                    # "explain_card" | "qa_card" | "graph" | ...
    title: str = ""                     # Widget title / TL;DR
    body: Dict[str, Any] = field(default_factory=dict)  # Structured content
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "widget_type": self.widget_type,
            "title": self.title,
            "body": self.body,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WidgetPayload":
        return cls(
            widget_type=str(data.get("widget_type", "explain_card")),
            title=str(data.get("title", "")),
            body=dict(data.get("body", {})),
        )


# ============================================================================
# Chapter Info - Chapter/section for navigation
# ============================================================================

@dataclass
class ChapterInfo:
    """
    Chapter/section information for video navigation.
    
    Used by ChapterStrip component to display and navigate chapters.
    """
    chapter_id: int                     # Unique chapter ID
    title: str                          # Chapter title
    start_time: float                   # Start time (seconds)
    end_time: float                     # End time (seconds)
    level: int = 0                      # Hierarchy level (0=main, 1=sub)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "chapter_id": self.chapter_id,
            "title": self.title,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "level": self.level,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ChapterInfo":
        return cls(
            chapter_id=int(data.get("chapter_id", 0)),
            title=str(data.get("title", "")),
            start_time=float(data.get("start_time", 0.0)),
            end_time=float(data.get("end_time", 0.0)),
            level=int(data.get("level", 0)),
        )
    
    @property
    def duration(self) -> float:
        return max(0.0, self.end_time - self.start_time)


# ============================================================================
# Narration Directives - User-selected narration directions
# ============================================================================

# Available direction types for MVP
DIRECTION_TYPES = {
    "english_vocab": "英语知识点（词汇、语法、发音）",
    "plot_summary": "剧情解说（情节梳理、转折点）",
    "knowledge_point": "专业知识点（学科概念、推导）",
    "culture_bg": "文化背景/梗（俚语、典故）",
    "summary_recap": "总结回顾（段落小结、要点提炼）",
}

# Course type classification
COURSE_TYPES = {
    "language": "语言学习",
    "movie": "影视综艺",
    "tutorial": "课程/科普",
    "general": "通用",
}


@dataclass
class NarrationDirectives:
    """
    User-selected narration directions and constraints.
    
    Controls what types of commentary to generate.
    """
    directions: List[str] = field(default_factory=list)  # Selected direction types
    focus_level: str = "medium"         # "high" | "medium" | "low"
    course_type: str = "general"        # "language" | "movie" | "tutorial" | "general"
    
    # User profile context
    audience: str = "adult"             # "adult" | "child"
    english_level: str = "intermediate" # CEFR level or custom
    narration_lang: str = "zh"          # Narration language
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "directions": self.directions,
            "focus_level": self.focus_level,
            "course_type": self.course_type,
            "audience": self.audience,
            "english_level": self.english_level,
            "narration_lang": self.narration_lang,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "NarrationDirectives":
        return cls(
            directions=list(data.get("directions", [])),
            focus_level=str(data.get("focus_level", "medium")),
            course_type=str(data.get("course_type", "general")),
            audience=str(data.get("audience", "adult")),
            english_level=str(data.get("english_level", "intermediate")),
            narration_lang=str(data.get("narration_lang", "zh")),
        )
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)
    
    @classmethod
    def from_json(cls, json_str: str) -> "NarrationDirectives":
        return cls.from_dict(json.loads(json_str))


# ============================================================================
# SmartScript Entry - Single commentary action
# ============================================================================

@dataclass
class SmartScriptEntry:
    """
    A single entry in the SmartScript timeline.
    
    Represents a commentary action at a specific time point.
    """
    time_in: float                      # Trigger time point (seconds)
    action_type: str                    # pre_teach_pause / gap_filling / ignore
    script: str                         # Commentary text (Chinese or English)
    ducking: bool = False               # Whether to duck original audio
    estimated_duration: float = 0.0     # Estimated TTS duration (seconds)
    ref: Dict[str, Any] = field(default_factory=dict)  # Reference info (subtitle range, density, gap info)
    tts_path: Optional[str] = None      # Path to pre-generated TTS audio
    
    # Unique identifier for caching
    entry_id: Optional[str] = None
    
    # Structured widget content (optional, for overlay display)
    widget: Optional[WidgetPayload] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "time_in": self.time_in,
            "action_type": self.action_type,
            "script": self.script,
            "ducking": self.ducking,
            "estimated_duration": self.estimated_duration,
            "ref": self.ref,
            "tts_path": self.tts_path,
            "entry_id": self.entry_id,
            "widget": self.widget.to_dict() if self.widget else None,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SmartScriptEntry":
        widget_data = data.get("widget")
        return cls(
            time_in=float(data.get("time_in", 0.0)),
            action_type=str(data.get("action_type", "ignore")),
            script=str(data.get("script", "")),
            ducking=bool(data.get("ducking", False)),
            estimated_duration=float(data.get("estimated_duration", 0.0)),
            ref=dict(data.get("ref", {})),
            tts_path=data.get("tts_path"),
            entry_id=data.get("entry_id"),
            widget=WidgetPayload.from_dict(widget_data) if widget_data else None,
        )


@dataclass
class SmartScript:
    """
    Complete SmartScript for a course.
    
    Contains metadata and ordered list of script entries.
    """
    version: str = "1.0"
    course_id: str = ""
    script_version: str = ""            # For cache invalidation
    profile_hash: str = ""              # User profile hash
    input_hash: str = ""                # Input data hash for caching
    entries: List[SmartScriptEntry] = field(default_factory=list)
    
    # Chapter information for navigation
    chapters: List[ChapterInfo] = field(default_factory=list)
    
    # Narration directives used for generation
    directives: Optional[NarrationDirectives] = None
    
    # Generation metadata
    generated_at: Optional[str] = None
    generator: str = "rule"             # "rule" or "llm"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "course_id": self.course_id,
            "script_version": self.script_version,
            "profile_hash": self.profile_hash,
            "input_hash": self.input_hash,
            "entries": [e.to_dict() for e in self.entries],
            "chapters": [c.to_dict() for c in self.chapters],
            "directives": self.directives.to_dict() if self.directives else None,
            "generated_at": self.generated_at,
            "generator": self.generator,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SmartScript":
        entries = [SmartScriptEntry.from_dict(e) for e in data.get("entries", [])]
        chapters = [ChapterInfo.from_dict(c) for c in data.get("chapters", [])]
        directives_data = data.get("directives")
        return cls(
            version=str(data.get("version", "1.0")),
            course_id=str(data.get("course_id", "")),
            script_version=str(data.get("script_version", "")),
            profile_hash=str(data.get("profile_hash", "")),
            input_hash=str(data.get("input_hash", "")),
            entries=entries,
            chapters=chapters,
            directives=NarrationDirectives.from_dict(directives_data) if directives_data else None,
            generated_at=data.get("generated_at"),
            generator=str(data.get("generator", "rule")),
        )
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)
    
    @classmethod
    def from_json(cls, json_str: str) -> "SmartScript":
        return cls.from_dict(json.loads(json_str))
    
    def get_current_chapter(self, time: float) -> Optional[ChapterInfo]:
        """Get the chapter containing the given time point."""
        for chapter in self.chapters:
            if chapter.start_time <= time < chapter.end_time:
                return chapter
        return None


# ============================================================================
# Analysis Bundle - Aggregated analysis results
# ============================================================================

@dataclass
class SubtitleData:
    """
    Unified subtitle segment (format-agnostic).
    """
    index: int                          # Sequence number
    start_time: float                   # Start time (seconds)
    end_time: float                     # End time (seconds)
    text: str                           # Original text
    speaker_id: Optional[str] = None    # Speaker ID (filled by diarization)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "text": self.text,
            "speaker_id": self.speaker_id,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SubtitleData":
        return cls(
            index=int(data.get("index", 0)),
            start_time=float(data.get("start_time", 0.0)),
            end_time=float(data.get("end_time", 0.0)),
            text=str(data.get("text", "")),
            speaker_id=data.get("speaker_id"),
        )
    
    @property
    def duration(self) -> float:
        return max(0.0, self.end_time - self.start_time)
    
    @property
    def word_count(self) -> int:
        return len(self.text.split())
    
    @property
    def words_per_second(self) -> float:
        if self.duration <= 0:
            return 0.0
        return self.word_count / self.duration


@dataclass
class GapInfo:
    """
    Gap between consecutive subtitles.
    """
    after_index: int                    # Index of the preceding subtitle
    start_time: float                   # Gap start time
    end_time: float                     # Gap end time
    duration: float                     # Gap duration (seconds)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "after_index": self.after_index,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GapInfo":
        return cls(
            after_index=int(data.get("after_index", 0)),
            start_time=float(data.get("start_time", 0.0)),
            end_time=float(data.get("end_time", 0.0)),
            duration=float(data.get("duration", 0.0)),
        )


@dataclass
class DensityInfo:
    """
    Density information for a subtitle segment.
    """
    index: int                          # Subtitle index
    words_per_second: float             # Speech rate
    is_high_density: bool               # Whether this is high density (> threshold)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "words_per_second": self.words_per_second,
            "is_high_density": self.is_high_density,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DensityInfo":
        return cls(
            index=int(data.get("index", 0)),
            words_per_second=float(data.get("words_per_second", 0.0)),
            is_high_density=bool(data.get("is_high_density", False)),
        )


@dataclass
class TimelineFeatures:
    """
    Aggregated timeline features (gaps, density).
    """
    gaps: List[GapInfo] = field(default_factory=list)
    densities: List[DensityInfo] = field(default_factory=list)
    
    # Thresholds used for analysis
    gap_threshold: float = 1.5          # Minimum gap duration to consider (seconds)
    density_threshold: float = 3.0      # Words per second threshold for high density
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "gaps": [g.to_dict() for g in self.gaps],
            "densities": [d.to_dict() for d in self.densities],
            "gap_threshold": self.gap_threshold,
            "density_threshold": self.density_threshold,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TimelineFeatures":
        return cls(
            gaps=[GapInfo.from_dict(g) for g in data.get("gaps", [])],
            densities=[DensityInfo.from_dict(d) for d in data.get("densities", [])],
            gap_threshold=float(data.get("gap_threshold", 1.5)),
            density_threshold=float(data.get("density_threshold", 3.0)),
        )


@dataclass
class SceneInfo:
    """
    Scene detection result.
    """
    scene_id: int                       # Scene number
    start_time: float                   # Scene start time
    end_time: float                     # Scene end time
    keyframe_paths: List[str] = field(default_factory=list)  # Paths to keyframe images
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "keyframe_paths": self.keyframe_paths,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SceneInfo":
        return cls(
            scene_id=int(data.get("scene_id", 0)),
            start_time=float(data.get("start_time", 0.0)),
            end_time=float(data.get("end_time", 0.0)),
            keyframe_paths=list(data.get("keyframe_paths", [])),
        )


@dataclass
class DiarizationSegment:
    """
    Speaker diarization result.
    """
    speaker_id: str                     # Speaker ID (e.g., "SPEAKER_00")
    start_time: float                   # Segment start time
    end_time: float                     # Segment end time
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "speaker_id": self.speaker_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DiarizationSegment":
        return cls(
            speaker_id=str(data.get("speaker_id", "")),
            start_time=float(data.get("start_time", 0.0)),
            end_time=float(data.get("end_time", 0.0)),
        )


@dataclass
class VisualFeatures:
    """
    Visual features from Vision LLM.
    """
    scene_id: int                       # Associated scene
    caption: str = ""                   # Scene description
    characters: List[str] = field(default_factory=list)  # Detected characters
    tags: List[str] = field(default_factory=list)        # Scene tags
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "caption": self.caption,
            "characters": self.characters,
            "tags": self.tags,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "VisualFeatures":
        return cls(
            scene_id=int(data.get("scene_id", 0)),
            caption=str(data.get("caption", "")),
            characters=list(data.get("characters", [])),
            tags=list(data.get("tags", [])),
        )


# ============================================================================
# Character Candidates - Extracted character names from content
# ============================================================================

@dataclass
class CharacterCandidates:
    """
    Character candidates extracted from title and subtitles.
    
    Used as closed-set for Vision recognition to avoid generic descriptions
    like "a pink pig in red dress" instead of "Peppa".
    """
    characters: List[str] = field(default_factory=list)  # ["Peppa", "George", "Mummy Pig"]
    has_narrator: bool = False                            # Whether narrator detected
    narrator_hints: List[str] = field(default_factory=list)  # ["Narrator", "The narrator"]
    confidence: float = 0.0                               # Extraction confidence
    source_evidence: Dict[str, Any] = field(default_factory=dict)  # Extraction evidence
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "characters": self.characters,
            "has_narrator": self.has_narrator,
            "narrator_hints": self.narrator_hints,
            "confidence": self.confidence,
            "source_evidence": self.source_evidence,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CharacterCandidates":
        raw_characters = data.get("characters", [])
        characters = raw_characters if isinstance(raw_characters, list) else ([raw_characters] if raw_characters else [])
        characters = [str(c) for c in characters if str(c).strip()]

        raw_hints = data.get("narrator_hints", [])
        narrator_hints = raw_hints if isinstance(raw_hints, list) else ([raw_hints] if raw_hints else [])
        narrator_hints = [str(h) for h in narrator_hints if str(h).strip()]

        raw_confidence = data.get("confidence", 0.0)
        try:
            confidence = float(raw_confidence)
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))
        return cls(
            characters=characters,
            has_narrator=bool(data.get("has_narrator", False)),
            narrator_hints=narrator_hints,
            confidence=confidence,
            source_evidence=dict(data.get("source_evidence", {})),
        )
    
    def get_all_names(self) -> List[str]:
        """Get all character names including narrator if present."""
        names = list(self.characters)
        if self.has_narrator and "Narrator" not in names:
            names.append("Narrator")
        return names


# ============================================================================
# Speaker Frame - Frame extracted based on diarization segment
# ============================================================================

@dataclass
class SpeakerFrame:
    """
    A video frame extracted based on diarization segment timing.
    
    Used for precise speaker identification - frame is extracted at the moment
    when someone is actually speaking (according to audio diarization).
    """
    segment_id: int                     # Diarization segment index
    speaker_id: str                     # Speaker ID from diarization (e.g., "SPEAKER_00")
    timestamp: float                    # Frame timestamp (seconds)
    frame_path: str                     # Path to extracted frame image
    segment_start: float                # Diarization segment start time
    segment_end: float                  # Diarization segment end time
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "segment_id": self.segment_id,
            "speaker_id": self.speaker_id,
            "timestamp": self.timestamp,
            "frame_path": self.frame_path,
            "segment_start": self.segment_start,
            "segment_end": self.segment_end,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SpeakerFrame":
        return cls(
            segment_id=int(data.get("segment_id", 0)),
            speaker_id=str(data.get("speaker_id", "")),
            timestamp=float(data.get("timestamp", 0.0)),
            frame_path=str(data.get("frame_path", "")),
            segment_start=float(data.get("segment_start", 0.0)),
            segment_end=float(data.get("segment_end", 0.0)),
        )
    
    @property
    def segment_duration(self) -> float:
        return max(0.0, self.segment_end - self.segment_start)


# ============================================================================
# Speaker Visual Result - Vision analysis result for speaker identification
# ============================================================================

@dataclass
class SpeakerVisualResult:
    """
    Vision LLM analysis result for a speaker frame.
    
    Contains information about who is speaking in the frame,
    constrained by the known character candidates.
    """
    segment_id: int                     # Corresponding diarization segment
    speaker_id: str                     # Speaker ID from diarization
    frame_path: str                     # Path to analyzed frame
    timestamp: float                    # Frame timestamp
    
    # Vision analysis results
    speaking_character: Optional[str] = None  # Character identified as speaking
    visible_characters: List[str] = field(default_factory=list)  # All visible characters
    confidence: float = 0.0             # Recognition confidence
    reasoning: str = ""                 # LLM reasoning
    
    # Status
    status: str = "success"             # "success" | "failed" | "no_speaker"
    error: Optional[str] = None         # Error message if failed
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "segment_id": self.segment_id,
            "speaker_id": self.speaker_id,
            "frame_path": self.frame_path,
            "timestamp": self.timestamp,
            "speaking_character": self.speaking_character,
            "visible_characters": self.visible_characters,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "status": self.status,
            "error": self.error,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SpeakerVisualResult":
        raw_visible = data.get("visible_characters", [])
        visible_characters = raw_visible if isinstance(raw_visible, list) else ([raw_visible] if raw_visible else [])
        visible_characters = [str(c) for c in visible_characters if str(c).strip()]

        raw_confidence = data.get("confidence", 0.0)
        try:
            confidence = float(raw_confidence)
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))
        return cls(
            segment_id=int(data.get("segment_id", 0)),
            speaker_id=str(data.get("speaker_id", "")),
            frame_path=str(data.get("frame_path", "")),
            timestamp=float(data.get("timestamp", 0.0)),
            speaking_character=data.get("speaking_character"),
            visible_characters=visible_characters,
            confidence=confidence,
            reasoning=str(data.get("reasoning", "")),
            status=str(data.get("status", "success")),
            error=data.get("error"),
        )
    
    def is_narrator(self) -> bool:
        """Check if this result indicates narrator speaking."""
        if self.speaking_character is None:
            return True  # No one speaking on screen = likely narrator
        return self.speaking_character.lower() in ("narrator", "the narrator")


@dataclass
class SpeakerMap:
    """
    Mapping from speaker_id to character name.
    """
    mappings: Dict[str, str] = field(default_factory=dict)  # speaker_id -> character_name
    
    def to_dict(self) -> Dict[str, Any]:
        return {"mappings": self.mappings}
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SpeakerMap":
        return cls(mappings=dict(data.get("mappings", {})))
    
    def get_name(self, speaker_id: str) -> str:
        return self.mappings.get(speaker_id, speaker_id)


@dataclass
class AnalysisBundle:
    """
    Complete analysis bundle for a course.
    
    Contains all preprocessed data needed for script generation.
    """
    course_id: str = ""
    
    # Subtitle data
    subtitles: List[SubtitleData] = field(default_factory=list)
    
    # Timeline features
    timeline_features: Optional[TimelineFeatures] = None
    
    # Scene detection
    scenes: List[SceneInfo] = field(default_factory=list)
    
    # Diarization
    diarization: List[DiarizationSegment] = field(default_factory=list)
    
    # Visual features (scene-based, for chapter generation)
    visual_features: List[VisualFeatures] = field(default_factory=list)
    
    # Character candidates (shared by speaker vision and scene vision)
    character_candidates: Optional[CharacterCandidates] = None
    
    # Speaker visual results (diarization-based, for speaker identification)
    speaker_visual: List[SpeakerVisualResult] = field(default_factory=list)
    
    # Speaker mapping
    speaker_map: Optional[SpeakerMap] = None
    
    # Analysis metadata
    analyzed_at: Optional[str] = None
    analysis_version: str = "1.0"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "course_id": self.course_id,
            "subtitles": [s.to_dict() for s in self.subtitles],
            "timeline_features": self.timeline_features.to_dict() if self.timeline_features else None,
            "scenes": [s.to_dict() for s in self.scenes],
            "diarization": [d.to_dict() for d in self.diarization],
            "visual_features": [v.to_dict() for v in self.visual_features],
            "character_candidates": self.character_candidates.to_dict() if self.character_candidates else None,
            "speaker_visual": [sv.to_dict() for sv in self.speaker_visual],
            "speaker_map": self.speaker_map.to_dict() if self.speaker_map else None,
            "analyzed_at": self.analyzed_at,
            "analysis_version": self.analysis_version,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AnalysisBundle":
        timeline_data = data.get("timeline_features")
        speaker_map_data = data.get("speaker_map")
        character_candidates_data = data.get("character_candidates")
        
        return cls(
            course_id=str(data.get("course_id", "")),
            subtitles=[SubtitleData.from_dict(s) for s in data.get("subtitles", [])],
            timeline_features=TimelineFeatures.from_dict(timeline_data) if timeline_data else None,
            scenes=[SceneInfo.from_dict(s) for s in data.get("scenes", [])],
            diarization=[DiarizationSegment.from_dict(d) for d in data.get("diarization", [])],
            visual_features=[VisualFeatures.from_dict(v) for v in data.get("visual_features", [])],
            character_candidates=CharacterCandidates.from_dict(character_candidates_data) if character_candidates_data else None,
            speaker_visual=[SpeakerVisualResult.from_dict(sv) for sv in data.get("speaker_visual", [])],
            speaker_map=SpeakerMap.from_dict(speaker_map_data) if speaker_map_data else None,
            analyzed_at=data.get("analyzed_at"),
            analysis_version=str(data.get("analysis_version", "1.0")),
        )
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)
    
    @classmethod
    def from_json(cls, json_str: str) -> "AnalysisBundle":
        return cls.from_dict(json.loads(json_str))
