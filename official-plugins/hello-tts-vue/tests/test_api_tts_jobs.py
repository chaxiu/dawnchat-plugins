import importlib.util
import json
import sys
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient


class _FakeHostClient:
    def __init__(self, output_path: Path):
        self.output_path = output_path
        self._tasks: dict[str, dict] = {
            "task-ok": {
                "status": "completed",
                "progress": 1.0,
                "progress_message": "done",
                "result": {
                    "content": {
                        "code": 200,
                        "message": "success",
                        "data": {"output_path": str(output_path)},
                    }
                },
                "error": None,
            }
        }

    async def _call_tool(self, tool_name, arguments=None, timeout=120.0, on_progress=None):
        if tool_name == "dawnchat.tts.list_models":
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
        if tool_name == "dawnchat.tts.list_speakers":
            return {
                "code": 200,
                "message": "success",
                "data": {"speakers": ["female_1", "male_1"]},
            }
        if tool_name == "dawnchat.tts.list_voices":
            return {
                "code": 200,
                "message": "success",
                "data": {"voices": ["Emma", "Carter"], "by_quality": {"fast": ["Emma"]}},
            }
        if tool_name == "dawnchat.tts.synthesize":
            return {
                "code": 200,
                "message": "success",
                "data": {"output_path": str(self.output_path)},
            }
        raise RuntimeError(f"unexpected tool {tool_name}")

    async def _request(self, method, path, json=None, params=None):
        if method == "POST" and path == "/sdk/tools/call":
            tool_name = (json or {}).get("tool_name")
            if tool_name == "dawnchat.tts.synthesize":
                return {"status": "accepted", "mode": "async", "task_id": "task-ok"}
            result = await self._call_tool(tool_name, arguments=(json or {}).get("arguments") or {})
            return {"status": "success", "mode": "sync", "result": {"content": result}}

        if method == "GET" and path.startswith("/sdk/tasks/"):
            task_id = path.split("/")[-1]
            task = self._tasks.get(task_id)
            if not task:
                raise RuntimeError("task not found")
            return {"status": "success", "task": task}

        if method == "DELETE" and path.startswith("/sdk/tasks/"):
            task_id = path.split("/")[-1]
            task = self._tasks.get(task_id)
            if not task:
                raise RuntimeError("task not found")
            task["status"] = "cancelled"
            task["error"] = "cancelled by test"
            return {"status": "success", "message": "cancelled"}

        raise RuntimeError(f"unexpected request: {method} {path}")


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
async def test_tool_proxy_and_audio_endpoint(tmp_path: Path):
    module = _load_main_module()
    output_path = tmp_path / "demo.wav"
    output_path.write_bytes(b"RIFF....WAVEfmt ")

    fake_host = _FakeHostClient(output_path)
    app = module.create_app(Path(__file__).resolve().parent.parent, host_client=fake_host)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        models_resp = await client.post(
            "/api/sdk/tools/call",
            json={
                "tool_name": "dawnchat.tts.list_models",
                "arguments": {"engine": "cosyvoice"},
                "mode": "sync",
            },
        )
        assert models_resp.status_code == 200
        models_payload = models_resp.json()["result"]
        assert models_payload["data"]["models"][0]["model_id"] == "cosyvoice-300m"

        submit_resp = await client.post(
            "/api/sdk/tools/submit",
            json={
                "tool_name": "dawnchat.tts.synthesize",
                "arguments": {"text": "hello", "engine": "vibevoice"},
            },
        )
        assert submit_resp.status_code == 200
        assert submit_resp.json()["mode"] == "async"
        task_id = submit_resp.json()["task_id"]

        task_resp = await client.get(f"/api/sdk/tasks/{task_id}")
        assert task_resp.status_code == 200
        assert task_resp.json()["task"]["status"] == "completed"

        audio_resp = await client.get(f"/api/tts/audio/{task_id}")
        assert audio_resp.status_code == 200
        assert audio_resp.content.startswith(b"RIFF")


@pytest.mark.asyncio
async def test_audio_not_found_for_task_without_output(tmp_path: Path):
    module = _load_main_module()
    output_path = tmp_path / "demo.wav"
    output_path.write_bytes(b"RIFF....WAVEfmt ")
    fake_host = _FakeHostClient(output_path)
    fake_host._tasks["task-no-audio"] = {
        "status": "completed",
        "progress": 1.0,
        "progress_message": "done",
        "result": {"content": {"code": 200, "message": "success", "data": {}}},
        "error": None,
    }

    app = module.create_app(Path(__file__).resolve().parent.parent, host_client=fake_host)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/tts/audio/task-no-audio")
        assert response.status_code == 404
