from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from dawnchat_sdk import host

from ..models import AsrResult, AsrSegment, AsrWord
from .asr import AsrProvider


@dataclass(frozen=True)
class HostWhisperAsrProvider(AsrProvider):
    model_size: Optional[str] = None
    vad_filter: bool = True

    async def transcribe(self, audio_path: str, language: str | None = None, **kwargs: Any) -> AsrResult:
        allowed = {
            "model_size",
            "vad_filter",
            "vad_parameters",
            "initial_prompt",
            "hotwords",
            "prefix",
            "chunk_length",
            "condition_on_previous_text",
            "temperature",
            "beam_size",
        }
        forwarded = {k: v for k, v in (kwargs or {}).items() if k in allowed and v is not None}
        raw = await host.asr.transcribe(
            audio_path=audio_path,
            language=language,
            model_size=forwarded.pop("model_size", self.model_size),
            vad_filter=forwarded.pop("vad_filter", self.vad_filter),
            word_timestamps=True,
            output_format="segments",
            **forwarded,
        )

        code = raw.get("code")
        if code != 200:
            message = raw.get("message") or "asr failed"
            err_data = raw.get("data")
            detail = ""
            if isinstance(err_data, dict) and err_data.get("error_code"):
                detail = f" ({err_data.get('error_code')})"
            raise RuntimeError(f"{message}{detail}")

        raw_data = raw.get("data")
        data: dict[str, Any] = raw_data if isinstance(raw_data, dict) else {}

        segments: list[AsrSegment] = []
        for seg in (data.get("segments") or []):
            if not isinstance(seg, dict):
                continue
            words: list[AsrWord] = []
            for w in (seg.get("words") or []) or []:
                if not isinstance(w, dict):
                    continue
                word = (w.get("word") or "").strip()
                if not word:
                    continue
                words.append(
                    AsrWord(
                        word=word,
                        start_s=w.get("start"),
                        end_s=w.get("end"),
                        probability=w.get("probability"),
                    )
                )
            segments.append(
                AsrSegment(
                    id=seg.get("id"),
                    start_s=seg.get("start"),
                    end_s=seg.get("end"),
                    text=(seg.get("text") or "").strip(),
                    words=words,
                    avg_logprob=seg.get("avg_logprob"),
                    no_speech_prob=seg.get("no_speech_prob"),
                )
            )

        asr = AsrResult(
            text=(data.get("text") or "").strip(),
            language=data.get("language"),
            segments=segments,
        )
        if isinstance(data.get("duration"), (int, float)):
            setattr(asr, "duration_s", float(data["duration"]))
        if data.get("model_size"):
            setattr(asr, "model_size", data.get("model_size"))
        if data.get("language_probability") is not None:
            setattr(asr, "language_probability", data.get("language_probability"))
        return asr
