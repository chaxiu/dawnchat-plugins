from __future__ import annotations

import asyncio
import tempfile
from dataclasses import dataclass
from pathlib import Path
import sys
import types
import importlib


def _stub_dawnchat_sdk():
    if "dawnchat_sdk" in sys.modules:
        return
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


def _load_pipeline_module():
    _stub_dawnchat_sdk()
    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))
    return importlib.import_module("services.v2_player.pipeline")


@dataclass
class _CourseStub:
    id: str


@dataclass
class _CourseDBStub:
    db_path: str


def test_auto_mode_never_falls_back_to_rule():
    pipeline_mod = _load_pipeline_module()
    from storage.v2_player import AnalysisBundle, SmartScript

    class DummyLLM:
        def __init__(self, *args, **kwargs):
            pass

        def load_script(self):
            return None

        async def generate(self, *args, **kwargs):
            return SmartScript(course_id="c", generator="llm", entries=[])

    class DummyRule:
        def __init__(self, *args, **kwargs):
            pass

        def load_script(self):
            return None

        async def generate(self, *args, **kwargs):
            raise AssertionError("rule fallback should not run in auto mode")

    setattr(pipeline_mod, "LLMScriptGenerator", DummyLLM)
    setattr(pipeline_mod, "RuleScriptGenerator", DummyRule)

    with tempfile.TemporaryDirectory() as d:
        db_path = Path(d) / "courses.db"
        db_path.write_text("x", encoding="utf-8")

        p = pipeline_mod.V2Pipeline(_CourseStub(id="c"), _CourseDBStub(db_path=str(db_path)), enable_tts=False)
        bundle = AnalysisBundle(course_id="c", subtitles=[], timeline_features=None)

        script = asyncio.run(
            p._run_script_generation(
                bundle,
                skip_existing=False,
                intensity="medium",
                narration_lang="zh",
                audience="child",
                english_level="beginner",
                script_mode="auto",
                llm_model=None,
            )
        )
        assert script.generator == "llm"
        assert script.entries == []


def test_llm_failure_propagates_as_exception():
    pipeline_mod = _load_pipeline_module()
    from storage.v2_player import AnalysisBundle

    class DummyLLM:
        def __init__(self, *args, **kwargs):
            pass

        def load_script(self):
            return None

        async def generate(self, *args, **kwargs):
            raise RuntimeError("llm down")

    setattr(pipeline_mod, "LLMScriptGenerator", DummyLLM)

    with tempfile.TemporaryDirectory() as d:
        db_path = Path(d) / "courses.db"
        db_path.write_text("x", encoding="utf-8")

        p = pipeline_mod.V2Pipeline(_CourseStub(id="c"), _CourseDBStub(db_path=str(db_path)), enable_tts=False)
        bundle = AnalysisBundle(course_id="c", subtitles=[], timeline_features=None)

        try:
            asyncio.run(
                p._run_script_generation(
                    bundle,
                    skip_existing=False,
                    intensity="medium",
                    narration_lang="zh",
                    audience="child",
                    english_level="beginner",
                    script_mode="auto",
                    llm_model=None,
                )
            )
            assert False, "expected exception"
        except RuntimeError as e:
            assert "llm down" in str(e)
