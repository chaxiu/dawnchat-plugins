from __future__ import annotations


def test_llm_lines_include_ids():
    import sys
    from pathlib import Path

    root = Path(__file__).resolve().parents[1] / "src"
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    from services.v2_player.unified_events import UnifiedEvent

    sub = UnifiedEvent(time=1.2, event_type="sub", content="hello", subtitle_index=12)
    gap = UnifiedEvent(time=2.0, event_type="gap", content="gap", duration=3.0, subtitle_index=12)
    vis = UnifiedEvent(time=0.0, event_type="visual", content="scene", scene_id=3)

    assert "[SUB#12" in sub.to_llm_line()
    assert "[GAP(after#12" in gap.to_llm_line()
    assert "[VISUAL#3" in vis.to_llm_line()

