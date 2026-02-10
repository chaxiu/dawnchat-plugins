"""
v2_player storage module - Data models and path management for Smart Player v2.
"""

from .schema import (
    # Widget and UI structures
    WidgetPayload,
    ChapterInfo,
    NarrationDirectives,
    DIRECTION_TYPES,
    COURSE_TYPES,
    # Core script structures
    SmartScriptEntry,
    SmartScript,
    # Analysis bundle
    AnalysisBundle,
    SubtitleData,
    TimelineFeatures,
    GapInfo,
    DensityInfo,
    SceneInfo,
    DiarizationSegment,
    VisualFeatures,
    # Character and speaker identification
    CharacterCandidates,
    SpeakerFrame,
    SpeakerVisualResult,
    SpeakerMap,
)
from .paths import V2PlayerPaths

__all__ = [
    # Widget and UI structures
    "WidgetPayload",
    "ChapterInfo",
    "NarrationDirectives",
    "DIRECTION_TYPES",
    "COURSE_TYPES",
    # Core script structures
    "SmartScriptEntry",
    "SmartScript",
    # Analysis bundle
    "AnalysisBundle",
    "SubtitleData",
    "TimelineFeatures",
    "GapInfo",
    "DensityInfo",
    "SceneInfo",
    "DiarizationSegment",
    "VisualFeatures",
    # Character and speaker identification
    "CharacterCandidates",
    "SpeakerFrame",
    "SpeakerVisualResult",
    "SpeakerMap",
    # Paths
    "V2PlayerPaths",
]

