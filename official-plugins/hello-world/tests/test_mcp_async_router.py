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


@pytest.mark.asyncio
async def test_async_task_reports_progress():
    module = _load_mcp_module()
    from dawnchat_sdk.mcp_router import report_task_progress

    manifest_tools = [
        {"name": "hello_world_async", "description": "say hi async", "inputSchema": {"type": "object", "properties": {}}}
    ]

    async def handler(arguments):
        await report_task_progress(0.4, "half way")
        await asyncio.sleep(0.05)
        await report_task_progress(0.8, "almost done")
        return {"greeting": f"Hello async, {arguments.get('name', 'World')}!"}

    router = module.build_mcp_router(manifest_tools, {"hello_world_async": handler})
    app = FastAPI()
    app.include_router(router)

    saw_progress = False
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        submit_resp = await client.post(
            "/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 11,
                "method": "tools/submit",
                "params": {"name": "hello_world_async", "arguments": {"name": "Dawn"}},
            },
        )
        task_id = submit_resp.json()["result"]["task_id"]

        for _ in range(40):
            status_resp = await client.post(
                "/mcp",
                json={"jsonrpc": "2.0", "id": 12, "method": "tasks/get", "params": {"task_id": task_id}},
            )
            payload = status_resp.json()["result"]
            if payload["status"] == "running" and payload.get("progress", 0) >= 0.4:
                saw_progress = True
            if payload["status"] == "completed":
                assert payload.get("progress") == 1.0
                break
            await asyncio.sleep(0.01)

    assert saw_progress is True


@pytest.mark.asyncio
async def test_task_callbacks_do_not_break_async_task():
    module = _load_mcp_module()
    events: list[dict] = []

    manifest_tools = [
        {"name": "hello_world_async", "description": "say hi async", "inputSchema": {"type": "object", "properties": {}}}
    ]

    async def handler(arguments):
        await asyncio.sleep(0.02)
        return {"greeting": f"Hello async, {arguments.get('name', 'World')}!"}

    def broken_progress_callback(task_id: str, progress: float, message: str):
        _ = (task_id, progress, message)
        raise RuntimeError("progress callback error")

    def event_callback(event: dict):
        events.append(event)

    router = module.build_mcp_router(
        manifest_tools,
        {"hello_world_async": handler},
        on_task_progress=broken_progress_callback,
        on_task_event=event_callback,
    )
    app = FastAPI()
    app.include_router(router)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        submit_resp = await client.post(
            "/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 21,
                "method": "tools/submit",
                "params": {"name": "hello_world_async", "arguments": {"name": "Dawn"}},
            },
        )
        task_id = submit_resp.json()["result"]["task_id"]

        for _ in range(40):
            status_resp = await client.post(
                "/mcp",
                json={"jsonrpc": "2.0", "id": 22, "method": "tasks/get", "params": {"task_id": task_id}},
            )
            payload = status_resp.json()["result"]
            if payload["status"] == "completed":
                assert payload["progress"] == 1.0
                break
            await asyncio.sleep(0.01)
        else:
            raise AssertionError("task did not complete in time")

    event_names = {item.get("event") for item in events}
    assert "task_started" in event_names
    assert "task_completed" in event_names
