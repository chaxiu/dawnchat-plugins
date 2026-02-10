from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class CoachPlanSnapshot:
    plan_id: str
    plan: dict[str, Any]
    nodes: list[dict[str, Any]]


def clamp_int(value: Any, lo: int, hi: int) -> int:
    try:
        v = int(value)
    except Exception:
        v = lo
    return max(lo, min(hi, v))


def get_current_node(snapshot: CoachPlanSnapshot) -> Optional[dict[str, Any]]:
    idx = snapshot.plan.get("current_node_index")
    if not snapshot.nodes:
        return None
    i = clamp_int(idx, 0, len(snapshot.nodes) - 1)
    return snapshot.nodes[i]


def node_is_narration(node: dict[str, Any]) -> bool:
    return str(node.get("node_type") or "").strip().lower() == "narration"


def node_is_practice(node: dict[str, Any]) -> bool:
    return str(node.get("node_type") or "").strip().lower() == "practice"


def node_segment_idx(node: dict[str, Any]) -> Optional[int]:
    seg_id = node.get("segment_id")
    if not seg_id:
        return None
    try:
        s = str(seg_id)
        if ":" in s:
            return int(s.split(":")[-1])
        return int(s)
    except Exception:
        return None


def narration_range(node: dict[str, Any]) -> Optional[tuple[int, int]]:
    try:
        start_idx = node.get("range_start_idx")
        end_idx = node.get("range_end_idx")
        if start_idx is None or end_idx is None:
            return None
        return int(start_idx), int(end_idx)
    except Exception:
        return None

