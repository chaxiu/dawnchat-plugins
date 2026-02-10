from __future__ import annotations

import tempfile
from pathlib import Path


def _import_generator():
    import sys
    import types

    root = Path(__file__).resolve().parents[1] / "src"
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    if "dawnchat_sdk" not in sys.modules:
        dawnchat_sdk = types.ModuleType("dawnchat_sdk")
        dawnchat_sdk_host = types.ModuleType("dawnchat_sdk.host")

        class _DummyAI:
            async def chat(self, *args, **kwargs):
                raise RuntimeError("dummy host")

        class _DummyHost:
            ai = _DummyAI()

        setattr(dawnchat_sdk_host, "host", _DummyHost())
        sys.modules["dawnchat_sdk"] = dawnchat_sdk
        sys.modules["dawnchat_sdk.host"] = dawnchat_sdk_host

    from services.v2_player.llm_script_gen import LLMScriptGenerator
    from storage.v2_player.paths import V2PlayerPaths

    return LLMScriptGenerator, V2PlayerPaths


def test_parse_allows_ref_null_and_defaults_ducking():
    LLMScriptGenerator, V2PlayerPaths = _import_generator()
    with tempfile.TemporaryDirectory() as d:
        gen = LLMScriptGenerator(paths=V2PlayerPaths(Path(d), "course"))
        content = """[
          {"time_in": 51.4, "action_type": "pre_teach_pause", "script": "A", "ducking": false, "estimated_duration": 2.0, "ref": null},
          {"time_in": 86.5, "action_type": "gap_filling", "script": "B", "estimated_duration": 1.0, "ref": null}
        ]"""
        entries = gen._parse_llm_response(content)
        assert len(entries) == 2
        assert entries[0].action_type == "pre_teach_pause"
        assert entries[0].ducking is False
        assert entries[0].ref == {}
        assert entries[1].action_type == "gap_filling"
        assert entries[1].ducking is True
        assert entries[1].ref == {}


def test_parse_strips_json_code_fence_and_ignores_invalid_action_type():
    LLMScriptGenerator, V2PlayerPaths = _import_generator()
    with tempfile.TemporaryDirectory() as d:
        gen = LLMScriptGenerator(paths=V2PlayerPaths(Path(d), "course"))
        content = """```json
        [
          {"time_in": 1, "action_type": "ignore", "script": "X"},
          {"time_in": 2, "action_type": "gap-filling", "script": "OK", "ref": {}},
          {"time_in": 3, "action_type": "something_else", "script": "NO", "ref": {}}
        ]
        ```"""
        entries = gen._parse_llm_response(content)
        assert [e.time_in for e in entries] == [2.0]
        assert entries[0].action_type == "gap_filling"
        assert entries[0].script == "OK"


def test_gap_filling_downgrades_when_no_real_gap():
    LLMScriptGenerator, V2PlayerPaths = _import_generator()
    from storage.v2_player import AnalysisBundle, SubtitleData, TimelineFeatures, SmartScriptEntry

    with tempfile.TemporaryDirectory() as d:
        gen = LLMScriptGenerator(paths=V2PlayerPaths(Path(d), "course"))
        bundle = AnalysisBundle(
            course_id="course",
            subtitles=[
                SubtitleData(index=0, start_time=8.0, end_time=10.5, text="a"),
                SubtitleData(index=1, start_time=10.0, end_time=12.0, text="b"),
            ],
            timeline_features=TimelineFeatures(gaps=[], densities=[]),
        )
        e = SmartScriptEntry(
            time_in=9.0,
            action_type="gap_filling",
            script="x",
            ducking=True,
            estimated_duration=1.0,
            ref={"subtitle_indexes": [1]},
        )
        out = gen._apply_timing_constraints([e], bundle=bundle)
        assert len(out) == 1
        assert out[0].action_type == "pre_teach_pause"
        assert out[0].ducking is False


def test_gap_filling_kept_only_if_fits_in_gap_without_overlapping_subtitles():
    LLMScriptGenerator, V2PlayerPaths = _import_generator()
    from storage.v2_player import AnalysisBundle, SubtitleData, TimelineFeatures, GapInfo, SmartScriptEntry

    with tempfile.TemporaryDirectory() as d:
        gen = LLMScriptGenerator(paths=V2PlayerPaths(Path(d), "course"))
        bundle = AnalysisBundle(
            course_id="course",
            subtitles=[
                SubtitleData(index=0, start_time=7.0, end_time=9.0, text="a"),
                SubtitleData(index=1, start_time=10.0, end_time=12.0, text="b"),
            ],
            timeline_features=TimelineFeatures(
                gaps=[GapInfo(after_index=0, start_time=9.0, end_time=10.0, duration=1.0)],
                densities=[],
            ),
        )
        e = SmartScriptEntry(
            time_in=9.1,
            action_type="gap_filling",
            script="x",
            ducking=True,
            estimated_duration=0.4,
            ref={"gap_after_indexes": [0]},
        )
        out = gen._apply_timing_constraints([e], bundle=bundle)
        assert len(out) == 1
        assert out[0].action_type == "gap_filling"
        assert out[0].ducking is True
        assert 9.0 <= float(out[0].time_in) <= 10.0


def test_sanitize_script_text_does_not_truncate_normal_zh_paragraphs():
    LLMScriptGenerator, V2PlayerPaths = _import_generator()
    with tempfile.TemporaryDirectory() as d:
        gen = LLMScriptGenerator(paths=V2PlayerPaths(Path(d), "course"), narration_lang="zh")
        text = "嘿，小朋友们！你们猜猜看，这是谁呀？Peppa Pig！她有个小弟弟，叫George，他最喜欢什么？对啦，就是那个会“嘎嘎”叫的——Mr Dinosaur！"
        out = gen._sanitize_script_text(text)
        assert "Mr Dinosaur" in out
        assert len(out) > 60
