from __future__ import annotations

import importlib
import sys
import tempfile
import types
from pathlib import Path


def _stub_dawnchat_sdk() -> None:
    if "dawnchat_sdk" in sys.modules:
        return
    dawnchat_sdk = types.ModuleType("dawnchat_sdk")
    dawnchat_sdk_host = types.ModuleType("dawnchat_sdk.host")

    class _DummyMedia:
        async def get_info(self, *args, **kwargs):
            raise RuntimeError("dummy host")

        async def extract_frames_batch(self, *args, **kwargs):
            raise RuntimeError("dummy host")

    class _DummyHost:
        media = _DummyMedia()

    setattr(dawnchat_sdk_host, "host", _DummyHost())
    sys.modules["dawnchat_sdk"] = dawnchat_sdk
    sys.modules["dawnchat_sdk.host"] = dawnchat_sdk_host


def _load_module():
    _stub_dawnchat_sdk()
    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))
    return importlib.import_module("services.v2_player.speaker_frame_extraction")


def test_plan_extraction_applies_per_speaker_limit():
    mod = _load_module()
    from storage.v2_player import DiarizationSegment, V2PlayerPaths

    with tempfile.TemporaryDirectory() as d:
        paths = V2PlayerPaths(Path(d), "c")
        extractor = mod.SpeakerFrameExtractor(paths, max_frames_per_speaker=8)

        diarization = []
        for i in range(100):
            diarization.append(DiarizationSegment(speaker_id="A", start_time=float(i), end_time=float(i) + 1.0))
        for i in range(50):
            diarization.append(DiarizationSegment(speaker_id="B", start_time=200.0 + float(i), end_time=201.0 + float(i)))

        tasks = extractor._plan_extraction(diarization, video_duration=300.0)

        counts = {}
        for _, speaker_id, *_ in tasks:
            counts[speaker_id] = counts.get(speaker_id, 0) + 1

        assert counts.get("A") == 8
        assert counts.get("B") == 8
        assert sum(counts.values()) == 16


def test_plan_extraction_prefers_middle_frames_when_possible():
    mod = _load_module()
    from storage.v2_player import DiarizationSegment, V2PlayerPaths

    with tempfile.TemporaryDirectory() as d:
        paths = V2PlayerPaths(Path(d), "c")
        extractor = mod.SpeakerFrameExtractor(paths, max_frames_per_speaker=3)

        diarization = [
            DiarizationSegment(speaker_id="A", start_time=float(t), end_time=float(t) + 2.0)
            for t in range(0, 100, 10)
        ]

        tasks = extractor._plan_extraction(diarization, video_duration=100.0)
        selected_ts = sorted(t[2] for t in tasks)

        midpoint = 50.0
        candidates = [
            s.start_time + (s.end_time - s.start_time) * extractor.DEFAULT_FRAME_POSITION
            for s in diarization
        ]
        expected = sorted(sorted(candidates, key=lambda x: (abs(x - midpoint), x))[:3])

        assert selected_ts == expected
