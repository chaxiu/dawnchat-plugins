from __future__ import annotations

import importlib
import sys
import types


def _stub_dawnchat_sdk() -> None:
    if "dawnchat_sdk" in sys.modules:
        return
    dawnchat_sdk = types.ModuleType("dawnchat_sdk")
    dawnchat_sdk_host = types.ModuleType("dawnchat_sdk.host")

    class _DummyMedia:
        async def extract_frames_batch(self, *args, **kwargs):
            raise RuntimeError("dummy host")

    class _DummyAI:
        async def vision_chat(self, *args, **kwargs):
            raise RuntimeError("dummy host")

    class _DummyHost:
        media = _DummyMedia()
        ai = _DummyAI()

    setattr(dawnchat_sdk_host, "host", _DummyHost())
    sys.modules["dawnchat_sdk"] = dawnchat_sdk
    sys.modules["dawnchat_sdk.host"] = dawnchat_sdk_host


def _load_module():
    _stub_dawnchat_sdk()
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))
    return importlib.import_module("services.v2_player.short_utterance_relabel")


def test_stable_visual_speaker_id_is_deterministic_and_safe():
    mod = _load_module()
    a = mod._stable_visual_speaker_id("Peppa Pig")
    b = mod._stable_visual_speaker_id("Peppa Pig")
    assert a == b
    assert a.startswith("VISUAL_")
    assert " " not in a


def test_stable_visual_speaker_id_hashes_non_ascii_names():
    mod = _load_module()
    out = mod._stable_visual_speaker_id("佩奇")
    assert out.startswith("VISUAL_")
    assert len(out) >= len("VISUAL_") + 6


def test_is_short_subtitle_detects_short_by_duration_words_or_chars():
    mod = _load_module()
    from storage.v2_player import SubtitleData

    s1 = SubtitleData(index=1, start_time=0.0, end_time=0.5, text="hello", speaker_id=None)
    assert mod._is_short_subtitle(s1, max_duration_s=0.9, max_words=2, max_chars=8) is True

    s2 = SubtitleData(index=2, start_time=0.0, end_time=2.0, text="Oh", speaker_id=None)
    assert mod._is_short_subtitle(s2, max_duration_s=0.9, max_words=2, max_chars=8) is True

    s3 = SubtitleData(index=3, start_time=0.0, end_time=2.0, text="This is a longer sentence", speaker_id=None)
    assert mod._is_short_subtitle(s3, max_duration_s=0.9, max_words=2, max_chars=8) is False


def test_apply_decisions_updates_subtitles_and_adds_diarization_segments():
    mod = _load_module()
    from storage.v2_player import DiarizationSegment, SubtitleData

    subs = [
        SubtitleData(index=1, start_time=0.0, end_time=0.5, text="Oh", speaker_id="SPEAKER_00"),
        SubtitleData(index=2, start_time=1.0, end_time=2.0, text="Hello", speaker_id="SPEAKER_00"),
    ]
    diar = [DiarizationSegment(speaker_id="SPEAKER_00", start_time=0.0, end_time=2.0)]
    decisions = [
        mod.ShortUtteranceDecision(
            subtitle_index=1,
            timestamp=0.2,
            speaking_character="Peppa",
            confidence=0.9,
            chosen_speaker_id="VISUAL_PEPPA",
        )
    ]

    updated_subs, updated_diar, applied = mod.ShortUtteranceRelabelService._apply_decisions(
        subtitles=subs,
        diarization=diar,
        decisions=decisions,
    )
    assert len(applied) == 1
    assert updated_subs[0].speaker_id == "VISUAL_PEPPA"
    assert any(s.speaker_id == "VISUAL_PEPPA" for s in updated_diar)
