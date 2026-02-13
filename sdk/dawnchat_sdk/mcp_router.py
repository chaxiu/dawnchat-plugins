import asyncio
import contextvars
from dataclasses import dataclass, field
from datetime import datetime
import inspect
import json
import logging
from typing import Any, Awaitable, Callable, Optional
import uuid

from fastapi import APIRouter
from pydantic import BaseModel

ToolHandler = Callable[[dict[str, Any]], Any]
TaskProgressCallback = Callable[[str, float, str], Any]
TaskEventCallback = Callable[[dict[str, Any]], Any]

logger = logging.getLogger(__name__)

_current_task: contextvars.ContextVar[Optional["PluginTask"]] = contextvars.ContextVar(
    "dawnchat_sdk_current_mcp_task",
    default=None,
)
_current_progress_callback: contextvars.ContextVar[Optional[TaskProgressCallback]] = contextvars.ContextVar(
    "dawnchat_sdk_current_task_progress_callback",
    default=None,
)
_current_event_callback: contextvars.ContextVar[Optional[TaskEventCallback]] = contextvars.ContextVar(
    "dawnchat_sdk_current_task_event_callback",
    default=None,
)


class JsonRpcRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    method: str
    params: Optional[dict[str, Any]] = None


@dataclass
class PluginTask:
    task_id: str
    tool_name: str
    arguments: dict[str, Any]
    status: str = "pending"
    progress: float = 0.0
    message: str = ""
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    runner: Optional[asyncio.Task] = None


def _build_task_event(task: "PluginTask", event: str) -> dict[str, Any]:
    return {
        "event": event,
        "task_id": task.task_id,
        "tool_name": task.tool_name,
        "status": task.status,
        "progress": task.progress,
        "message": task.message,
        "result": task.result,
        "error": task.error,
        "timestamp": datetime.now().isoformat(),
    }


async def _emit_task_event(task: "PluginTask", event: str) -> None:
    callback = _current_event_callback.get()
    if callback is None:
        return
    payload = _build_task_event(task, event)
    try:
        callback_result = callback(payload)
        if inspect.isawaitable(callback_result):
            await callback_result
    except Exception:
        logger.warning("task event callback failed for task %s", task.task_id, exc_info=True)


async def report_task_progress(progress: float, message: str = "") -> bool:
    """
    在插件异步任务上下文中上报进度。

    返回：
    - True: 已更新当前任务进度
    - False: 当前不在异步任务上下文
    """
    task = _current_task.get()
    if task is None:
        return False

    normalized = max(0.0, min(1.0, float(progress)))
    task.progress = normalized
    task.message = message
    callback = _current_progress_callback.get()
    if callback:
        try:
            callback_result = callback(task.task_id, normalized, message)
            if inspect.isawaitable(callback_result):
                await callback_result
        except Exception:
            logger.warning("task progress callback failed for task %s", task.task_id, exc_info=True)
    await _emit_task_event(task, "task_progress")
    return True


def build_mcp_router(
    manifest_tools: list[dict[str, Any]],
    tool_handlers: dict[str, ToolHandler],
    *,
    enable_async_tasks: bool = True,
    on_task_progress: Optional[TaskProgressCallback] = None,
    on_task_event: Optional[TaskEventCallback] = None,
) -> APIRouter:
    """
    构建通用 MCP JSON-RPC Router。

    支持方法：
    - ping
    - tools/list
    - tools/call
    - tools/submit (可选异步)
    - tasks/get (可选异步)
    - tasks/cancel (可选异步)
    """
    tool_defs = [tool for tool in manifest_tools if isinstance(tool, dict) and tool.get("name") in tool_handlers]
    task_store: dict[str, PluginTask] = {}
    router = APIRouter(prefix="/mcp")

    def _rpc_error(code: int, message: str, request_id: Any) -> dict:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": code, "message": message},
        }

    def _wrap_tool_result(data: Any) -> dict:
        if isinstance(data, dict) and "code" in data:
            payload = data
        else:
            payload = {"code": 200, "message": "success", "data": data}
        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(payload, ensure_ascii=False),
                }
            ]
        }

    async def _invoke_handler(handler: ToolHandler, arguments: dict[str, Any]) -> Any:
        data = handler(arguments)
        if inspect.isawaitable(data):
            data = await data
        return data

    async def _run_task(task: PluginTask, handler: ToolHandler) -> None:
        task_token = _current_task.set(task)
        callback_token = _current_progress_callback.set(on_task_progress)
        event_callback_token = _current_event_callback.set(on_task_event)
        task.status = "running"
        task.started_at = datetime.now()
        await _emit_task_event(task, "task_started")
        await report_task_progress(0.05, "task started")
        try:
            data = await _invoke_handler(handler, task.arguments)
            task.status = "completed"
            task.result = _wrap_tool_result(data)
            await report_task_progress(1.0, "task completed")
            task.completed_at = datetime.now()
            await _emit_task_event(task, "task_completed")
        except asyncio.CancelledError:
            task.status = "cancelled"
            task.message = "task cancelled"
            task.error = "Task cancelled"
            task.completed_at = datetime.now()
            await _emit_task_event(task, "task_cancelled")
        except Exception as exc:
            task.status = "failed"
            task.message = "task failed"
            task.error = str(exc)
            task.completed_at = datetime.now()
            await _emit_task_event(task, "task_failed")
        finally:
            _current_task.reset(task_token)
            _current_progress_callback.reset(callback_token)
            _current_event_callback.reset(event_callback_token)

    @router.post("")
    async def mcp_rpc(payload: JsonRpcRequest):
        method = payload.method
        request_id = payload.id
        if payload.jsonrpc != "2.0":
            return _rpc_error(-32600, "Invalid JSON-RPC version", request_id)

        if method == "ping":
            return {"jsonrpc": "2.0", "id": request_id, "result": {"status": "ok"}}

        if method == "tools/list":
            result: dict[str, Any] = {"tools": tool_defs}
            if enable_async_tasks:
                result["capabilities"] = {
                    "async": True,
                    "task_methods": ["tools/submit", "tasks/get", "tasks/cancel"],
                }
            return {"jsonrpc": "2.0", "id": request_id, "result": result}

        if method == "tools/call":
            params = payload.params or {}
            name = params.get("name")
            arguments = params.get("arguments") or {}
            handler = tool_handlers.get(str(name))
            if not handler:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": json.dumps(
                                    {"code": 404, "message": f"Tool {name} not found", "data": None}, ensure_ascii=False
                                ),
                            }
                        ]
                    },
                }
            data = await _invoke_handler(handler, arguments)
            return {"jsonrpc": "2.0", "id": request_id, "result": _wrap_tool_result(data)}

        if enable_async_tasks and method == "tools/submit":
            params = payload.params or {}
            name = params.get("name")
            arguments = params.get("arguments") or {}
            handler = tool_handlers.get(str(name))
            if not handler:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {"task_id": None, "status": "failed", "error": f"Tool {name} not found"},
                }

            task_id = str(uuid.uuid4())[:8]
            task = PluginTask(task_id=task_id, tool_name=str(name), arguments=arguments)
            task.runner = asyncio.create_task(_run_task(task, handler))
            task_store[task_id] = task
            return {"jsonrpc": "2.0", "id": request_id, "result": {"task_id": task_id, "status": "accepted"}}

        if enable_async_tasks and method == "tasks/get":
            params = payload.params or {}
            task_id = str(params.get("task_id", ""))
            task = task_store.get(task_id)
            if not task:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {"task_id": task_id, "status": "not_found", "error": "Task not found"},
                }
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "task_id": task.task_id,
                    "status": task.status,
                    "progress": task.progress,
                    "message": task.message,
                    "result": task.result,
                    "error": task.error,
                },
            }

        if enable_async_tasks and method == "tasks/cancel":
            params = payload.params or {}
            task_id = str(params.get("task_id", ""))
            task = task_store.get(task_id)
            if not task:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {"task_id": task_id, "cancelled": False, "reason": "Task not found"},
                }
            if task.runner and not task.runner.done():
                task.runner.cancel()
            return {"jsonrpc": "2.0", "id": request_id, "result": {"task_id": task_id, "cancelled": True}}

        return _rpc_error(-32601, f"Method {method} not found", request_id)

    return router
