from __future__ import annotations

from typing import Protocol

from ..models import SpeechSegments


class VadProvider(Protocol):
    async def detect(self, audio_path: str) -> SpeechSegments: ...

