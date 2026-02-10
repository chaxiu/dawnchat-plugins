from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from services import narrator
from ui.coach.narrations.common import narration_audio_path

logger = logging.getLogger("echoflow.services.pregen")


@dataclass
class PregenProgress:
    total: int = 0
    done: int = 0
    failed: int = 0
    running: bool = False
    last_error: str = ""


_PROGRESS: dict[str, PregenProgress] = {}
_TASKS: dict[str, asyncio.Task] = {}


def get_pregen_progress(course_id: str) -> PregenProgress:
    return _PROGRESS.get(str(course_id), PregenProgress())


def cancel_pregen_for_course(course_id: str) -> bool:
    cid = str(course_id or "").strip()
    if not cid:
        return False
    t = _TASKS.get(cid)
    if t is None or t.done():
        p = _PROGRESS.get(cid)
        if p is not None:
            p.running = False
        return False
    try:
        t.cancel()
    except Exception:
        return False
    return True


def start_pregen_for_course(
    *,
    course_db,
    course,
    plan_id: str,
    narration_lang: str,
    scope: str,
    intensity: str,
    force: bool = False,
) -> None:
    course_id = str(getattr(course, "id", "") or "").strip()
    if not course_id or not plan_id:
        return

    existing = _TASKS.get(course_id)
    if existing and not existing.done():
        if not bool(force):
            return
        try:
            existing.cancel()
        except Exception:
            return

    progress = PregenProgress(total=0, done=0, failed=0, running=True, last_error="")
    _PROGRESS[course_id] = progress

    async def _runner() -> None:
        try:
            prefs = course_db.get_app_prefs() or {}
            model = str(prefs.get("llm_model") or "").strip() or None
            speaker = str(prefs.get("tts_voice") or "Emma").strip() or "Emma"
            quality = str(prefs.get("tts_quality") or "fast").strip() or "fast"
            tts_engine = str(prefs.get("tts_engine") or "vibevoice").strip() or "vibevoice"
            tts_model_id = str(prefs.get("tts_model_id") or "").strip() or None

            nodes = course_db.list_plan_nodes(str(plan_id))
            include_practice_hint = bool(prefs.get("echoflow_coach_pre_understand") or False)

            prompt_versions = {
                "plot": "plot_v1",
                "translation": "translation_v1",
                "vocab": "vocab_v1",
                "grammar": "grammar_v1",
                "skip_summary": "skip_summary_v1",
                "practice_hint": "practice_hint_v1",
            }
            gen_funcs = {
                "plot": narrator.generate_plot,
                "translation": narrator.generate_translation,
                "vocab": narrator.generate_vocab,
                "grammar": narrator.generate_grammar,
                "skip_summary": narrator.generate_skip_summary,
                "practice_hint": narrator.generate_practice_hint,
            }

            intensity_key = str(intensity or "medium").strip().lower()
            if intensity_key == "low":
                allowed_kinds = {"translation"}
            elif intensity_key == "high":
                allowed_kinds = {"translation", "vocab", "grammar", "plot"}
            else:
                allowed_kinds = {"translation", "vocab"}

            max_seg_idx = _scope_max_seg_idx(course=course, scope=str(scope or "all"))

            tasks: list[dict[str, Any]] = []
            cached_audio_done = 0

            for node in nodes:
                if str(node.get("node_type") or "") != "narration":
                    continue
                kind = str(node.get("narration_kind") or "").strip()
                if not kind or kind not in allowed_kinds:
                    continue
                try:
                    range_start = int(node.get("range_start_idx") or 0)
                    range_end = int(node.get("range_end_idx") or 0)
                except Exception:
                    continue

                if max_seg_idx is not None and int(range_end) > int(max_seg_idx):
                    continue

                segs: list[dict[str, Any]] = []
                for idx in range(max(0, range_start), min(course.total_segments - 1, range_end) + 1):
                    try:
                        s = course.segments[int(idx)]
                        segs.append({"idx": int(s.id), "text": str(s.text or "")})
                    except Exception:
                        continue
                if not segs:
                    continue

                prompt_version = str(prompt_versions.get(kind, f"{kind}_v1"))
                input_hash = narrator.compute_input_hash(
                    {
                        "course_id": str(course_id),
                        "kind": str(kind),
                        "lang": str(narration_lang),
                        "prompt_version": str(prompt_version),
                        "range_start_idx": int(range_start),
                        "range_end_idx": int(range_end),
                        "segments": segs,
                    }
                )
                cached = course_db.find_cached_narration(
                    course_id=str(course_id),
                    kind=str(kind),
                    lang=str(narration_lang),
                    input_hash=str(input_hash),
                )
                cached_audio_path = str((cached or {}).get("tts_audio_path") or "").strip()
                has_audio = bool(cached_audio_path) and Path(cached_audio_path).exists()
                if has_audio:
                    cached_audio_done += 1

                tasks.append(
                    {
                        "node_id": str(node.get("id") or ""),
                        "kind": kind,
                        "lang": str(narration_lang),
                        "prompt_version": prompt_version,
                        "range_start_idx": int(range_start),
                        "range_end_idx": int(range_end),
                        "segments": segs,
                        "input_hash": str(input_hash),
                        "cached": cached,
                        "has_audio": has_audio,
                        "needs_tts": True,
                        "done": has_audio,
                    }
                )

            if include_practice_hint:
                for node in nodes:
                    if str(node.get("node_type") or "") != "practice":
                        continue
                    seg_id = str(node.get("segment_id") or "")
                    if not seg_id:
                        continue
                    try:
                        seg_idx = int(seg_id.split(":")[-1]) if ":" in seg_id else int(seg_id)
                    except Exception:
                        continue
                    if seg_idx < 0 or seg_idx >= int(getattr(course, "total_segments", 0) or 0):
                        continue
                    max_seg_idx = _scope_max_seg_idx(course=course, scope=str(scope or "all"))
                    if max_seg_idx is not None and int(seg_idx) > int(max_seg_idx):
                        continue
                    try:
                        s = course.segments[int(seg_idx)]
                        segs = [{"idx": int(s.id), "text": str(s.text or "")}]
                    except Exception:
                        continue
                    kind = "practice_hint"
                    prompt_version = str(prompt_versions.get(kind, f"{kind}_v1"))
                    input_hash = narrator.compute_input_hash(
                        {
                            "course_id": str(course_id),
                            "kind": str(kind),
                            "lang": str(narration_lang),
                            "prompt_version": str(prompt_version),
                            "range_start_idx": int(seg_idx),
                            "range_end_idx": int(seg_idx),
                            "segments": segs,
                        }
                    )
                    cached = course_db.find_cached_narration(
                        course_id=str(course_id),
                        kind=str(kind),
                        lang=str(narration_lang),
                        input_hash=str(input_hash),
                    )
                    has_text = bool(str((cached or {}).get("content_text") or "").strip())
                    if has_text:
                        cached_audio_done += 1
                    tasks.append(
                        {
                            "node_id": str(node.get("id") or ""),
                            "kind": kind,
                            "lang": str(narration_lang),
                            "prompt_version": prompt_version,
                            "range_start_idx": int(seg_idx),
                            "range_end_idx": int(seg_idx),
                            "segments": segs,
                            "input_hash": str(input_hash),
                            "cached": cached,
                            "has_audio": has_text,
                            "needs_tts": False,
                            "done": has_text,
                        }
                    )

            progress.total = int(len(tasks))
            progress.done = int(cached_audio_done)
            if progress.total <= 0:
                progress.running = False
                return

            llm_queue = [t for t in tasks if (not t.get("done")) and (t.get("cached") is None)]

            for t in llm_queue:
                kind = str(t["kind"])
                gen = gen_funcs.get(kind)
                if gen is None:
                    progress.failed += 1
                    t["done"] = True
                    progress.done += 1
                    continue
                try:
                    _, result = await gen(
                        course_id=str(course_id),
                        lang=str(narration_lang),
                        range_start_idx=int(t["range_start_idx"]),
                        range_end_idx=int(t["range_end_idx"]),
                        segments=list(t["segments"]),
                        model=model,
                    )
                    t["generated"] = result
                    course_db.upsert_narration(
                        narration_id=str(result.narration_id),
                        course_id=str(course_id),
                        plan_id=str(plan_id),
                        node_id=str(t["node_id"]),
                        kind=str(kind),
                        lang=str(narration_lang),
                        input_hash=str(result.input_hash),
                        prompt_version=str(result.prompt_version),
                        content_text=str(result.content_text),
                        content_json=result.content_json,
                        range_start_idx=int(t["range_start_idx"]),
                        range_end_idx=int(t["range_end_idx"]),
                        segment_id=None,
                        model_id=result.model_id,
                        temperature=result.temperature,
                        tts_audio_path=None,
                        tts_voice=None,
                        tts_model=None,
                    )
                    t["cached"] = course_db.find_cached_narration(
                        course_id=str(course_id),
                        kind=str(kind),
                        lang=str(narration_lang),
                        input_hash=str(result.input_hash),
                    )
                except Exception as e:
                    progress.failed += 1
                    progress.last_error = str(e)
                    t["done"] = True
                    progress.done += 1

            tts_queue = [t for t in tasks if not t.get("done")]
            data_dir = Path(course_db.db_path).parent
            for t in tts_queue:
                if not bool(t.get("needs_tts", True)):
                    t["done"] = True
                    progress.done += 1
                    continue
                kind = str(t["kind"])
                cached = t.get("cached") or {}
                text = str(cached.get("content_text") or "").strip()
                if not text:
                    progress.failed += 1
                    t["done"] = True
                    progress.done += 1
                    continue

                audio_path = narration_audio_path(
                    base_dir=data_dir,
                    course_id=str(course_id),
                    kind=str(kind),
                    input_hash=str(t["input_hash"]),
                )
                audio_path.parent.mkdir(parents=True, exist_ok=True)
                tts_ok = False
                try:
                    tts_ok = await narrator.synthesize_tts(
                        text=str(text),
                        output_path=str(audio_path),
                        speaker=str(speaker),
                        quality=str(quality),
                        engine=str(tts_engine),
                        model_id=(str(tts_model_id).strip() if tts_model_id else None),
                    )
                except Exception as e:
                    tts_ok = False
                    progress.last_error = str(e)

                if not (tts_ok and audio_path.exists()):
                    progress.failed += 1

                narration_id = str(cached.get("id") or "") or uuid.uuid4().hex
                prompt_version = str(cached.get("prompt_version") or t.get("prompt_version") or "")
                model_id = cached.get("model_id")
                temperature = cached.get("temperature")
                content_json = cached.get("content_json")

                course_db.upsert_narration(
                    narration_id=narration_id,
                    course_id=str(course_id),
                    plan_id=str(plan_id),
                    node_id=str(t["node_id"]),
                    kind=str(kind),
                    lang=str(narration_lang),
                    input_hash=str(t["input_hash"]),
                    prompt_version=str(prompt_version),
                    content_text=str(text),
                    content_json=content_json,
                    range_start_idx=int(t["range_start_idx"]),
                    range_end_idx=int(t["range_end_idx"]),
                    segment_id=None,
                    model_id=model_id,
                    temperature=temperature,
                    tts_audio_path=str(audio_path) if (tts_ok and audio_path.exists()) else None,
                    tts_voice=str(speaker) if (tts_ok and audio_path.exists()) else None,
                    tts_model=str(tts_engine) if (tts_ok and audio_path.exists()) else None,
                )

                t["done"] = True
                progress.done += 1
        except asyncio.CancelledError:
            progress.last_error = "cancelled"
            raise
        except Exception as e:
            progress.failed += 1
            progress.last_error = str(e)
            logger.error("pregen failed: %s", e, exc_info=True)
        finally:
            progress.running = False

    _TASKS[course_id] = asyncio.create_task(_runner())


def _scope_max_seg_idx(*, course, scope: str) -> Optional[int]:
    s = str(scope or "all").strip().lower()
    if s == "all":
        return None
    if s == "first_30_segments":
        return min(max(0, course.total_segments - 1), 29)
    if s == "first_5_min":
        max_t = 5 * 60.0
        max_idx = None
        for seg in list(getattr(course, "segments", []) or []):
            try:
                if float(seg.start_time) <= float(max_t):
                    max_idx = int(seg.id)
            except Exception:
                continue
        return max_idx
    return None
