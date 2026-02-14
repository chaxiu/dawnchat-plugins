import importlib.util
import sys
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient


class _FakeTools:
    async def call(self, tool_name, arguments=None, timeout=120.0, on_progress=None):
        _ = (timeout, on_progress)
        arguments = arguments or {}
        if tool_name == "dawnchat.asr.transcribe":
            return {
                "code": 200,
                "message": "success",
                "data": {
                    "text": "hello world",
                    "language": "en",
                    "duration": 1.2,
                    "segments": [{"text": "hello world", "start": 0.0, "end": 1.2}],
                },
            }
        if tool_name == "plugin.com.dawnchat.diarization.merge_speakers":
            return {
                "code": 200,
                "message": "success",
                "data": {"segments": [{"text": "hello world", "speaker": "SPEAKER_00"}], "count": 1},
            }
        raise RuntimeError(f"unexpected tool: {tool_name}")


class _FakeHostClient:
    def __init__(self):
        self.tools = _FakeTools()
        self._tasks: dict[str, dict] = {}

    async def _request(self, method, path, json=None, params=None):
        _ = params
        if method == "POST" and path == "/sdk/tools/call":
            tool_name = (json or {}).get("tool_name")
            if tool_name == "plugin.com.dawnchat.diarization.diarize":
                task = {
                    "status": "completed",
                    "progress": 1.0,
                    "progress_message": "done",
                    "result": {
                        "content": {
                            "code": 200,
                            "message": "success",
                            "data": {
                                "speakers": ["SPEAKER_00"],
                                "segments": [{"speaker": "SPEAKER_00", "start": 0.0, "end": 1.2}],
                            },
                        }
                    },
                    "error": None,
                }
                self._tasks["task-diarize"] = task
                return {"status": "accepted", "mode": "async", "task_id": "task-diarize"}
            return {"status": "success", "mode": "sync", "result": {"content": {"code": 200, "message": "ok"}}}

        if method == "GET" and path == "/sdk/tasks/task-diarize":
            return {"status": "success", "task": self._tasks["task-diarize"]}

        if method == "DELETE" and path == "/sdk/tasks/task-diarize":
            return {"status": "success"}

        raise RuntimeError(f"unexpected request: {method} {path}")

    async def _call_tool(self, tool_name, arguments=None, timeout=120.0, on_progress=None):
        return await self.tools.call(tool_name, arguments=arguments, timeout=timeout, on_progress=on_progress)


def _load_main_module():
    repo_root = Path(__file__).resolve().parents[3]
    sdk_path = repo_root / "sdk"
    if str(sdk_path) not in sys.path:
        sys.path.insert(0, str(sdk_path))

    module_path = Path(__file__).resolve().parent.parent / "src" / "main.py"
    spec = importlib.util.spec_from_file_location("hello_asr_main", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)

    src_dir = str(module_path.parent)
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_asr_transcribe_with_speakers_api():
    module = _load_main_module()
    fake_host = _FakeHostClient()
    app = module.create_app(Path(__file__).resolve().parent.parent, host_client=fake_host)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/asr/transcribe_with_speakers",
            json={"audio_path": "/tmp/demo.wav", "language": "en", "num_speakers": 1},
        )
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["code"] == 200
        assert payload["data"]["text"] == "hello world"
        assert payload["data"]["speakers"] == ["SPEAKER_00"]
        assert payload["data"]["segments"][0]["speaker"] == "SPEAKER_00"
