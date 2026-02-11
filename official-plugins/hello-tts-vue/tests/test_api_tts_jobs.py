import asyncio
import importlib.util
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


class _FakeTools:
    def __init__(self, output_path: Path):
        self.output_path = output_path

    async def call(self, name, arguments=None, timeout=120.0, on_progress=None):
        if name == "dawnchat.tts.list_models":
            return {
                "code": 200,
                "message": "success",
                "data": {
                    "models": [
                        {
                            "model_id": "cosyvoice-300m",
                            "name": "CosyVoice 300M",
                            "installed": True,
                        }
                    ]
                },
            }

        if name == "dawnchat.tts.list_speakers":
            return {
                "code": 200,
                "message": "success",
                "data": {"speakers": ["female_1", "male_1"]},
            }

        if name == "dawnchat.tts.list_voices":
            return {
                "code": 200,
                "message": "success",
                "data": {
                    "voices": ["Emma", "Carter"],
                    "by_quality": {
                        "fast": ["Emma"],
                        "standard": ["Carter"],
                        "high": ["Carter"],
                    },
                },
            }

        if name == "dawnchat.tts.synthesize":
            if on_progress:
                on_progress(0.2, "preparing")
                on_progress(20, "normalizing progress")
                on_progress(0.9, "rendering")
            await asyncio.sleep(0.02)
            return {
                "code": 200,
                "message": "success",
                "data": {"output_path": str(self.output_path)},
            }

        raise RuntimeError(f"unexpected tool call: {name}")


class _FakeHost:
    def __init__(self, output_path: Path):
        self.tools = _FakeTools(output_path)


class _FailingTools(_FakeTools):
    async def call(self, name, arguments=None, timeout=120.0, on_progress=None):
        if name == "dawnchat.tts.synthesize":
            raise RuntimeError("boom")
        return await super().call(name, arguments, timeout, on_progress)


class _FailingHost:
    def __init__(self, output_path: Path):
        self.tools = _FailingTools(output_path)


def _load_main_module():
    repo_root = Path(__file__).resolve().parents[3]
    sdk_path = repo_root / "sdk"
    if str(sdk_path) not in sys.path:
        sys.path.insert(0, str(sdk_path))

    module_path = Path(__file__).resolve().parent.parent / "src" / "main.py"
    spec = importlib.util.spec_from_file_location("hello_tts_vue_main", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)

    src_dir = str(module_path.parent)
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_tts_job_progress_and_audio_endpoint(tmp_path: Path):
    module = _load_main_module()
    output_path = tmp_path / "demo.wav"
    output_path.write_bytes(b"RIFF....WAVEfmt ")

    module.host = _FakeHost(output_path)
    app = module.create_app(Path(__file__).resolve().parent.parent)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        models_resp = await client.get("/api/tts/models", params={"engine": "cosyvoice"})
        assert models_resp.status_code == 200
        assert models_resp.json()["models"][0]["model_id"] == "cosyvoice-300m"

        speakers_resp = await client.get(
            "/api/tts/speakers",
            params={"engine": "vibevoice", "quality": "fast"},
        )
        assert speakers_resp.status_code == 200
        assert speakers_resp.json()["speakers"] == ["Emma"]

        submit_resp = await client.post(
            "/api/tts/synthesize",
            json={
                "text": "hello",
                "engine": "vibevoice",
                "quality": "fast",
                "speaker": "Emma",
            },
        )
        assert submit_resp.status_code == 200
        job_id = submit_resp.json()["job_id"]

        final_job = None
        for _ in range(40):
            status_resp = await client.get(f"/api/tts/jobs/{job_id}")
            assert status_resp.status_code == 200
            job = status_resp.json()["job"]
            assert 0.0 <= job["progress"] <= 1.0
            if job["status"] == "completed":
                final_job = job
                break
            await asyncio.sleep(0.02)

        assert final_job is not None
        assert final_job["progress"] == 1.0
        assert final_job["output_path"] == str(output_path)

        audio_resp = await client.get(f"/api/tts/audio/{job_id}")
        assert audio_resp.status_code == 200
        assert audio_resp.content.startswith(b"RIFF")


@pytest.mark.asyncio
async def test_tts_job_failed(tmp_path: Path):
    module = _load_main_module()
    output_path = tmp_path / "unused.wav"
    module.host = _FailingHost(output_path)

    app = module.create_app(Path(__file__).resolve().parent.parent)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        submit_resp = await client.post(
            "/api/tts/synthesize",
            json={
                "text": "hello",
                "engine": "cosyvoice",
                "mode": "instruct2",
                "model_id": "cosyvoice-300m",
            },
        )
        assert submit_resp.status_code == 200
        job_id = submit_resp.json()["job_id"]

        for _ in range(40):
            status_resp = await client.get(f"/api/tts/jobs/{job_id}")
            assert status_resp.status_code == 200
            job = status_resp.json()["job"]
            if job["status"] == "failed":
                assert job["error"] == "boom"
                return
            await asyncio.sleep(0.02)

        raise AssertionError("job did not fail in time")
