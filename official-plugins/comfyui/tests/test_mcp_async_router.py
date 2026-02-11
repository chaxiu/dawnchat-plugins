import asyncio
import importlib.util
import json
from pathlib import Path
import sys

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


def _load_mcp_module():
    repo_root = Path(__file__).resolve().parents[3]
    sdk_path = repo_root / "sdk"
    if str(sdk_path) not in sys.path:
        sys.path.insert(0, str(sdk_path))
    module_path = Path(__file__).resolve().parent.parent / "src" / "mcp.py"
    spec = importlib.util.spec_from_file_location("comfyui_mcp", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_tools_submit_and_tasks_get_for_comfyui():
    module = _load_mcp_module()
    manifest_tools = [
        {"name": "text_to_image", "description": "dummy", "inputSchema": {"type": "object", "properties": {}}}
    ]

    async def handler(arguments):
        await asyncio.sleep(0.02)
        return {"images": [f"/tmp/{arguments.get('prompt', 'demo')}.png"]}

    app = FastAPI()
    app.include_router(module.build_mcp_router(manifest_tools, {"text_to_image": handler}))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        submit_resp = await client.post(
            "/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/submit",
                "params": {"name": "text_to_image", "arguments": {"prompt": "sky"}},
            },
        )
        submit_payload = submit_resp.json()["result"]
        task_id = submit_payload["task_id"]
        assert submit_payload["status"] == "accepted"

        for _ in range(30):
            status_resp = await client.post(
                "/mcp",
                json={"jsonrpc": "2.0", "id": 2, "method": "tasks/get", "params": {"task_id": task_id}},
            )
            payload = status_resp.json()["result"]
            if payload["status"] == "completed":
                text_payload = payload["result"]["content"][0]["text"]
                result_data = json.loads(text_payload)
                assert result_data["code"] == 200
                assert result_data["data"]["images"][0].endswith("sky.png")
                return
            await asyncio.sleep(0.01)

        raise AssertionError("comfyui async task did not complete in time")
