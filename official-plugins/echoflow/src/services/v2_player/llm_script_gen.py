"""
v2_player llm_script_gen - LLM-based SmartScript generation.

This module uses LLM to generate more natural and contextual commentary
based on the unified event list.

The generation process:
1. Build unified event list from analysis bundle
2. Split into sliding windows
3. For each window, call LLM to generate commentary entries
4. Merge and deduplicate entries
5. Validate and return SmartScript

Usage:
    from services.v2_player.llm_script_gen import LLMScriptGenerator
    
    generator = LLMScriptGenerator(paths)
    script = await generator.generate(bundle)
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional

from dawnchat_sdk.host import host

from storage.v2_player import (
    AnalysisBundle,
    SmartScript,
    SmartScriptEntry,
    V2PlayerPaths,
    WidgetPayload,
    NarrationDirectives,
    DIRECTION_TYPES,
)
from .cache_keys import V2CacheKeys
from .unified_events import UnifiedEventBuilder, UnifiedEvent

logger = logging.getLogger("echoflow.v2_player.llm_script_gen")

_EMOJI_RE = re.compile(
    r"[\U0001F000-\U0001FAFF\U00002600-\U000026FF\U00002700-\U000027BF]+",
    flags=re.UNICODE,
)


class LLMScriptGenError(Exception):
    """Raised when LLM script generation fails."""
    pass


class LLMScriptGenerator:
    """
    LLM-based SmartScript generator.
    
    Uses LLM to generate more natural and contextual commentary.
    """
    
    # Default parameters
    DEFAULT_WINDOW_SIZE = 60.0          # Seconds per window
    DEFAULT_WINDOW_OVERLAP = 10.0       # Overlap between windows
    DEFAULT_MAX_ENTRIES_PER_WINDOW = 3  # Max entries per window
    
    def __init__(
        self,
        paths: V2PlayerPaths,
        *,
        model: Optional[str] = None,
        narration_lang: str = "zh",
        audience: str = "adult",
        english_level: str = "intermediate",
        max_entries_per_minute: int = 3,
        window_size: float = DEFAULT_WINDOW_SIZE,
        window_overlap: float = DEFAULT_WINDOW_OVERLAP,
        directives: Optional[NarrationDirectives] = None,
    ):
        """
        Initialize LLM script generator.
        
        Args:
            paths: V2PlayerPaths instance
            model: LLM model to use (None for default)
            window_size: Window size in seconds
            window_overlap: Overlap between windows
            directives: Narration directives for direction constraints
        """
        self.paths = paths
        self.model = model
        self.narration_lang = str(narration_lang or "zh")
        self.audience = str(audience or "adult")
        self.english_level = str(english_level or "intermediate")
        self.max_entries_per_minute = int(max(1, max_entries_per_minute))
        self.window_size = window_size
        self.window_overlap = window_overlap
        self.directives = directives
        
        self._event_builder = UnifiedEventBuilder()

    def _load_windows_cache(self) -> Optional[Dict[str, Any]]:
        p = getattr(self.paths, "smart_script_windows_json", None)
        if p is None or not p.exists():
            return None
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return None

    def _save_windows_cache(self, cache: Dict[str, Any]) -> None:
        self.paths.ensure_dirs()
        self.paths.smart_script_windows_json.write_text(
            json.dumps(cache, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _is_cache_compatible(self, cache: Optional[Dict[str, Any]], *, input_hash: str, profile_hash: str) -> bool:
        if not cache:
            return False
        if str(cache.get("generator") or "") != "llm":
            return False
        if str(cache.get("input_hash") or "") != str(input_hash or ""):
            return False
        if str(cache.get("profile_hash") or "") != str(profile_hash or ""):
            return False
        if float(cache.get("window_size") or 0.0) != float(self.window_size):
            return False
        if float(cache.get("window_overlap") or 0.0) != float(self.window_overlap):
            return False
        if str(cache.get("narration_lang") or "") != str(self.narration_lang or ""):
            return False
        if str(cache.get("audience") or "") != str(self.audience or ""):
            return False
        if str(cache.get("english_level") or "") != str(self.english_level or ""):
            return False
        if int(cache.get("max_entries_per_minute") or 0) != int(self.max_entries_per_minute):
            return False
        if str(cache.get("model") or "") != str(self.model or ""):
            return False
        return True

    def _new_windows_cache(self, *, input_hash: str, profile_hash: str) -> Dict[str, Any]:
        return {
            "version": "1.0",
            "generator": "llm",
            "generated_at": datetime.utcnow().isoformat(),
            "input_hash": str(input_hash or ""),
            "profile_hash": str(profile_hash or ""),
            "window_size": float(self.window_size),
            "window_overlap": float(self.window_overlap),
            "model": str(self.model or ""),
            "narration_lang": str(self.narration_lang or ""),
            "audience": str(self.audience or ""),
            "english_level": str(self.english_level or ""),
            "max_entries_per_minute": int(self.max_entries_per_minute),
            "intro": {"status": "missing", "text": "", "error": ""},
            "windows": {},
        }
    
    async def generate(
        self,
        bundle: AnalysisBundle,
        *,
        profile_hash: str = "",
        course_title: Optional[str] = None,
        intro_subtitle_count: int = 6,
        reuse_cached_windows: bool = True,
        retry_failed_only: bool = False,
    ) -> SmartScript:
        """
        Generate SmartScript using LLM.
        
        Args:
            bundle: Analysis bundle
            profile_hash: User profile hash for caching
        
        Returns:
            SmartScript
        """
        logger.info("Generating LLM-based SmartScript")

        intro_title = str(course_title or "").strip()
        input_hash = V2CacheKeys.script_input_hash(
            subtitles=[s.to_dict() for s in bundle.subtitles],
            timeline_features=bundle.timeline_features.to_dict() if bundle.timeline_features else None,
            scenes=[s.to_dict() for s in bundle.scenes] if bundle.scenes else None,
            visual_features=[v.to_dict() for v in bundle.visual_features] if bundle.visual_features else None,
            speaker_map=(bundle.speaker_map.mappings if bundle.speaker_map else None),
        )

        events = self._event_builder.build(bundle, speaker_map=bundle.speaker_map)
        if not events:
            logger.warning("No events to process")
            return SmartScript(
                course_id=bundle.course_id,
                generator="llm",
                generated_at=datetime.utcnow().isoformat(),
                profile_hash=str(profile_hash or ""),
                input_hash=str(input_hash or ""),
            )

        windows = self._event_builder.to_sliding_windows(
            events,
            window_size=self.window_size,
            window_overlap=self.window_overlap,
        )
        logger.info(f"Processing {len(windows)} windows")

        cache_value: Optional[Dict[str, Any]] = None
        if reuse_cached_windows or retry_failed_only:
            cache_value = self._load_windows_cache()
        if not self._is_cache_compatible(cache_value, input_hash=str(input_hash or ""), profile_hash=str(profile_hash or "")):
            cache_value = self._new_windows_cache(input_hash=str(input_hash or ""), profile_hash=str(profile_hash or ""))
        cache = cache_value or {}

        cache["generated_at"] = datetime.utcnow().isoformat()
        windows_cache: Dict[str, Any] = dict(cache.get("windows") or {})

        all_entries: List[SmartScriptEntry] = []

        intro_cache = dict(cache.get("intro") or {})
        intro_status = str(intro_cache.get("status") or "missing")
        intro_text = str(intro_cache.get("text") or "")
        intro_should_try = True
        if retry_failed_only:
            intro_should_try = intro_status != "success"
        elif reuse_cached_windows and intro_status == "success" and str(intro_text or "").strip():
            intro_should_try = False

        if intro_should_try:
            try:
                intro_text = await self._generate_intro_text(
                    title=intro_title,
                    subtitles=bundle.subtitles,
                    count=int(intro_subtitle_count),
                )
                intro_cache = {"status": "success", "text": str(intro_text or "").strip(), "error": ""}
            except Exception as e:
                intro_cache = {"status": "failed", "text": "", "error": str(e)}
                intro_text = ""
            cache["intro"] = intro_cache
            self._save_windows_cache(cache)

        for i, window_events in enumerate(windows):
            key = str(i)
            existing = windows_cache.get(key)
            existing_dict = existing if isinstance(existing, dict) else None
            is_done = False
            if existing_dict is not None:
                is_done = (
                    str(existing_dict.get("status") or "") == "success"
                    and isinstance(existing_dict.get("entries"), list)
                )
            if (reuse_cached_windows or retry_failed_only) and is_done and not retry_failed_only:
                for d in list((existing_dict or {}).get("entries") or []):
                    if isinstance(d, dict):
                        all_entries.append(SmartScriptEntry.from_dict(d))
                continue
            if retry_failed_only and is_done:
                for d in list((existing_dict or {}).get("entries") or []):
                    if isinstance(d, dict):
                        all_entries.append(SmartScriptEntry.from_dict(d))
                continue

            start_time = min(e.time for e in window_events) if window_events else 0.0
            end_time = max(e.time + (e.duration or 0) for e in window_events) if window_events else start_time

            try:
                entries = await self._process_window(window_events, i)
                windows_cache[key] = {
                    "index": int(i),
                    "start_time": float(start_time),
                    "end_time": float(end_time),
                    "status": "success",
                    "entries": [e.to_dict() for e in entries],
                    "error": "",
                }
                all_entries.extend(entries)
            except Exception as e:
                windows_cache[key] = {
                    "index": int(i),
                    "start_time": float(start_time),
                    "end_time": float(end_time),
                    "status": "failed",
                    "entries": [],
                    "error": str(e),
                }
                logger.warning(f"Window {i} failed: {e}")
            cache["windows"] = windows_cache
            cache["generated_at"] = datetime.utcnow().isoformat()
            self._save_windows_cache(cache)

        intro_entry: Optional[SmartScriptEntry] = None
        if str(intro_text or "").strip():
            intro_ref: Dict[str, Any] = {"reason": "intro"}
            if bundle.subtitles:
                idxs = [
                    int(s.index)
                    for s in bundle.subtitles[: max(0, int(intro_subtitle_count))]
                    if s is not None
                ]
                if idxs:
                    intro_ref["subtitle_indexes"] = idxs
            intro_entry = SmartScriptEntry(
                time_in=0.0,
                action_type="pre_teach_pause",
                script=str(intro_text).strip(),
                ducking=False,
                estimated_duration=self._estimate_duration(str(intro_text).strip()),
                ref=intro_ref,
            )

        entries = self._postprocess_entries(all_entries, bundle=bundle, intro_entry=intro_entry)
        if not entries:
            failed = [
                int(k)
                for k, v in windows_cache.items()
                if isinstance(v, dict) and str(v.get("status") or "") == "failed"
            ]
            failed.sort()
            raise LLMScriptGenError(f"LLM returned empty script (failed_windows={failed})")

        for i, entry in enumerate(entries):
            entry.entry_id = f"llm_entry_{i:04d}"

        script = SmartScript(
            version="1.0",
            course_id=bundle.course_id,
            script_version="llm_v1",
            profile_hash=str(profile_hash or ""),
            input_hash=str(input_hash or ""),
            entries=entries,
            generated_at=datetime.utcnow().isoformat(),
            generator="llm",
        )

        logger.info(f"Generated {len(entries)} LLM script entries")
        return script

    def _estimate_duration(self, text: str) -> float:
        s = str(text or "").strip()
        if not s:
            return 0.0
        lang_key = str(self.narration_lang or "zh").strip().lower()
        if lang_key.startswith("zh"):
            cjk = sum(1 for ch in s if "\u4e00" <= ch <= "\u9fff")
            latin = sum(1 for ch in s if ("a" <= ch.lower() <= "z"))
            digits = sum(1 for ch in s if ch.isdigit())
            punc = sum(1 for ch in s if ch in "，。！？；：,.!?;:")
            base = (cjk / 6.3) + (latin / 18.0) + (digits / 6.0)
            base += 0.10 * punc
            return max(1.2, base)
        words = len(re.findall(r"[A-Za-z']+", s))
        punc = sum(1 for ch in s if ch in ",.!?;:")
        base = (words / 2.9) + 0.08 * punc
        return max(1.0, base)

    def _postprocess_entries(
        self,
        entries: List[SmartScriptEntry],
        *,
        bundle: AnalysisBundle,
        intro_entry: Optional[SmartScriptEntry],
    ) -> List[SmartScriptEntry]:
        cleaned: List[SmartScriptEntry] = []
        if intro_entry is not None and str(intro_entry.script or "").strip():
            intro_entry.estimated_duration = max(
                float(intro_entry.estimated_duration or 0.0),
                self._estimate_duration(str(intro_entry.script)),
            )
            intro_entry.time_in = max(0.0, float(intro_entry.time_in or 0.0))
            intro_entry.action_type = "pre_teach_pause"
            intro_entry.ducking = False
            cleaned.append(intro_entry)
        for e in entries or []:
            if not e:
                continue
            if str(e.action_type or "") not in {"pre_teach_pause", "gap_filling"}:
                continue
            if not str(e.script or "").strip():
                continue
            if float(getattr(e, "estimated_duration", 0.0) or 0.0) <= 0:
                e.estimated_duration = self._estimate_duration(str(e.script))
            else:
                e.estimated_duration = max(float(e.estimated_duration), self._estimate_duration(str(e.script)))
            e.time_in = max(0.0, float(e.time_in or 0.0))
            cleaned.append(e)

        cleaned = self._apply_timing_constraints(cleaned, bundle=bundle)
        cleaned = self._merge_close_pre_teach_entries(cleaned)
        selected = self._select_entries(cleaned, bundle=bundle)

        selected.sort(key=lambda e: float(e.time_in or 0.0))
        return selected

    def _merge_close_pre_teach_entries(self, entries: List[SmartScriptEntry]) -> List[SmartScriptEntry]:
        if not entries:
            return []
        merged: List[SmartScriptEntry] = []
        entries_sorted = sorted(entries, key=lambda e: float(e.time_in or 0.0))

        def merge_refs(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
            ra = dict(a or {})
            rb = dict(b or {})

            def merge_int_lists(key: str) -> None:
                va = ra.get(key)
                vb = rb.get(key)
                out: List[int] = []
                if isinstance(va, list):
                    for x in va:
                        try:
                            xi = int(x)
                        except Exception:
                            continue
                        if xi not in out:
                            out.append(xi)
                if isinstance(vb, list):
                    for x in vb:
                        try:
                            xi = int(x)
                        except Exception:
                            continue
                        if xi not in out:
                            out.append(xi)
                if out:
                    ra[key] = out

            merge_int_lists("subtitle_indexes")
            merge_int_lists("scene_ids")
            merge_int_lists("gap_after_indexes")

            if "reason" in rb and str(rb.get("reason") or "").strip():
                if "reason" not in ra or not str(ra.get("reason") or "").strip():
                    ra["reason"] = str(rb.get("reason")).strip()
                else:
                    r0 = str(ra.get("reason")).strip()
                    r1 = str(rb.get("reason")).strip()
                    if r1 not in r0:
                        ra["reason"] = (r0 + "；" + r1) if str(self.narration_lang or "zh").startswith("zh") else (r0 + "; " + r1)
            return ra

        max_dt = 6.0
        for e in entries_sorted:
            if not merged:
                merged.append(e)
                continue
            prev = merged[-1]
            prev_reason = str(dict(prev.ref or {}).get("reason") or "").strip().lower()
            cur_reason = str(dict(e.ref or {}).get("reason") or "").strip().lower()
            if (
                str(prev.action_type) == "pre_teach_pause"
                and str(e.action_type) == "pre_teach_pause"
                and (float(e.time_in or 0.0) - float(prev.time_in or 0.0)) <= max_dt
                and prev_reason != "intro"
                and cur_reason != "intro"
            ):
                sep = "。"
                if str(self.narration_lang or "zh").strip().lower().startswith("en"):
                    sep = ". "
                combined = self._sanitize_script_text(str(prev.script).strip() + sep + str(e.script).strip())
                if combined:
                    prev.script = combined
                    prev.estimated_duration = max(float(prev.estimated_duration or 0.0), self._estimate_duration(combined))
                    prev.ref = merge_refs(dict(prev.ref or {}), dict(e.ref or {}))
                continue
            merged.append(e)
        return merged

    def _apply_timing_constraints(
        self,
        entries: List[SmartScriptEntry],
        *,
        bundle: AnalysisBundle,
    ) -> List[SmartScriptEntry]:
        subtitles = list(bundle.subtitles or [])
        subs_by_idx = {int(s.index): s for s in subtitles if s is not None}
        subtitles_by_time = sorted(
            [s for s in subtitles if s is not None],
            key=lambda s: (float(s.start_time), float(s.end_time), int(s.index)),
        )
        gaps = list(getattr(bundle.timeline_features, "gaps", []) or [])
        gap_by_after = {int(g.after_index): g for g in gaps if g is not None}
        diar = sorted(
            [d for d in (bundle.diarization or []) if d is not None],
            key=lambda d: (float(d.start_time), float(d.end_time)),
        )

        total_duration = 0.0
        if subtitles_by_time:
            total_duration = max(total_duration, max(float(s.end_time) for s in subtitles_by_time))
        if diar:
            total_duration = max(total_duration, max(float(d.end_time) for d in diar))
        if bundle.scenes:
            total_duration = max(total_duration, max(float(s.end_time) for s in bundle.scenes))

        def coerce_int_list(v: Any) -> List[int]:
            if isinstance(v, list):
                out = []
                for x in v:
                    try:
                        out.append(int(x))
                    except Exception:
                        continue
                return out
            return []

        def find_gap_containing_time(t: float) -> Optional[Any]:
            for g in gaps:
                if g is None:
                    continue
                if float(g.start_time) <= t <= float(g.end_time):
                    return g
            return None

        def find_next_subtitle(t: float) -> Optional[Any]:
            for s in subtitles_by_time:
                if float(s.start_time) >= t:
                    return s
            return None

        def overlaps_subtitles(start_t: float, end_t: float) -> bool:
            if end_t <= start_t:
                return False
            pad = 0.05
            for s in subtitles_by_time:
                s0 = float(s.start_time) - pad
                s1 = float(s.end_time) + pad
                if start_t < s1 and end_t > s0:
                    return True
                if s0 > end_t:
                    break
            return False

        def downgrade_to_pause(e: SmartScriptEntry, ref: Dict[str, Any], target_sub: Optional[Any]) -> SmartScriptEntry:
            if target_sub is not None:
                e.time_in = max(0.0, float(target_sub.start_time) - 0.4)
            e.action_type = "pre_teach_pause"
            e.ducking = False
            e.ref = ref
            return e

        def merge_spans(spans: List[tuple[float, float]]) -> List[tuple[float, float]]:
            if not spans:
                return []
            spans_sorted = sorted(spans, key=lambda x: (x[0], x[1]))
            out: List[tuple[float, float]] = [spans_sorted[0]]
            for s0, s1 in spans_sorted[1:]:
                p0, p1 = out[-1]
                if s0 <= p1:
                    out[-1] = (p0, max(p1, s1))
                else:
                    out.append((s0, s1))
            return out

        silence_spans: List[tuple[float, float]] = []
        if diar and total_duration > 0:
            pad = 0.12
            speech = merge_spans(
                [
                    (max(0.0, float(d.start_time) - pad), min(float(total_duration), float(d.end_time) + pad))
                    for d in diar
                    if float(d.end_time) > float(d.start_time)
                ]
            )
            cursor = 0.0
            for s0, s1 in speech:
                if s0 > cursor:
                    silence_spans.append((cursor, s0))
                cursor = max(cursor, s1)
            if cursor < float(total_duration):
                silence_spans.append((cursor, float(total_duration)))

        def intersect(a0: float, a1: float, b0: float, b1: float) -> Optional[tuple[float, float]]:
            x0 = max(a0, b0)
            x1 = min(a1, b1)
            if x1 <= x0:
                return None
            return (x0, x1)

        def usable_silence_within(
            *,
            window_start: float,
            window_end: float,
            prefer_t: float,
            required_dur: float,
        ) -> Optional[tuple[float, float]]:
            if window_end <= window_start:
                return None
            if not silence_spans:
                return None
            candidates: List[tuple[float, float]] = []
            for s0, s1 in silence_spans:
                inter = intersect(window_start, window_end, s0, s1)
                if inter is None:
                    continue
                if (inter[1] - inter[0]) >= required_dur:
                    candidates.append(inter)
            if not candidates:
                return None
            for c0, c1 in candidates:
                if c0 <= prefer_t <= c1:
                    return (c0, c1)
            return min(candidates, key=lambda c: abs(((c[0] + c[1]) * 0.5) - prefer_t))

        out: List[SmartScriptEntry] = []
        for e in entries:
            ref = dict(e.ref or {})
            subtitle_indexes = coerce_int_list(ref.get("subtitle_indexes"))
            gap_after_indexes = coerce_int_list(ref.get("gap_after_indexes"))

            if str(e.action_type) == "gap_filling":
                gap = None
                if gap_after_indexes:
                    gap = gap_by_after.get(int(gap_after_indexes[0]))
                if gap is None:
                    if subtitle_indexes:
                        gap = gap_by_after.get(int(subtitle_indexes[0]) - 1)
                    if gap is None:
                        gap = find_gap_containing_time(float(e.time_in))

                target_sub = None
                if gap is not None:
                    target_sub = subs_by_idx.get(int(getattr(gap, "after_index", -1)) + 1)
                if target_sub is None and subtitle_indexes:
                    target_sub = subs_by_idx.get(int(subtitle_indexes[0]))
                if target_sub is None:
                    target_sub = find_next_subtitle(float(e.time_in))

                if gap is None:
                    out.append(downgrade_to_pause(e, ref, target_sub))
                    continue

                prev_sub = subs_by_idx.get(int(getattr(gap, "after_index", -1)))
                next_sub = subs_by_idx.get(int(getattr(gap, "after_index", -1)) + 1)
                if prev_sub is None or next_sub is None:
                    out.append(downgrade_to_pause(e, ref, target_sub))
                    continue

                gap_start = max(float(gap.start_time), float(prev_sub.end_time))
                gap_end = min(float(gap.end_time), float(next_sub.start_time))
                if gap_end <= gap_start:
                    out.append(downgrade_to_pause(e, ref, target_sub))
                    continue

                dur = max(0.0, float(e.estimated_duration or 0.0))
                gap_len = max(0.0, gap_end - gap_start)
                if gap_len <= dur + 0.02:
                    out.append(downgrade_to_pause(e, ref, target_sub))
                    continue
                slack = max(0.0, gap_len - dur)
                pad = min(0.35, max(0.12, slack * 0.25))
                guard = min(0.10, max(0.05, slack * 0.05))

                if silence_spans:
                    needed = dur + 2.0 * (0.12 + 0.05)
                    silence = usable_silence_within(
                        window_start=gap_start,
                        window_end=gap_end,
                        prefer_t=float(e.time_in),
                        required_dur=needed,
                    )
                    if silence is None:
                        out.append(downgrade_to_pause(e, ref, target_sub))
                        continue
                    gap_start, gap_end = silence

                earliest = gap_start + pad + guard
                latest = gap_end - pad - guard - dur
                if latest + 1e-6 < earliest:
                    out.append(downgrade_to_pause(e, ref, target_sub))
                    continue

                t = min(max(float(e.time_in), earliest), latest)
                if overlaps_subtitles(t, t + dur):
                    out.append(downgrade_to_pause(e, ref, target_sub))
                    continue

                e.time_in = t
                e.ducking = True
                if not gap_after_indexes:
                    ref["gap_after_indexes"] = [int(getattr(gap, "after_index", 0))]
                e.ref = ref
                out.append(e)
                continue

            if str(e.action_type) == "pre_teach_pause":
                target_sub = None
                if subtitle_indexes:
                    target_sub = subs_by_idx.get(int(subtitle_indexes[0]))
                if target_sub is not None and float(e.time_in) > float(target_sub.start_time):
                    e.time_in = max(0.0, float(target_sub.start_time) - 0.4)
                e.ducking = False
                e.ref = ref
                out.append(e)
                continue

            out.append(e)

        return out

    def _select_entries(
        self,
        entries: List[SmartScriptEntry],
        *,
        bundle: AnalysisBundle,
    ) -> List[SmartScriptEntry]:
        if not entries:
            return []

        total_duration = 0.0
        if bundle.subtitles:
            total_duration = max(float(s.end_time) for s in bundle.subtitles)
        if bundle.scenes:
            total_duration = max(total_duration, max(float(s.end_time) for s in bundle.scenes))

        if total_duration <= 0:
            return sorted(entries, key=lambda e: float(e.time_in or 0.0))[:10]

        max_entries = int(total_duration / 60.0 * int(self.max_entries_per_minute))
        max_entries = max(3, min(max_entries, len(entries)))

        def rank(e: SmartScriptEntry) -> float:
            action = str(e.action_type)
            if action == "pre_teach_pause":
                base = 1.6
            elif action == "gap_filling":
                base = 1.4
            else:
                base = 1.0
            r = dict(e.ref or {})
            if str(r.get("reason") or "").strip().lower() == "intro":
                base += 2.5
            if isinstance(r.get("subtitle_indexes"), list) and r.get("subtitle_indexes"):
                base += 0.1
            if str(e.action_type) == "gap_filling" and isinstance(r.get("gap_after_indexes"), list) and r.get("gap_after_indexes"):
                base += 0.05
            base += min(0.2, float(e.estimated_duration or 0.0) / 20.0)
            return base

        def min_gap_for(e: SmartScriptEntry) -> float:
            d = float(e.estimated_duration or 0.0)
            if str(e.action_type) == "pre_teach_pause":
                return max(6.0, d + 2.5)
            return max(2.5, d + 0.8)

        def required_gap(a: SmartScriptEntry, b: SmartScriptEntry) -> float:
            ga = min_gap_for(a)
            gb = min_gap_for(b)
            if str(a.action_type) == "gap_filling" or str(b.action_type) == "gap_filling":
                return max(2.0, min(ga, gb))
            return max(ga, gb)

        intro_entries = [e for e in entries if str(dict(e.ref or {}).get("reason") or "").strip().lower() == "intro"]
        intro_entries.sort(key=lambda e: float(e.time_in or 0.0))
        intro = intro_entries[0] if intro_entries else None

        pool = [e for e in entries if e is not intro]
        target_count = min(len(entries), max_entries + (1 if intro is not None else 0))

        chosen: List[SmartScriptEntry] = []
        if intro is not None:
            chosen.append(intro)

        for e in sorted(pool, key=lambda x: (-rank(x), float(x.time_in or 0.0))):
            ok = True
            for c in chosen:
                dt = abs(float(e.time_in or 0.0) - float(c.time_in or 0.0))
                if dt < required_gap(e, c):
                    ok = False
                    break
            if ok:
                chosen.append(e)
                if len(chosen) >= target_count:
                    break

        chosen.sort(key=lambda e: float(e.time_in or 0.0))
        return chosen

    def _level_profile(self) -> Dict[str, str]:
        k = str(self.english_level or "").strip().lower()
        if k.startswith("cefr:"):
            cefr = k.split(":", 1)[1].strip().upper()
            if cefr == "A0":
                return {"key": k, "zh": "A0 入门", "en": "CEFR A0 (starter)"}
            return {"key": k, "zh": f"CEFR {cefr}", "en": f"CEFR {cefr}"}

        if k.startswith("cn:"):
            parts = k.split(":")
            if len(parts) >= 2 and parts[1] == "k0":
                return {"key": k, "zh": "幼儿启蒙", "en": "kids (starter)"}
            if len(parts) >= 3 and parts[1] == "primary":
                return {"key": k, "zh": f"小学{parts[2]}年级", "en": f"primary grade {parts[2]}"}
            if len(parts) >= 3 and parts[1] == "middle":
                return {"key": k, "zh": f"初中{parts[2]}年级", "en": f"middle school grade {parts[2]}"}
            if len(parts) >= 3 and parts[1] == "high":
                return {"key": k, "zh": f"高中{parts[2]}年级", "en": f"high school grade {parts[2]}"}
            if len(parts) >= 2 and parts[1] == "cet4":
                return {"key": k, "zh": "大学英语四级", "en": "CET-4"}
            if len(parts) >= 2 and parts[1] == "cet6":
                return {"key": k, "zh": "大学英语六级", "en": "CET-6"}
            return {"key": k, "zh": "国内标准", "en": "CN level"}

        return {"key": k or "intermediate", "zh": str(self.english_level or "中级"), "en": str(self.english_level or "intermediate")}

    def _focus_profile(self) -> Dict[str, str]:
        level_key = str(self.english_level or "").strip().lower()
        audience_key = str(self.audience or "adult").strip().lower()

        if audience_key == "child":
            if level_key.startswith("cn:k0") or level_key.startswith("cefr:a0") or level_key.startswith("cefr:a1") or level_key.startswith("cefr:a2") or level_key.startswith("cn:primary:1"):
                return {
                    "zh": "重点：用很简单的中文讲清楚发生了什么；每次只点出1个关键英文词/短语。要像讲故事一样有趣：可以提一个小问题、让孩子猜一猜、或邀请跟读1次。",
                    "en": "Focus: explain what is happening and the gist in very simple words; mention at most one key phrase.",
                }
            return {
                "zh": "重点：鼓励语气，解释关键词和句子意思；避免逐句直译。可以加入小互动：找关键词、猜下一句、跟读短语。",
                "en": "Focus: encouraging tone; explain key words and meaning, optionally bilingual.",
            }

        if level_key.startswith("cefr:") and any(level_key.endswith(x) for x in ("a0", "a1", "a2")):
            return {
                "zh": "重点：更偏理解与释义，少讲术语；给出简短的英文片段并配中文解释。",
                "en": "Focus: comprehension-first; short quotes and plain explanation.",
            }
        if level_key.startswith("cefr:") and any(level_key.endswith(x) for x in ("c1", "c2")):
            return {
                "zh": "重点：更偏细微语气、习惯用法、文化梗；减少直译。",
                "en": "Focus: nuance, idioms, cultural references; avoid basic translation.",
            }
        if level_key in {"cn:cet6"} or level_key.startswith("cn:cet6"):
            return {
                "zh": "重点：挑高价值点（俚语/语气/反讽/隐含意思），少做逐句翻译。",
                "en": "Focus: high-value nuance; avoid line-by-line translation.",
            }
        return {
            "zh": '重点：解释难点与关键词；必要时给出"英文片段 + 中文意思"。',
            "en": "Focus: explain tricky points; use short quote + meaning when helpful.",
        }

    def _build_direction_constraints(self) -> Dict[str, str]:
        """Build direction constraint text based on directives."""
        if not self.directives or not self.directives.directions:
            return {"zh": "", "en": ""}
        
        directions = self.directives.directions
        direction_labels_zh = []
        direction_labels_en = []
        
        for d in directions:
            label = DIRECTION_TYPES.get(d, d)
            direction_labels_zh.append(label)
            # Map to English labels
            en_labels = {
                "english_vocab": "English vocabulary/grammar/pronunciation",
                "plot_summary": "Plot summary/turning points",
                "knowledge_point": "Subject knowledge/concepts",
                "culture_bg": "Cultural background/idioms",
                "summary_recap": "Summary/key points recap",
            }
            direction_labels_en.append(en_labels.get(d, d))
        
        zh_text = f"解说方向约束：本次解说必须围绕以下方向展开：{', '.join(direction_labels_zh)}。不要涉及其他无关方向。"
        en_text = f"Direction constraint: Focus commentary on: {', '.join(direction_labels_en)}. Do not cover unrelated topics."
        
        return {"zh": zh_text, "en": en_text}

    def _build_widget_instructions(self) -> Dict[str, str]:
        """Build widget output instructions."""
        zh_text = """
Widget 输出（可选）：
对于特别重要或复杂的解说点，可以输出结构化 widget：
- widget.widget_type: "explain_card" 或 "qa_card"
- widget.title: 简短标题（2-8字）
- widget.body: 结构化内容

explain_card 的 body 结构：
{
  "tldr": "一句话总结",
  "bullets": ["要点1", "要点2"]
}

qa_card 的 body 结构：
{
  "question": "问题",
  "options": ["A选项", "B选项", "C选项"],
  "answer": 0,
  "explanation": "解析"
}

注意：widget 是可选的，只在需要结构化展示时使用。大多数解说用纯 script 即可。"""

        en_text = """
Widget output (optional):
For important or complex points, output structured widget:
- widget.widget_type: "explain_card" or "qa_card"
- widget.title: short title (2-6 words)
- widget.body: structured content

explain_card body:
{
  "tldr": "one-line summary",
  "bullets": ["point 1", "point 2"]
}

qa_card body:
{
  "question": "question text",
  "options": ["A", "B", "C"],
  "answer": 0,
  "explanation": "explanation"
}

Note: widget is optional. Use plain script for most commentary."""

        return {"zh": zh_text, "en": en_text}

    def _sanitize_script_text(self, text: str) -> str:
        lang_key = str(self.narration_lang or "zh").strip().lower()
        s = unicodedata.normalize("NFKC", str(text or ""))
        s = s.replace("\r\n", "\n").replace("\r", "\n")
        s = _EMOJI_RE.sub("", s)
        s = s.translate(
            str.maketrans(
                {
                    "“": '"',
                    "”": '"',
                    "‘": "'",
                    "’": "'",
                    "—": "，",
                    "–": "，",
                    "（": "",
                    "）": "",
                    "【": "",
                    "】": "",
                    "《": "",
                    "》": "",
                    "～": "，",
                    "〜": "，",
                    "\u00a0": " ",
                    "\u200b": "",
                    "\u200c": "",
                    "\u200d": "",
                    "\ufeff": "",
                }
            )
        )
        s = s.replace('"', "").replace("'", "")
        s = "".join(ch for ch in s if (unicodedata.category(ch)[0] != "C") or ch in {"\n", "\t"})
        s = re.sub(r"[`*_#{}\[\]|<>]+", " ", s)
        s = re.sub(r"\s*(?:=|=>|->|→)\s*", "，", s)
        s = re.sub(r"[ \t]+", " ", s)
        s = re.sub(r"\n+", " ", s)
        s = re.sub(r"([,.;:!?])\1{2,}", r"\1\1", s)
        s = s.strip()
        max_len = 512 if lang_key.startswith("zh") else 1024
        if max_len > 0 and len(s) > max_len:
            boundaries = "。！？.!?"
            cut = -1
            for b in boundaries:
                p = s.rfind(b, 0, max_len)
                if p > cut:
                    cut = p
            if cut >= int(max_len * 0.6):
                s = s[: cut + 1].strip()
            else:
                s = s[:max_len].rstrip(" ,.;:!?，。！？；：")
        return s

    async def _generate_intro_text(self, *, title: str, subtitles: List[Any], count: int) -> str:
        lang_key = str(self.narration_lang or "zh").strip().lower()
        audience_key = str(self.audience or "adult").strip().lower()
        level = self._level_profile()
        focus = self._focus_profile()

        subtitle_lines: List[str] = []
        for s in (subtitles or [])[: max(0, int(count))]:
            try:
                idx = int(getattr(s, "index", 0))
                txt = str(getattr(s, "text", "") or "").strip()
            except Exception:
                continue
            if txt:
                subtitle_lines.append(f"[SUB#{idx}] {txt}")

        title_line = f"Title: {title}\n" if title else ""
        subs_block = "\n".join(subtitle_lines).strip()

        if lang_key.startswith("en"):
            tone = (
                "Very warm, playful, and curiosity-driven; use a kid-friendly greeting and light interjections."
                if audience_key == "child"
                else "Energetic, slightly humorous, and confident; avoid cringe."
            )
            sys_prompt = (
                "You write a short opening narration for an English-learning video.\n"
                f"Audience: {'kids' if audience_key == 'child' else 'adults'}.\n"
                f"Tone: {tone}\n"
                f"Level: {level.get('en','')}\n"
                f"{focus.get('en','')}\n"
                "Rules:\n"
                "- 2 to 4 sentences.\n"
                "- Do not paraphrase the subtitles line-by-line; use them only as context.\n"
                "- Do not spoil content beyond the provided opening subtitles.\n"
                "- Do not add emojis, emoticons, markdown, or special symbols.\n"
                "- Do not introduce topics not grounded in the provided subtitles.\n"
                "- Keep it TTS-friendly: plain text, simple punctuation.\n"
                "- Output plain text only.\n"
            )
            user_prompt = (
                f"{title_line}"
                f"Opening subtitles:\n{subs_block}\n\n"
                "Write the opening narration now."
            )
        else:
            tone = (
                "非常亲切、有趣、兴趣引导，适当加入语气词/拟声词/提问句。"
                if audience_key == "child"
                else "更幽默或更有激情一点，但要克制，不要尬。"
            )
            sys_prompt = (
                "你要为英语学习视频写一段简短的解说开场白。\n"
                f"受众：{'小朋友' if audience_key == 'child' else '成人'}。\n"
                f"风格：{tone}\n"
                f"水平：{level.get('zh','')}\n"
                f"{focus.get('zh','')}\n"
                "规则：\n"
                "- 2~4 句。\n"
                "- 不要逐句翻译/复述开头字幕，只做引导和兴趣钩子。\n"
                "- 不能剧透，只能基于标题与开头字幕做引导。\n"
                "- 不要 emoji/颜文字/markdown/特殊符号（比如 🌟✨～——）。\n"
                "- 不要引入输入里没有的话题与例子（不要泛泛聊人生）。\n"
                "- 文本要适配 TTS：口语化短句，用常用标点。\n"
                "- 只输出纯文本。\n"
            )
            title_prefix = f"标题：{title}\n" if title else ""
            user_prompt = (
                f"{title_prefix}"
                f"开头字幕：\n{subs_block}\n\n"
                "请写开场白。"
            )

        resp = await host.ai.chat(
            messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": user_prompt}],
            model=self.model,
            temperature=0.4,
        )
        if resp.get("status") != "success":
            raise LLMScriptGenError(str(resp.get("message") or "intro llm failed"))
        return self._sanitize_script_text(str(resp.get("content", "") or ""))
    
    async def _process_window(
        self,
        events: List[UnifiedEvent],
        window_index: int,
    ) -> List[SmartScriptEntry]:
        """
        Process a single window with LLM.
        
        Args:
            events: Events in this window
            window_index: Window index for logging
        
        Returns:
            List of SmartScriptEntry
        """
        if not events:
            return []
        
        start_time = min(e.time for e in events)
        end_time = max(e.time + (e.duration or 0) for e in events)
        
        # Build events text
        events_text = self._event_builder.to_llm_input(events)
        
        sys_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(start_time=start_time, end_time=end_time, events_text=events_text)
        
        try:
            response = await host.ai.chat(
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=self.model,
                temperature=0.3,
            )
            if response.get("status") != "success":
                raise LLMScriptGenError(f"LLM call failed: {response.get('message')}")

            content = response.get("content", "")
            entries = self._parse_llm_response(content)
            logger.debug(f"Window {window_index}: generated {len(entries)} entries")
            return entries
        except LLMScriptGenError:
            raise
        except Exception as e:
            raise LLMScriptGenError(f"LLM call failed for window {window_index}: {e}") from e

    def _build_system_prompt(self) -> str:
        lang_key = str(self.narration_lang or "zh").strip().lower()
        audience_key = str(self.audience or "adult").strip().lower()
        level = self._level_profile()
        focus = self._focus_profile()
        direction_constraints = self._build_direction_constraints()
        widget_instructions = self._build_widget_instructions()

        if lang_key.startswith("en"):
            audience_desc = "adult learners" if audience_key != "child" else "kids"
            style = (
                "very warm, playful, and curiosity-driven; add light interjections"
                if audience_key == "child"
                else "witty or energetic, but concise and respectful"
            )
            level_desc = str(level.get("en") or "intermediate (B1-B2)")
            max_per_min = max(1, min(3, int(self.max_entries_per_minute)))
            
            direction_text = direction_constraints.get("en", "")
            direction_section = f"\n{direction_text}\n" if direction_text else ""
            widget_text = widget_instructions.get("en", "")
            
            return (
                "You are an English learning companion that adds short, well-timed commentary while the learner watches an English video.\n\n"
                "Your goal: decide where to pause (or fill gaps) and generate concise guidance.\n\n"
                f"Target audience: {audience_desc}. Tone: {style}.\n"
                f"Learner level: {level_desc}.\n\n"
                f"{focus.get('en','')}\n"
                f"{direction_section}\n"
                "Quality bar:\n"
                "- Do NOT just translate or rephrase the subtitles. Each entry must add learning value.\n"
                "- Vary your angle: phrase meaning, grammar pitfall, pronunciation/connected speech, or a quick comprehension question.\n"
                "- For kids: keep it playful and story-like; ask a tiny question or invite repeating one keyword.\n\n"
                "Action types:\n"
                '1) pre_teach_pause - pause BEFORE a difficult/important line to pre-teach key points\n'
                '2) gap_filling - short commentary during silence without stopping the video (ducking audio)\n'
                '3) ignore - no commentary\n\n'
                "Output: a JSON array. Each item must contain:\n"
                '- time_in (seconds)\n'
                '- action_type ("pre_teach_pause" | "gap_filling" | "ignore")\n'
                "- script (in English)\n"
                "- ducking (true for gap_filling)\n"
                "- estimated_duration (seconds)\n"
                "- ref (object)\n"
                "- widget (optional object for structured display)\n\n"
                "ref rules:\n"
                "- ref is for traceability. It MUST explain which input event(s) this entry refers to.\n"
                "- Use these fields when relevant:\n"
                '  - subtitle_indexes: number[] (from input lines like [SUB#12 ...])\n'
                '  - scene_ids: number[] (from input lines like [VISUAL#3 ...])\n'
                '  - gap_after_indexes: number[] (from input lines like [GAP(after#12) ...])\n'
                "  - reason: string (why you placed commentary here)\n"
                "- Each entry must include at least one of subtitle_indexes/scene_ids/gap_after_indexes.\n"
                f"{widget_text}\n\n"
                f"Constraints:\n- Do not over-interrupt. Aim for at most {max_per_min} commentary points per minute.\n"
                "- Keep each script under ~2 sentences.\n"
                "- No emojis, emoticons, markdown, or special symbols.\n"
                "- Do not introduce topics not grounded in the provided events.\n"
                "- Keep scripts TTS-friendly: plain text, simple punctuation.\n"
                "- Prioritize idioms, grammar pitfalls, cultural references, and fast speech.\n"
                "- For advanced learners, skip easy lines and focus only on high-value points.\n"
                "- Use gap_filling only if there is a [GAP(after#...)] event with enough duration; keep it very short.\n"
                "- Return only JSON."
            )

        audience_desc = "成人学习者" if audience_key != "child" else "小朋友"
        style = (
            "非常亲切、有趣、兴趣引导，适当加入语气词/拟声词/提问句"
            if audience_key == "child"
            else "更幽默或更有激情一点，但要克制"
        )
        level_desc = str(level.get("zh") or "中级")
        max_per_min = max(1, min(3, int(self.max_entries_per_minute)))
        
        direction_text = direction_constraints.get("zh", "")
        direction_section = f"\n{direction_text}\n" if direction_text else ""
        widget_text = widget_instructions.get("zh", "")
        
        return (
            "你是一个英语学习助手，会在学习者观看英语视频时插入简短解说。\n\n"
            "你的目标：根据字幕与场景信息，决定在哪些时间点需要暂停或插入解说，并生成简洁的解说文本。\n\n"
            f"受众：{audience_desc}。语气：{style}。\n"
            f"英语水平：{level_desc}。\n\n"
            f"{focus.get('zh','')}\n"
            f"{direction_section}\n"
            "质量要求：\n"
            "- 不要逐句翻译或复述字幕。每条解说必须带来额外价值（解释一个点/提醒一个坑/提一个小问题）。\n"
            "- 角度要变化：短语含义、语法/用法、连读/发音、文化点、快速理解小提问。\n"
            "- 如果受众是小朋友：更像讲故事，适当加入语气词/拟声词/提问句，或邀请跟读一个关键词。\n\n"
            "解说类型：\n"
            "1) pre_teach_pause - 在复杂或重要内容之前暂停，提前解释难点\n"
            "2) gap_filling - 在对话间隙插入短解说，不打断播放（需要压低原声）\n"
            "3) ignore - 不需要解说\n\n"
            "输出格式：JSON 数组，每个元素包含：\n"
            "- time_in: 触发时间（秒）\n"
            '- action_type: "pre_teach_pause" | "gap_filling" | "ignore"\n'
            "- script: 解说文本（中文）\n"
            "- ducking: gap_filling 时为 true\n"
            "- estimated_duration: 预估时长（秒）\n"
            "- ref: 参考信息对象\n"
            "- widget: 可选，结构化展示对象\n\n"
            "ref 规则：\n"
            "- ref 用于可追溯性，必须说明这条解说对应哪些输入事件。\n"
            "- 如有需要，请填写：\n"
            "  - subtitle_indexes: number[]（来自输入行，如 [SUB#12 ...]）\n"
            "  - scene_ids: number[]（来自输入行，如 [VISUAL#3 ...]）\n"
            "  - gap_after_indexes: number[]（来自输入行，如 [GAP(after#12) ...]）\n"
            "  - reason: string（为什么这里需要解说）\n"
            "- 每条解说必须至少填写 subtitle_indexes/scene_ids/gap_after_indexes 其中一个。\n"
            f"{widget_text}\n\n"
            f"约束：\n- 不要过度打断，每分钟最多 {max_per_min} 个解说点。\n"
            "- 每条解说尽量控制在 50 字以内。\n"
            "- 不要 emoji/颜文字/markdown/特殊符号（比如 🌟✨～——）。\n"
            "- 不要引入输入里没有的话题与例子，不要泛泛聊人生。\n"
            "- 文本要适配 TTS：口语化短句，用常用标点。\n"
            "- 优先解释俚语/习惯用法、语法难点、文化背景、快速连读。\n"
            "- 高级水平要跳过简单内容，只挑高价值点。\n"
            "- gap_filling 仅在有足够间隙时使用（必须能放得下你的 estimated_duration）。\n"
            "- 只输出 JSON，不要其他内容。"
        )

    def _build_user_prompt(self, *, start_time: float, end_time: float, events_text: str) -> str:
        lang_key = str(self.narration_lang or "zh").strip().lower()
        if lang_key.startswith("en"):
            return (
                f"Events for this clip (time range {start_time:.0f}s - {end_time:.0f}s):\n\n"
                f"{events_text}\n\n"
                "Generate the commentary plan as JSON array only."
            )
        return (
            f"以下是视频片段的事件列表（时间范围 {start_time:.0f}s - {end_time:.0f}s）：\n\n"
            f"{events_text}\n\n"
            "请生成解说脚本。只输出 JSON 数组，不要其他内容。"
        )
    
    def _parse_llm_response(
        self,
        content: str,
    ) -> List[SmartScriptEntry]:
        """
        Parse LLM response into script entries.
        
        Args:
            content: Raw LLM response
        
        Returns:
            List of SmartScriptEntry
        """
        entries = []
        
        try:
            def strip_fences(s: str) -> str:
                t = str(s or "").strip()
                if "```" not in t:
                    return t
                start = t.find("```")
                if start == -1:
                    return t
                t2 = t[start + 3 :]
                nl = t2.find("\n")
                if nl != -1:
                    t2 = t2[nl + 1 :]
                end = t2.rfind("```")
                if end != -1:
                    t2 = t2[:end]
                return t2.strip()

            def normalize_action_type(v: Any) -> str:
                s = str(v or "").strip().lower()
                s = s.replace("-", "_").replace(" ", "_")
                if s in {"pre_teach_pause", "gap_filling", "ignore"}:
                    return s
                return ""

            def coerce_ref(v: Any) -> Dict[str, Any]:
                if isinstance(v, dict):
                    return dict(v)
                return {}

            def to_float(v: Any, default: float) -> float:
                try:
                    return float(v)
                except Exception:
                    return float(default)

            def parse_widget(v: Any) -> Optional[WidgetPayload]:
                """Parse widget from LLM response."""
                if not isinstance(v, dict):
                    return None
                widget_type = str(v.get("widget_type", "")).strip()
                if not widget_type:
                    return None
                # Validate widget_type
                valid_types = {"explain_card", "qa_card", "graph", "mindmap", "steps_card"}
                if widget_type not in valid_types:
                    return None
                title = str(v.get("title", ""))
                body = v.get("body", {})
                if not isinstance(body, dict):
                    body = {}
                return WidgetPayload(
                    widget_type=widget_type,
                    title=title,
                    body=body,
                )

            data = json.loads(strip_fences(content))
            
            if not isinstance(data, list):
                data = [data]
            
            for item in data:
                if not isinstance(item, dict):
                    continue
                
                action_type = normalize_action_type(item.get("action_type", "ignore"))
                if not action_type or action_type == "ignore":
                    continue
                
                if "ducking" in item:
                    ducking = bool(item.get("ducking"))
                else:
                    ducking = action_type == "gap_filling"

                # Parse optional widget
                widget = parse_widget(item.get("widget"))

                entry = SmartScriptEntry(
                    time_in=to_float(item.get("time_in", 0), 0.0),
                    action_type=action_type,
                    script=self._sanitize_script_text(str(item.get("script", ""))),
                    ducking=ducking,
                    estimated_duration=to_float(item.get("estimated_duration", 2.0), 2.0),
                    ref=coerce_ref(item.get("ref")),
                    widget=widget,
                )
                
                if entry.script:
                    entries.append(entry)
            
        except json.JSONDecodeError as e:
            raise LLMScriptGenError(f"Failed to parse LLM response: {e}") from e
        
        return entries
    
    def _deduplicate_entries(self, entries: List[SmartScriptEntry]) -> List[SmartScriptEntry]:
        return list(entries or [])
    
    async def save_script(self, script: SmartScript) -> None:
        """Save script to disk."""
        self.paths.ensure_dirs()
        self.paths.smart_script_json.write_text(
            script.to_json(),
            encoding="utf-8",
        )
    
    def load_script(self) -> Optional[SmartScript]:
        """Load script from disk."""
        if not self.paths.smart_script_json.exists():
            return None
        
        try:
            return SmartScript.from_json(
                self.paths.smart_script_json.read_text(encoding="utf-8")
            )
        except Exception:
            return None
