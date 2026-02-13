import asyncio
import importlib.util
import json
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


def _load_mcp_module():
    repo_root = Path(__file__).resolve().parents[3]
    sdk_path = repo_root / "sdk"
    if str(sdk_path) not in sys.path:
        sys.path.insert(0, str(sdk_path))
    module_path = Path(__file__).resolve().parent.parent / "src" / "mcp.py"
    spec = importlib.util.spec_from_file_location("diarization_mcp", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_async_submit_and_poll():
    module = _load_mcp_module()
    from dawnchat_sdk.mcp_router import report_task_progress

    manifest_tools = [{"name": "diarize", "description": "diarize", "inputSchema": {"type": "object", "properties": {}}}]

    async def handler(arguments):
        _ = arguments
        await report_task_progress(0.4, "running")
        await asyncio.sleep(0.02)
        return {"code": 200, "message": "success", "data": {"num_speakers": 2}}

    router = module.build_mcp_router(manifest_tools, {"diarize": handler})
    app = FastAPI()
    app.include_router(router)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        submit_resp = await client.post(
            "/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/submit",
                "params": {"name": "diarize", "arguments": {"audio_path": "/tmp/a.wav"}},
            },
        )
        task_id = submit_resp.json()["result"]["task_id"]

        saw_progress = False
        for _ in range(60):
            status_resp = await client.post(
                "/mcp",
                json={"jsonrpc": "2.0", "id": 2, "method": "tasks/get", "params": {"task_id": task_id}},
            )
            payload = status_resp.json()["result"]
            if payload["status"] == "running" and payload.get("progress", 0) >= 0.4:
                saw_progress = True
            if payload["status"] == "completed":
                data = json.loads(payload["result"]["content"][0]["text"])
                assert data["data"]["num_speakers"] == 2
                break
            await asyncio.sleep(0.01)
        else:
            raise AssertionError("task did not complete in time")

    assert saw_progress is True


@pytest.mark.asyncio
async def test_sync_merge_tool():
    module = _load_mcp_module()
    manifest_tools = [
        {"name": "merge_speakers", "description": "merge", "inputSchema": {"type": "object", "properties": {}}}
    ]

    async def merge_handler(arguments):
        return {"code": 200, "message": "success", "data": {"count": len(arguments.get("transcription_segments", []))}}

    router = module.build_mcp_router(manifest_tools, {"merge_speakers": merge_handler})
    app = FastAPI()
    app.include_router(router)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {
                    "name": "merge_speakers",
                    "arguments": {"diarization_segments": [], "transcription_segments": [{"text": "hi"}]},
                },
            },
        )
        payload = resp.json()["result"]
        data = json.loads(payload["content"][0]["text"])
        assert data["data"]["count"] == 1
