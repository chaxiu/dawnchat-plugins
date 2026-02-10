from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any, Optional

from i18n import i18n
from services import narrator

from .common import narration_audio_path, render_narration_card

if TYPE_CHECKING:
    from course.models import Course
    from storage.course_db import CourseDatabase


async def render_vocab_view(
    *,
    course: "Course",
    course_db: "CourseDatabase",
    theme: Any,
    ui_lang: str,
    narration_lang: str,
    plan_id: str,
    node: dict,
    video_enabled: bool = False,
    video_strategy: str = "freeze",
    on_video_strategy_change=None,
    auto_continue: bool = False,
    on_continue,
    on_skip,
) -> None:
    def _t(key: str) -> str:
        return i18n.t(key, ui_lang)

    range_start = int(node.get("range_start_idx") or 0)
    range_end = int(node.get("range_end_idx") or 0)
    segs: list[dict[str, Any]] = []
    for idx in range(max(0, range_start), min(course.total_segments - 1, range_end) + 1):
        try:
            s = course.segments[int(idx)]
            segs.append({"idx": int(s.id), "text": str(s.text or "")})
        except Exception:
            continue

    input_hash = narrator.compute_input_hash(
        {
            "course_id": str(course.id),
            "kind": "vocab",
            "lang": str(narration_lang),
            "prompt_version": "vocab_v1",
            "range_start_idx": int(range_start),
            "range_end_idx": int(range_end),
            "segments": segs,
        }
    )

    cached = course_db.find_cached_narration(course_id=str(course.id), kind="vocab", lang=str(narration_lang), input_hash=input_hash)
    cached_text = str((cached or {}).get("content_text") or "").strip()
    cached_audio = (cached or {}).get("tts_audio_path")

    meta = f"{range_start + 1}" if range_start == range_end else f"{range_start + 1}–{range_end + 1}"
    title = _t("vocab") if _t("vocab") != "vocab" else "词汇"

    async def _generate() -> tuple[str, Optional[str], Optional[Path]]:
        prefs = course_db.get_app_prefs() or {}
        model = str(prefs.get("llm_model") or "").strip() or None
        speaker = str(prefs.get("tts_voice") or "Emma").strip() or "Emma"
        quality = str(prefs.get("tts_quality") or "fast").strip() or "fast"
        tts_engine = str(prefs.get("tts_engine") or "vibevoice").strip() or "vibevoice"
        tts_model_id = str(prefs.get("tts_model_id") or "").strip() or None
        _, result = await narrator.generate_vocab(
            course_id=str(course.id),
            lang=str(narration_lang),
            range_start_idx=int(range_start),
            range_end_idx=int(range_end),
            segments=segs,
            model=model,
        )
        data_dir = Path(course_db.db_path).parent
        audio_path = narration_audio_path(base_dir=data_dir, course_id=str(course.id), kind="vocab", input_hash=result.input_hash)
        audio_path.parent.mkdir(parents=True, exist_ok=True)
        tts_ok = False
        try:
            tts_ok = await narrator.synthesize_tts(
                text=result.content_text,
                output_path=str(audio_path),
                speaker=speaker,
                quality=quality,
                engine=str(tts_engine),
                model_id=(str(tts_model_id).strip() if tts_model_id else None),
            )
        except Exception:
            tts_ok = False

        course_db.upsert_narration(
            narration_id=result.narration_id,
            course_id=str(course.id),
            plan_id=str(plan_id),
            node_id=str(node.get("id") or ""),
            kind="vocab",
            lang=str(narration_lang),
            input_hash=str(result.input_hash),
            prompt_version=str(result.prompt_version),
            content_text=str(result.content_text),
            content_json=result.content_json,
            range_start_idx=int(range_start),
            range_end_idx=int(range_end),
            segment_id=None,
            model_id=result.model_id,
            temperature=result.temperature,
            tts_audio_path=str(audio_path) if tts_ok and audio_path.exists() else None,
            tts_voice=speaker if tts_ok else None,
            tts_model=str(tts_engine) if tts_ok else None,
        )
        cached_row = course_db.find_cached_narration(course_id=str(course.id), kind="vocab", lang=str(narration_lang), input_hash=str(result.input_hash))
        cached_audio_path = (cached_row or {}).get("tts_audio_path")
        return result.content_text, result.content_json, Path(str(cached_audio_path)) if cached_audio_path else None

    await render_narration_card(
        course=course,
        theme=theme,
        lang=ui_lang,
        title=title,
        meta=meta,
        cached_text=cached_text,
        cached_audio_path=str(cached_audio) if cached_audio else None,
        video_enabled=bool(video_enabled),
        video_strategy=str(video_strategy or "freeze"),
        on_video_strategy_change=on_video_strategy_change,
        auto_continue=bool(auto_continue),
        on_generate=_generate,
        on_continue=on_continue,
        on_skip=on_skip,
    )
