from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional

from course.models import Course, Segment, SegmentStatus
from storage.schema_v1 import _coach_narration_node_id, _coach_practice_node_id, _segment_id

logger = logging.getLogger("echoflow.services.planner")


@dataclass(frozen=True)
class StrategyConfig:
    narration_lang: str
    practice_mode: str
    practice_every_n: int
    practice_difficulty_max: float
    practice_max_token_count: int
    enable_plot: bool
    enable_translation: bool
    enable_vocab: bool
    enable_grammar: bool
    plot_every_n_practice: int
    translation_every_n_practice: int
    vocab_min_difficulty: float
    grammar_min_token_count: int


def _get_bool(cfg: dict[str, Any], key: str, default: bool) -> bool:
    v = cfg.get(key, default)
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    if s in {"1", "true", "yes", "y", "on"}:
        return True
    if s in {"0", "false", "no", "n", "off"}:
        return False
    return bool(default)


def _get_int(cfg: dict[str, Any], key: str, default: int, *, lo: int, hi: int) -> int:
    try:
        v = int(cfg.get(key, default))
    except Exception:
        v = int(default)
    return max(int(lo), min(int(hi), int(v)))


def _get_float(cfg: dict[str, Any], key: str, default: float, *, lo: float, hi: float) -> float:
    try:
        v = float(cfg.get(key, default))
    except Exception:
        v = float(default)
    return float(max(float(lo), min(float(hi), float(v))))


def parse_strategy_config(config_json: Any) -> StrategyConfig:
    cfg = config_json if isinstance(config_json, dict) else {}
    narrations_value = cfg.get("narrations")
    practice_value = cfg.get("practice")
    narrations = narrations_value if isinstance(narrations_value, dict) else {}
    practice = practice_value if isinstance(practice_value, dict) else {}

    narration_lang = str(cfg.get("narration_lang") or "zh").strip() or "zh"
    practice_mode = str(practice.get("mode") or "all").strip().lower()
    if practice_mode not in {"all", "sample", "difficulty", "none"}:
        practice_mode = "all"

    return StrategyConfig(
        narration_lang=narration_lang,
        practice_mode=practice_mode,
        practice_every_n=_get_int(practice, "every_n", 3, lo=1, hi=20),
        practice_difficulty_max=_get_float(practice, "difficulty_max", 0.65, lo=0.0, hi=1.0),
        practice_max_token_count=_get_int(practice, "max_token_count", 24, lo=4, hi=120),
        enable_plot=_get_bool(narrations, "plot", False),
        enable_translation=_get_bool(narrations, "translation", False),
        enable_vocab=_get_bool(narrations, "vocab", False),
        enable_grammar=_get_bool(narrations, "grammar", False),
        plot_every_n_practice=_get_int(cfg, "plot_every_n_practice", 5, lo=2, hi=30),
        translation_every_n_practice=_get_int(cfg, "translation_every_n_practice", 2, lo=1, hi=30),
        vocab_min_difficulty=_get_float(cfg, "vocab_min_difficulty", 0.5, lo=0.0, hi=1.0),
        grammar_min_token_count=_get_int(cfg, "grammar_min_token_count", 12, lo=4, hi=120),
    )


def _practice_state_for_segment(seg: Segment) -> str:
    s = seg.status
    if isinstance(s, SegmentStatus):
        if s == SegmentStatus.PASSED:
            return "done"
        if s == SegmentStatus.SKIPPED:
            return "skipped"
    if str(s).strip().lower().endswith("passed"):
        return "done"
    if str(s).strip().lower().endswith("skipped"):
        return "skipped"
    return "pending"


def _should_practice(seg: Segment, cfg: StrategyConfig) -> bool:
    if cfg.practice_mode == "none":
        return False
    if cfg.practice_mode == "all":
        return True
    if cfg.practice_mode == "sample":
        return (int(seg.id) % max(1, int(cfg.practice_every_n))) == 0
    diff = float(seg.difficulty or 0.0)
    tokens = int(seg.token_count or 0)
    if tokens <= 0:
        tokens = len((seg.text or "").split())
    return (diff <= float(cfg.practice_difficulty_max)) and (tokens <= int(cfg.practice_max_token_count))


def _segment_tokens(seg: Segment) -> int:
    try:
        tokens = int(seg.token_count or 0)
    except Exception:
        tokens = 0
    if tokens <= 0:
        tokens = len((seg.text or "").split())
    return max(0, int(tokens))


def _segment_difficulty(seg: Segment) -> float:
    try:
        return float(seg.difficulty or 0.0)
    except Exception:
        return 0.0


def _bucket_sample_practice_segments(
    *, segments: list[Segment], cfg: StrategyConfig, lang: str
) -> tuple[set[int], dict[int, str]]:
    selected: set[int] = set()
    reasons: dict[int, str] = {}
    zh = str(lang).startswith("zh")
    if cfg.practice_mode == "none":
        return selected, reasons
    if cfg.practice_mode != "difficulty":
        for seg in segments:
            if seg and _should_practice(seg, cfg):
                idx = int(seg.id)
                selected.add(idx)
                if cfg.practice_mode == "all":
                    reasons[idx] = "模式=all：全部练习" if zh else "mode=all: practice all"
                elif cfg.practice_mode == "sample":
                    n = max(1, int(cfg.practice_every_n))
                    reasons[idx] = (f"抽样：每 {n} 句选 1 句（idx % {n} == 0）" if zh else f"sample: every {n} sentences (idx % {n} == 0)")
        return selected, reasons

    window = max(1, int(cfg.practice_every_n))
    bucket_counts: dict[tuple[int, int], int] = {}

    def bucket_id(*, diff: float, tokens: int) -> tuple[int, int]:
        d = max(0.0, min(0.999, float(diff)))
        diff_bucket = int(d * 3.0)
        if tokens <= 10:
            tok_bucket = 0
        elif tokens <= 18:
            tok_bucket = 1
        else:
            tok_bucket = 2
        return diff_bucket, tok_bucket

    def candidate_ok(*, diff: float, tokens: int) -> bool:
        return (tokens > 0) and (tokens <= int(cfg.practice_max_token_count)) and (diff <= float(cfg.practice_difficulty_max))

    def score(*, diff: float, tokens: int, bid: tuple[int, int]) -> float:
        d_norm = float(diff) / max(0.001, float(cfg.practice_difficulty_max))
        t_norm = float(tokens) / max(1.0, float(cfg.practice_max_token_count))
        diversity_pen = float(bucket_counts.get(bid, 0)) * 0.25
        return (0.65 * d_norm) + (0.35 * t_norm) + diversity_pen

    for start in range(0, len(segments), window):
        win = [s for s in segments[start : start + window] if s is not None]
        best: Optional[Segment] = None
        best_score: Optional[float] = None
        best_bid: Optional[tuple[int, int]] = None
        for seg in win:
            diff = _segment_difficulty(seg)
            tokens = _segment_tokens(seg)
            if not candidate_ok(diff=diff, tokens=tokens):
                continue
            bid = bucket_id(diff=diff, tokens=tokens)
            sc = score(diff=diff, tokens=tokens, bid=bid)
            if best_score is None or sc < best_score:
                best = seg
                best_score = sc
                best_bid = bid
        if best is None or best_score is None or best_bid is None:
            continue
        idx = int(best.id)
        selected.add(idx)
        bucket_counts[best_bid] = int(bucket_counts.get(best_bid, 0)) + 1
        diff = _segment_difficulty(best)
        tokens = _segment_tokens(best)
        if zh:
            reasons[idx] = f"难度/长度分桶：每 {window} 句选 1 句，bucket={best_bid}，diff={diff:.2f}，tokens={tokens}"
        else:
            reasons[idx] = f"difficulty buckets: pick 1 per {window}, bucket={best_bid}, diff={diff:.2f}, tokens={tokens}"

    if reasons:
        try:
            logger.info("bucket-sampled practice segments=%d", len(selected))
        except Exception:
            pass
    return selected, reasons


def build_coach_plan_nodes(
    *,
    course: Course,
    plan_id: str,
    strategy: StrategyConfig,
    lang: str,
) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    idx = 0
    practice_count = 0
    total = int(getattr(course, "total_segments", 0) or 0)

    def _append_narration(kind: str, start_idx: int, end_idx: int) -> None:
        nonlocal idx
        start = max(0, min(int(start_idx), max(0, total - 1)))
        end = max(0, min(int(end_idx), max(0, total - 1)))
        if total <= 0:
            return
        if end < start:
            start, end = end, start
        nodes.append(
            {
                "id": _coach_narration_node_id(plan_id, kind, start, end),
                "plan_id": plan_id,
                "idx": idx,
                "node_type": "narration",
                "segment_id": None,
                "range_start_idx": int(start),
                "range_end_idx": int(end),
                "narration_kind": str(kind),
                "state": "pending",
            }
        )
        idx += 1

    def _append_practice(seg_idx: int, state: str) -> None:
        nonlocal idx
        nodes.append(
            {
                "id": _coach_practice_node_id(plan_id, int(seg_idx)),
                "plan_id": plan_id,
                "idx": idx,
                "node_type": "practice",
                "segment_id": _segment_id(str(course.id), int(seg_idx)),
                "range_start_idx": None,
                "range_end_idx": None,
                "narration_kind": None,
                "state": str(state),
            }
        )
        idx += 1

    last_plotted_end: Optional[int] = None
    all_segments = list(getattr(course, "segments", []) or [])
    selected_practice, selection_reasons = _bucket_sample_practice_segments(segments=all_segments, cfg=strategy, lang=str(lang or "zh"))

    if strategy.practice_mode == "none":
        for seg in all_segments:
            if not seg:
                continue
            seg_idx = int(seg.id)
            if seg_idx < 0 or seg_idx >= total:
                continue

            if strategy.enable_translation:
                _append_narration("translation", seg_idx, seg_idx)
            if strategy.enable_vocab and float(seg.difficulty or 0.0) >= float(strategy.vocab_min_difficulty):
                _append_narration("vocab", seg_idx, seg_idx)
            if strategy.enable_grammar:
                tokens = _segment_tokens(seg)
                if tokens >= int(strategy.grammar_min_token_count):
                    _append_narration("grammar", seg_idx, seg_idx)

        if strategy.enable_plot and total > 0:
            step = max(2, int(strategy.plot_every_n_practice))
            start = 0
            while start < total:
                end = min(total - 1, start + step - 1)
                _append_narration("plot", start, end)
                start = end + 1

        for i, n in enumerate(nodes):
            n["idx"] = int(i)
        return nodes

    for seg in all_segments:
        if not seg:
            continue
        seg_idx = int(seg.id)
        if seg_idx < 0 or seg_idx >= total:
            continue
        if seg_idx not in selected_practice:
            continue

        if strategy.enable_translation and (practice_count % max(1, int(strategy.translation_every_n_practice)) == 0):
            _append_narration("translation", seg_idx, seg_idx)

        if strategy.enable_vocab and float(seg.difficulty or 0.0) >= float(strategy.vocab_min_difficulty):
            _append_narration("vocab", seg_idx, seg_idx)

        if strategy.enable_grammar:
            tokens = int(seg.token_count or 0)
            if tokens <= 0:
                tokens = len((seg.text or "").split())
            if tokens >= int(strategy.grammar_min_token_count):
                _append_narration("grammar", seg_idx, seg_idx)

        if strategy.enable_plot and practice_count > 0 and (practice_count % max(1, int(strategy.plot_every_n_practice)) == 0):
            start = (last_plotted_end + 1) if last_plotted_end is not None else 0
            end = max(0, seg_idx - 1)
            if end >= start:
                _append_narration("plot", start, end)
                last_plotted_end = int(end)

        _append_practice(seg_idx, _practice_state_for_segment(seg))
        reason = selection_reasons.get(int(seg_idx))
        if reason:
            nodes[-1]["reason"] = str(reason)
        practice_count += 1

    if strategy.enable_plot and total > 0:
        tail_start = (last_plotted_end + 1) if last_plotted_end is not None else 0
        tail_end = min(max(0, total - 1), tail_start + max(1, int(strategy.plot_every_n_practice)) - 1)
        if tail_end >= tail_start and tail_end < total - 1:
            _append_narration("plot", tail_start, tail_end)

    if not nodes and total > 0:
        _append_practice(0, "pending")

    for i, n in enumerate(nodes):
        n["idx"] = int(i)
    return nodes
