"""
v2_player services module - Business logic for Smart Player v2.
"""

from .cache_keys import V2CacheKeys
from .subtitle_model import SubtitleSegment, SubtitleDocument
from .subtitle_parser import (
    SubtitleParser,
    SubtitleParseError,
    parse_subtitle_file,
    parse_subtitle_string,
)
from .analyze import Analyzer, AnalysisError, analyze_course
from .diarization import DiarizationService, DiarizationError
from .scene_detection import SceneDetectionService, SceneDetectionError
from .vision import VisionService, VisionError
from .speaker_naming import SpeakerNamingService, SpeakerNamingError, apply_speaker_names
from .script_gen import RuleScriptGenerator, ScriptGenError
from .tts_pregen import TTSPregenService, TTSPregenError
from .pipeline import V2Pipeline, PipelineResult, prepare_course_for_v2
from .unified_events import UnifiedEventBuilder, UnifiedEvent
from .llm_script_gen import LLMScriptGenerator, LLMScriptGenError
from .ondemand_help import OnDemandHelpService, OnDemandHelpError
from .gamify import GamifyService, StarSentence, DubbingChallenge
from .direction_analyzer import DirectionAnalyzer, DirectionAnalyzerError, DirectionSuggestion, DirectionSuggestions
from .chapter_gen import ChapterGenerator, ChapterGenError

__all__ = [
    "V2CacheKeys",
    "SubtitleSegment",
    "SubtitleDocument",
    "SubtitleParser",
    "SubtitleParseError",
    "parse_subtitle_file",
    "parse_subtitle_string",
    "Analyzer",
    "AnalysisError",
    "analyze_course",
    "DiarizationService",
    "DiarizationError",
    "SceneDetectionService",
    "SceneDetectionError",
    "VisionService",
    "VisionError",
    "SpeakerNamingService",
    "SpeakerNamingError",
    "apply_speaker_names",
    "RuleScriptGenerator",
    "ScriptGenError",
    "TTSPregenService",
    "TTSPregenError",
    "V2Pipeline",
    "PipelineResult",
    "prepare_course_for_v2",
    "UnifiedEventBuilder",
    "UnifiedEvent",
    "LLMScriptGenerator",
    "LLMScriptGenError",
    "OnDemandHelpService",
    "OnDemandHelpError",
    "GamifyService",
    "StarSentence",
    "DubbingChallenge",
    "DirectionAnalyzer",
    "DirectionAnalyzerError",
    "DirectionSuggestion",
    "DirectionSuggestions",
    "ChapterGenerator",
    "ChapterGenError",
]

