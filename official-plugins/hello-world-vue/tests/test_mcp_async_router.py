import importlib.util
import asyncio
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
    spec = importlib.util.spec_from_file_location("hello_world_mcp", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_tools_submit_and_tasks_get():
    module = _load_mcp_module()
    manifest_tools = [
        {"name": "hello_world", "description": "say hi", "inputSchema": {"type": "object", "properties": {}}}
    ]

    async def handler(arguments):
        return {"greeting": f"Hello, {arguments.get('name', 'World')}!"}

    router = module.build_mcp_router(manifest_tools, {"hello_world": handler})
    app = FastAPI()
    app.include_router(router)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        submit_resp = await client.post(
            "/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/submit",
                "params": {"name": "hello_world", "arguments": {"name": "Dawn"}},
            },
        )
        submit_payload = submit_resp.json()["result"]
        task_id = submit_payload["task_id"]
        assert submit_payload["status"] == "accepted"

        for _ in range(20):
            status_resp = await client.post(
                "/mcp",
                json={"jsonrpc": "2.0", "id": 2, "method": "tasks/get", "params": {"task_id": task_id}},
            )
            status_payload = status_resp.json()["result"]
            if status_payload["status"] == "completed":
                result_text = status_payload["result"]["content"][0]["text"]
                result_data = json.loads(result_text)
                assert result_data["data"]["greeting"] == "Hello, Dawn!"
                return
            await asyncio.sleep(0.02)

        raise AssertionError("task did not complete in time")
