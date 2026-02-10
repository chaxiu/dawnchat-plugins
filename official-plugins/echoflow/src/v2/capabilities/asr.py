from __future__ import annotations

from typing import Any, Protocol

from ..models import AsrResult


class AsrProvider(Protocol):
    async def transcribe(self, audio_path: str, language: str | None = None, **kwargs: Any) -> AsrResult: ...
