from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, Field

try:
    from pydantic import ConfigDict  # type: ignore
except Exception:
    ConfigDict = None  # type: ignore


class V2BaseModel(BaseModel):
    if ConfigDict is not None:
        model_config = ConfigDict(extra="allow")  # type: ignore
    else:
        class Config:
            extra = "allow"


class RegionKind(str, Enum):
    WORD = "word"
    PAUSE = "pause"
    DIVERGENCE = "divergence"


class EditType(str, Enum):
    MATCH = "match"
    MISSING = "missing"
    INSERTION = "insertion"
    SUBSTITUTION = "substitution"


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class TimeSpan(V2BaseModel):
    start_s: float = Field(ge=0.0)
    end_s: float = Field(ge=0.0)

    def duration_s(self) -> float:
        return max(0.0, float(self.end_s) - float(self.start_s))


class AudioAsset(V2BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    path: Optional[str] = None
    sample_rate: Optional[int] = Field(default=None, ge=1)
    duration_s: Optional[float] = Field(default=None, ge=0.0)
    rms_dbfs: Optional[float] = None
    peak: Optional[float] = Field(default=None, ge=0.0)


class AsrWord(V2BaseModel):
    word: str
    start_s: Optional[float] = Field(default=None, ge=0.0)
    end_s: Optional[float] = Field(default=None, ge=0.0)
    probability: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class AsrSegment(V2BaseModel):
    id: Optional[int] = None
    start_s: Optional[float] = Field(default=None, ge=0.0)
    end_s: Optional[float] = Field(default=None, ge=0.0)
    text: str = ""
    words: List[AsrWord] = Field(default_factory=list)
    avg_logprob: Optional[float] = None
    no_speech_prob: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class AsrResult(V2BaseModel):
    text: str = ""
    language: Optional[str] = None
    segments: List[AsrSegment] = Field(default_factory=list)


class WordAlignment(V2BaseModel):
    word: str
    time_span: TimeSpan
    source: str = "whisper"


class DiffEdit(V2BaseModel):
    type: EditType
    target_word: Optional[str] = None
    hyp_word: Optional[str] = None
    time_span: Optional[TimeSpan] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class SpeechSpan(V2BaseModel):
    start_s: float = Field(ge=0.0)
    end_s: float = Field(ge=0.0)


class SpeechSegments(V2BaseModel):
    speech_spans: List[SpeechSpan] = Field(default_factory=list)
    silence_spans: List[SpeechSpan] = Field(default_factory=list)


class FluencyFeatures(V2BaseModel):
    pause_count: Optional[int] = Field(default=None, ge=0)
    max_pause_ms: Optional[int] = Field(default=None, ge=0)
    speech_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    wps: Optional[float] = Field(default=None, ge=0.0)
    articulation_rate: Optional[float] = Field(default=None, ge=0.0)


class TimelineRegion(V2BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    kind: RegionKind
    time_span: TimeSpan
    label: str = ""
    severity: Optional[Severity] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class TimelineLayers(V2BaseModel):
    word_regions: List[TimelineRegion] = Field(default_factory=list)
    pause_regions: List[TimelineRegion] = Field(default_factory=list)
    divergence_regions: List[TimelineRegion] = Field(default_factory=list)


class Explanation(V2BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    type: str
    severity: Severity
    message: str
    time_span: Optional[TimeSpan] = None
    evidence: Dict[str, Any] = Field(default_factory=dict)


class Scores(V2BaseModel):
    overall: Optional[int] = Field(default=None, ge=0, le=100)
    content: Optional[int] = Field(default=None, ge=0, le=100)
    fluency: Optional[int] = Field(default=None, ge=0, le=100)
    pronunciation: Optional[int] = Field(default=None, ge=0, le=100)


class UncertaintyFlags(V2BaseModel):
    low_confidence: bool = False
    high_no_speech_prob: bool = False
    notes: List[str] = Field(default_factory=list)


class ExplainableReport(V2BaseModel):
    schema_version: str
    ir_version: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    scores: Scores
    explanations: List[Explanation] = Field(default_factory=list)
    timeline_layers: TimelineLayers
    uncertainty_flags: UncertaintyFlags = Field(default_factory=UncertaintyFlags)
    audio: Optional[AudioAsset] = None
    debug: Dict[str, Any] = Field(default_factory=dict)


class IRBundle(V2BaseModel):
    ir_version: str
    audio: AudioAsset
    target_text: str
    asr: Optional[AsrResult] = None
    alignments: List[WordAlignment] = Field(default_factory=list)
    diff_edits: List[DiffEdit] = Field(default_factory=list)
    vad: Optional[SpeechSegments] = None
    fluency: Optional[FluencyFeatures] = None
    extras: Dict[str, Any] = Field(default_factory=dict)

