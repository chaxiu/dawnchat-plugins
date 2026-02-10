"""
v2_player short_utterance_relabel - Visual relabeling for short subtitle utterances.

This module improves speaker assignment for very short subtitle segments by using
Vision LLM to detect the active speaker (mouth open / talking gesture) on screen.
It can assign a new synthetic speaker_id for speakers missing from audio diarization
and optionally augments diarization segments to include those short utterances.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from dawnchat_sdk.host import host

from storage.v2_player import (
    CharacterCandidates,
    DiarizationSegment,
    SpeakerFrame,
    SpeakerVisualResult,
    SubtitleData,
    V2PlayerPaths,
)

logger = logging.getLogger("echoflow.v2_player.short_utterance_relabel")


class ShortUtteranceRelabelError(Exception):
    pass


_SAFE_ID_RE = re.compile(r"[^A-Z0-9_]+")


def _stable_visual_speaker_id(name: str) -> str:
    raw = str(name or "").strip()
    if not raw:
        return "VISUAL_UNKNOWN"
    upper = raw.upper()
    cleaned = _SAFE_ID_RE.sub("_", upper).strip("_")
    cleaned = re.sub(r"_+", "_", cleaned)
    if cleaned and len(cleaned) <= 40:
        return f"VISUAL_{cleaned}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12].upper()
    return f"VISUAL_{digest}"


def _is_short_subtitle(
    sub: SubtitleData,
    *,
    max_duration_s: float,
    max_words: int,
    max_chars: int,
) -> bool:
    d = float(sub.duration)
    if d > 0 and d <= float(max_duration_s):
        return True
    text = str(sub.text or "").strip()
    if not text:
        return False
    if max_words > 0 and len(text.split()) <= int(max_words):
        return True
    if max_chars > 0 and len(text) <= int(max_chars):
        return True
    return False


@dataclass(frozen=True)
class ShortUtteranceDecision:
    subtitle_index: int
    timestamp: float
    speaking_character: Optional[str]
    confidence: float
    chosen_speaker_id: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subtitle_index": self.subtitle_index,
            "timestamp": self.timestamp,
            "speaking_character": self.speaking_character,
            "confidence": self.confidence,
            "chosen_speaker_id": self.chosen_speaker_id,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ShortUtteranceDecision":
        speaking_character = data.get("speaking_character")
        if isinstance(speaking_character, str):
            speaking_character = speaking_character.strip() or None
        else:
            speaking_character = None
        chosen = data.get("chosen_speaker_id")
        if isinstance(chosen, str):
            chosen = chosen.strip() or None
        else:
            chosen = None
        return cls(
            subtitle_index=int(data.get("subtitle_index", 0)),
            timestamp=float(data.get("timestamp", 0.0)),
            speaking_character=speaking_character,
            confidence=float(data.get("confidence", 0.0)),
            chosen_speaker_id=chosen,
        )


class ShortUtteranceRelabelService:
    CACHE_VERSION = 1

    DEFAULT_MAX_DURATION_S = 0.9
    DEFAULT_MAX_WORDS = 2
    DEFAULT_MAX_CHARS = 8
    DEFAULT_MIN_CONFIDENCE = 0.65
    DEFAULT_MAX_CONCURRENT = 3
    DEFAULT_MAX_SIDE = 1024
    DEFAULT_JPEG_QUALITY = 85

    def __init__(
        self,
        paths: V2PlayerPaths,
        *,
        max_duration_s: float = DEFAULT_MAX_DURATION_S,
        max_words: int = DEFAULT_MAX_WORDS,
        max_chars: int = DEFAULT_MAX_CHARS,
        min_confidence: float = DEFAULT_MIN_CONFIDENCE,
        max_concurrent: int = DEFAULT_MAX_CONCURRENT,
        max_side: int = DEFAULT_MAX_SIDE,
        jpeg_quality: int = DEFAULT_JPEG_QUALITY,
        model: Optional[str] = None,
    ):
        self.paths = paths
        self.max_duration_s = float(max_duration_s)
        self.max_words = int(max_words)
        self.max_chars = int(max_chars)
        self.min_confidence = max(0.0, min(1.0, float(min_confidence)))
        self.max_concurrent = max(1, int(max_concurrent))
        self.max_side = int(max_side)
        self.jpeg_quality = max(1, min(100, int(jpeg_quality)))
        self.model = model

    async def relabel(
        self,
        *,
        video_path: Path,
        subtitles: Sequence[SubtitleData],
        candidates: CharacterCandidates,
        diarization: Sequence[DiarizationSegment],
        skip_existing: bool = True,
    ) -> Tuple[List[SubtitleData], List[DiarizationSegment], List[ShortUtteranceDecision]]:
        if skip_existing and self._has_cache():
            try:
                decisions = self._load_cache()
                return self._apply_decisions(
                    subtitles=subtitles,
                    diarization=diarization,
                    decisions=decisions,
                )
            except Exception:
                pass

        if not video_path.exists():
            raise ShortUtteranceRelabelError(f"Video file not found: {video_path}")

        if not subtitles:
            return list(subtitles), list(diarization), []

        if not candidates.characters and not candidates.has_narrator:
            return list(subtitles), list(diarization), []

        target_subs = [
            s
            for s in subtitles
            if _is_short_subtitle(
                s,
                max_duration_s=self.max_duration_s,
                max_words=self.max_words,
                max_chars=self.max_chars,
            )
        ]
        if not target_subs:
            return list(subtitles), list(diarization), []

        frames = await self._extract_frames(video_path=video_path, subtitles=target_subs)
        results = await self._analyze_frames(frames=frames, candidates=candidates, subtitles=subtitles)
        decisions = self._decide(frames=frames, results=results)

        updated_subs, updated_diar, applied = self._apply_decisions(
            subtitles=subtitles,
            diarization=diarization,
            decisions=decisions,
        )
        self._save_cache(applied)
        return updated_subs, updated_diar, applied

    async def _extract_frames(self, *, video_path: Path, subtitles: Sequence[SubtitleData]) -> List[SpeakerFrame]:
        self.paths.ensure_dirs()
        frames_dir = self.paths.analysis_dir / "short_utterance_frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        for old in frames_dir.glob("*.jpg"):
            try:
                old.unlink()
            except Exception:
                pass

        tasks: List[Tuple[int, SubtitleData, float]] = []
        for i, sub in enumerate(subtitles):
            d = float(sub.duration)
            if d <= 0:
                continue
            ts = float(sub.start_time) + d * 0.4
            ts = max(0.0, ts)
            tasks.append((i, sub, ts))

        if not tasks:
            return []

        timestamps = [t[2] for t in tasks]
        result = await host.media.extract_frames_batch(
            video_path=str(video_path),
            output_dir=str(frames_dir),
            timestamps=timestamps,
            quality=2,
        )
        if not isinstance(result, dict) or int(result.get("code") or 0) != 200:
            raise ShortUtteranceRelabelError(str(result.get("message") or "extract_frames_batch_failed"))

        output_paths = result.get("data", {}).get("output_paths", [])
        frames: List[SpeakerFrame] = []
        for (segment_id, sub, ts), p in zip(tasks, output_paths):
            frames.append(
                SpeakerFrame(
                    segment_id=int(sub.index),
                    speaker_id=str(sub.speaker_id or ""),
                    timestamp=float(ts),
                    frame_path=str(p),
                    segment_start=float(sub.start_time),
                    segment_end=float(sub.end_time),
                )
            )
        return frames

    async def _analyze_frames(
        self,
        *,
        frames: Sequence[SpeakerFrame],
        candidates: CharacterCandidates,
        subtitles: Sequence[SubtitleData],
    ) -> List[SpeakerVisualResult]:
        if not frames:
            return []

        sorted_subs = sorted(subtitles, key=lambda s: s.start_time)
        sem = asyncio.Semaphore(self.max_concurrent)

        async def run_one(frame: SpeakerFrame) -> SpeakerVisualResult:
            async with sem:
                context = self._subtitle_context(frame.timestamp, sorted_subs)
                prompt = self._build_prompt(candidates=candidates, subtitle_context=context)
                kwargs: Dict[str, Any] = {
                    "image_path": str(frame.frame_path),
                    "prompt": prompt,
                    "max_side": self.max_side,
                    "quality": self.jpeg_quality,
                }
                if self.model:
                    kwargs["model"] = self.model
                resp = await host.ai.vision_chat(**kwargs)
                if not isinstance(resp, dict) or int(resp.get("code") or 0) != 200:
                    raise ShortUtteranceRelabelError(str(resp.get("message") or "vision_chat_failed"))
                content = resp.get("data", {}).get("content", "")
                return self._parse_visual(frame=frame, content=str(content))

        out: List[SpeakerVisualResult] = []
        tasks = [run_one(f) for f in frames]
        for r in await asyncio.gather(*tasks, return_exceptions=True):
            if isinstance(r, Exception):
                continue
            out.append(r)
        return out

    @staticmethod
    def _subtitle_context(ts: float, subtitles: Sequence[SubtitleData]) -> str:
        parts: List[str] = []
        for sub in subtitles:
            if sub.start_time <= ts <= sub.end_time:
                parts.append(sub.text)
            elif sub.start_time > ts + 1.5:
                break
        if not parts:
            for sub in subtitles:
                if abs(sub.start_time - ts) < 0.8 or abs(sub.end_time - ts) < 0.8:
                    parts.append(sub.text)
                elif sub.start_time > ts + 1.5:
                    break
        return " ".join([p.strip() for p in parts if p.strip()][:3])

    @staticmethod
    def _build_prompt(*, candidates: CharacterCandidates, subtitle_context: str) -> str:
        names = ", ".join(candidates.get_all_names())
        narrator_note = ""
        if candidates.has_narrator:
            narrator_note = (
                "Note: This video has a NARRATOR who may speak off-screen. "
                "If no character on screen appears to be speaking, the speaker is likely the Narrator."
            )
        context_note = ""
        if subtitle_context:
            context_note = f'Subtitle at this moment: "{subtitle_context[:200]}"'
        return (
            "This frame is captured during a VERY SHORT subtitle utterance.\n\n"
            f"Known characters in this video: {names}\n"
            f"{narrator_note}\n"
            f"{context_note}\n\n"
            "IMPORTANT: Only use character names from the known list above.\n\n"
            "Task:\n"
            "1. Look for a character with MOUTH OPEN or TALKING GESTURE\n"
            "2. Identify which known character is ACTIVELY SPEAKING\n"
            "3. If no one on screen is speaking, indicate null (likely Narrator)\n\n"
            "Output JSON only:\n"
            "{\n"
            '  "speaking_character": "CharacterName" or "Narrator" or null,\n'
            '  "visible_characters": ["Char1", "Char2"],\n'
            '  "confidence": 0.0-1.0,\n'
            '  "reasoning": "brief explanation"\n'
            "}"
        )

    @staticmethod
    def _parse_visual(*, frame: SpeakerFrame, content: str) -> SpeakerVisualResult:
        try:
            text = str(content or "").strip()
            if "```" in text:
                start = text.find("```")
                text = text[start + 3 :]
                if text.startswith("json"):
                    text = text[4:]
                end = text.rfind("```")
                if end != -1:
                    text = text[:end]
                text = text.strip()

            data = json.loads(text)
            speaking_char = data.get("speaking_character")
            if speaking_char and isinstance(speaking_char, str):
                speaking_char = speaking_char.strip()
                if speaking_char.lower() in ("null", "none", ""):
                    speaking_char = None
            else:
                speaking_char = None

            visible = data.get("visible_characters", [])
            visible_chars: List[str] = []
            if isinstance(visible, list):
                visible_chars = [str(v).strip() for v in visible if isinstance(v, str) and str(v).strip()]

            raw_conf = data.get("confidence", 0.0)
            try:
                conf = float(raw_conf)
            except (TypeError, ValueError):
                conf = 0.0
            conf = max(0.0, min(1.0, conf))

            return SpeakerVisualResult(
                segment_id=int(frame.segment_id),
                speaker_id=str(frame.speaker_id or ""),
                frame_path=str(frame.frame_path),
                timestamp=float(frame.timestamp),
                speaking_character=speaking_char,
                visible_characters=visible_chars,
                confidence=conf,
                reasoning=str(data.get("reasoning", "")),
                status="success",
            )
        except Exception as e:
            return SpeakerVisualResult(
                segment_id=int(frame.segment_id),
                speaker_id=str(frame.speaker_id or ""),
                frame_path=str(frame.frame_path),
                timestamp=float(frame.timestamp),
                status="failed",
                error=str(e),
            )

    def _decide(
        self,
        *,
        frames: Sequence[SpeakerFrame],
        results: Sequence[SpeakerVisualResult],
    ) -> List[ShortUtteranceDecision]:
        by_sub_idx: Dict[int, List[SpeakerVisualResult]] = {}
        for r in results:
            by_sub_idx.setdefault(int(r.segment_id), []).append(r)

        decisions: List[ShortUtteranceDecision] = []
        for f in frames:
            idx = int(f.segment_id)
            rs = by_sub_idx.get(idx) or []
            if not rs:
                continue
            rs_sorted = sorted(rs, key=lambda x: (float(x.confidence), float(x.timestamp)), reverse=True)
            best = rs_sorted[0]
            char = best.speaking_character
            conf = float(best.confidence or 0.0)
            chosen: Optional[str] = None
            if conf >= self.min_confidence and char:
                if str(char).strip() == "Narrator":
                    chosen = "NARRATOR"
                else:
                    chosen = _stable_visual_speaker_id(str(char))
            decisions.append(
                ShortUtteranceDecision(
                    subtitle_index=idx,
                    timestamp=float(f.timestamp),
                    speaking_character=char,
                    confidence=conf,
                    chosen_speaker_id=chosen,
                )
            )
        return decisions

    @staticmethod
    def _apply_decisions(
        *,
        subtitles: Sequence[SubtitleData],
        diarization: Sequence[DiarizationSegment],
        decisions: Sequence[ShortUtteranceDecision],
    ) -> Tuple[List[SubtitleData], List[DiarizationSegment], List[ShortUtteranceDecision]]:
        sub_by_idx: Dict[int, SubtitleData] = {int(s.index): s for s in subtitles}
        diar = list(diarization)
        applied: List[ShortUtteranceDecision] = []

        for d in decisions:
            if not d.chosen_speaker_id:
                continue
            sub = sub_by_idx.get(int(d.subtitle_index))
            if sub is None:
                continue
            chosen = str(d.chosen_speaker_id).strip()
            if not chosen:
                continue
            if str(sub.speaker_id or "") == chosen:
                continue

            sub_by_idx[int(sub.index)] = SubtitleData(
                index=int(sub.index),
                start_time=float(sub.start_time),
                end_time=float(sub.end_time),
                text=str(sub.text),
                speaker_id=chosen,
            )
            diar.append(
                DiarizationSegment(
                    speaker_id=chosen,
                    start_time=float(sub.start_time),
                    end_time=float(sub.end_time),
                )
            )
            applied.append(d)

        updated_subs = [sub_by_idx[int(s.index)] for s in subtitles]
        return updated_subs, diar, applied

    def _cache_path(self) -> Path:
        return self.paths.analysis_dir / "short_utterance_relabel.json"

    def _has_cache(self) -> bool:
        return self._cache_path().exists()

    def _save_cache(self, decisions: Sequence[ShortUtteranceDecision]) -> None:
        self.paths.ensure_dirs()
        payload = {
            "version": self.CACHE_VERSION,
            "params": {
                "max_duration_s": self.max_duration_s,
                "max_words": self.max_words,
                "max_chars": self.max_chars,
                "min_confidence": self.min_confidence,
            },
            "decisions": [d.to_dict() for d in decisions],
        }
        self._cache_path().write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _load_cache(self) -> List[ShortUtteranceDecision]:
        data = json.loads(self._cache_path().read_text(encoding="utf-8"))
        if int(data.get("version") or 0) != int(self.CACHE_VERSION):
            raise ShortUtteranceRelabelError("cache_version_mismatch")
        return [ShortUtteranceDecision.from_dict(x) for x in data.get("decisions", [])]

