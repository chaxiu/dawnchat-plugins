import pytest

from dawnchat_sdk.task_handle import ToolTaskHandle
from dawnchat_sdk.tool_gateway import ToolGateway
from dawnchat_sdk.tool_errors import ToolExecutionError


class _FakeClient:
    def __init__(self) -> None:
        self.tasks = {
            "task-1": {
                "status": "running",
                "progress": 0.2,
                "progress_message": "starting",
                "result": None,
                "error": None,
            }
        }

    async def _call_tool(self, tool_name, arguments=None, timeout=120.0, on_progress=None):
        if on_progress:
            on_progress(0.5, "half")
        return {"code": 200, "message": "success", "data": {"tool": tool_name}}

    async def _request(self, method, path, json=None, params=None):
        if method == "POST" and path == "/sdk/tools/call":
            if (json or {}).get("tool_name") == "demo.async":
                return {"status": "accepted", "mode": "async", "task_id": "task-1"}
            if (json or {}).get("tool_name") == "demo.sync.envelope":
                return {
                    "status": "success",
                    "mode": "sync",
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": '{"code":200,"message":"success","data":{"code":200,"message":"success","data":{"ok":true}}}',
                            }
                        ]
                    },
                }
            return {"status": "success", "mode": "sync", "result": {"content": {"ok": True}}}

        if method == "GET" and path == "/sdk/tasks/task-1":
            task = self.tasks["task-1"]
            if task["status"] == "running":
                task["status"] = "completed"
                task["progress"] = 1.0
                task["progress_message"] = "done"
                task["result"] = {
                    "content": [
                        {
                            "type": "text",
                            "text": '{"code":200,"message":"success","data":{"code":200,"message":"success","data":{"done":true}}}',
                        }
                    ]
                }
            return {"status": "success", "task": task}

        if method == "DELETE" and path == "/sdk/tasks/task-1":
            self.tasks["task-1"]["status"] = "cancelled"
            self.tasks["task-1"]["error"] = "cancelled"
            return {"status": "success"}

        raise RuntimeError(f"unexpected {method} {path}")


class _SlowClient(_FakeClient):
    async def _request(self, method, path, json=None, params=None):
        if method == "GET" and path == "/sdk/tasks/task-1":
            return {
                "status": "success",
                "task": {
                    "status": "running",
                    "progress": 0.1,
                    "progress_message": "still running",
                    "result": None,
                    "error": None,
                },
            }
        return await super()._request(method, path, json=json, params=params)


@pytest.mark.asyncio
async def test_tool_gateway_call_sync():
    gateway = ToolGateway(_FakeClient())
    result = await gateway.call_sync("demo.sync", arguments={"x": 1})
    assert result["code"] == 200
    assert result["data"]["tool"] == "demo.sync"


@pytest.mark.asyncio
async def test_tool_gateway_submit_and_wait():
    gateway = ToolGateway(_FakeClient())
    handle = await gateway.submit("demo.async", arguments={"x": 1})
    assert isinstance(handle, ToolTaskHandle)
    assert handle.task_id == "task-1"

    result = await handle.wait(timeout=10)
    assert result["data"]["done"] is True


@pytest.mark.asyncio
async def test_tool_gateway_cancel():
    gateway = ToolGateway(_FakeClient())
    handle = await gateway.submit("demo.async", arguments={"x": 1})
    ok = await handle.cancel()
    assert ok is True


@pytest.mark.asyncio
async def test_tool_gateway_call_async_normalizes_nested_data():
    gateway = ToolGateway(_FakeClient())
    handle = await gateway.call_async("demo.sync.envelope", arguments={})
    result = await handle.wait(timeout=10)
    assert result["code"] == 200
    assert result["data"]["ok"] is True


@pytest.mark.asyncio
async def test_tool_gateway_wait_timeout():
    gateway = ToolGateway(_SlowClient())
    handle = await gateway.submit("demo.async", arguments={"x": 1})
    with pytest.raises(ToolExecutionError):
        await handle.wait(timeout=0.05, poll_interval=0.01)
