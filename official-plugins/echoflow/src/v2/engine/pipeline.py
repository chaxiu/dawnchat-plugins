from __future__ import annotations

from typing import Any, Optional, Protocol

from ..models import ExplainableReport
from .default_pipeline import DefaultV2Pipeline


class V2ScoringPipeline(Protocol):
    async def score(
        self,
        audio_path: str,
        target_text: str,
        language: Optional[str] = None,
        *,
        context: Optional[dict[str, Any]] = None,
    ) -> ExplainableReport: ...


_pipeline: Optional[V2ScoringPipeline] = None


def get_pipeline() -> V2ScoringPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = DefaultV2Pipeline()
    return _pipeline
