from __future__ import annotations

from .models import (
    AudioAsset,
    ExplainableReport,
    Explanation,
    RegionKind,
    Scores,
    Severity,
    TimeSpan,
    TimelineLayers,
    TimelineRegion,
    UncertaintyFlags,
)
from .versions import IR_VERSION, SCHEMA_VERSION


def mock_report() -> ExplainableReport:
    audio = AudioAsset(duration_s=3.2, sample_rate=16000, path=None)
    duration = float(audio.duration_s or 0.0) or 3.2

    words = [
        TimelineRegion(
            kind=RegionKind.WORD,
            time_span=TimeSpan(start_s=0.10, end_s=0.45),
            label="I",
            severity=Severity.INFO,
            meta={"status": "match"},
        ),
        TimelineRegion(
            kind=RegionKind.WORD,
            time_span=TimeSpan(start_s=0.46, end_s=0.92),
            label="want",
            severity=Severity.INFO,
            meta={"status": "match"},
        ),
        TimelineRegion(
            kind=RegionKind.WORD,
            time_span=TimeSpan(start_s=0.93, end_s=1.28),
            label="to",
            severity=Severity.INFO,
            meta={"status": "match"},
        ),
        TimelineRegion(
            kind=RegionKind.WORD,
            time_span=TimeSpan(start_s=1.29, end_s=1.95),
            label="buy",
            severity=Severity.WARNING,
            meta={"status": "substitution", "target": "buy", "hyp": "by"},
        ),
        TimelineRegion(
            kind=RegionKind.WORD,
            time_span=TimeSpan(start_s=1.96, end_s=2.60),
            label="milk",
            severity=Severity.ERROR,
            meta={"status": "missing", "target": "milk"},
        ),
    ]

    pauses = [
        TimelineRegion(
            kind=RegionKind.PAUSE,
            time_span=TimeSpan(start_s=0.92, end_s=1.05),
            label="pause 130ms",
            severity=Severity.INFO,
            meta={"pause_ms": 130},
        ),
        TimelineRegion(
            kind=RegionKind.PAUSE,
            time_span=TimeSpan(start_s=1.95, end_s=2.25),
            label="pause 300ms",
            severity=Severity.WARNING,
            meta={"pause_ms": 300},
        ),
    ]

    layers = TimelineLayers(word_regions=words, pause_regions=pauses)

    explanations = [
        Explanation(
            type="content.substitution",
            severity=Severity.WARNING,
            message='可能把 "buy" 读成了近音词（例如 "by"）',
            time_span=TimeSpan(start_s=1.29, end_s=1.95),
            evidence={"edit": {"type": "substitution", "target_word": "buy", "hyp_word": "by"}},
        ),
        Explanation(
            type="content.missing",
            severity=Severity.ERROR,
            message='可能漏读了 "milk"',
            time_span=TimeSpan(start_s=1.96, end_s=2.60),
            evidence={"edit": {"type": "missing", "target_word": "milk"}},
        ),
        Explanation(
            type="fluency.pause",
            severity=Severity.WARNING,
            message="在 buy 后停顿偏长（300ms）",
            time_span=TimeSpan(start_s=1.95, end_s=2.25),
            evidence={"vad": {"pause_ms": 300}},
        ),
    ]

    flags = UncertaintyFlags(low_confidence=False, high_no_speech_prob=False, notes=[])

    report = ExplainableReport(
        schema_version=SCHEMA_VERSION,
        ir_version=IR_VERSION,
        scores=Scores(overall=74, content=70, fluency=78, pronunciation=None),
        explanations=explanations,
        timeline_layers=layers,
        uncertainty_flags=flags,
        audio=audio,
        debug={"mock": True, "duration_s": duration},
    )
    return report

