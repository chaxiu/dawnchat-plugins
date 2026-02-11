from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Optional, Protocol

from .host_transport import DEFAULT_ASYNC_TIMEOUT, ProgressCallback
from .tool_errors import ToolCancelledError, ToolExecutionError, map_host_error


@dataclass
class TaskSnapshot:
    task_id: Optional[str]
    status: str
    progress: float
    message: str
    result: Any = None
    error: Optional[str] = None


class ToolTaskHandle:
    def __init__(
        self,
        gateway: "ToolGatewayProtocol",
        *,
        task_id: Optional[str],
        timeout: float = DEFAULT_ASYNC_TIMEOUT,
        initial_status: str = "pending",
        immediate_result: Any = None,
        immediate_error: Optional[str] = None,
    ) -> None:
        self._gateway = gateway
        self.task_id = task_id
        self._timeout = timeout
        self._initial_status = initial_status
        self._immediate_result = immediate_result
        self._immediate_error = immediate_error

    async def status(self) -> TaskSnapshot:
        if not self.task_id:
            progress = 1.0 if self._initial_status in {"completed", "failed", "cancelled"} else 0.0
            return TaskSnapshot(
                task_id=None,
                status=self._initial_status,
                progress=progress,
                message=self._initial_status,
                result=self._immediate_result,
                error=self._immediate_error,
            )

        payload = await self._gateway.get_task_status(self.task_id)
        task = payload.get("task") or payload
        status = str(task.get("status") or "pending")
        progress = _normalize_progress(task.get("progress", 0.0))
        message = str(task.get("progress_message") or task.get("message") or "")
        return TaskSnapshot(
            task_id=self.task_id,
            status=status,
            progress=progress,
            message=message,
            result=task.get("result"),
            error=task.get("error"),
        )

    async def cancel(self) -> bool:
        if not self.task_id:
            return False
        response = await self._gateway.cancel_task(self.task_id)
        return str(response.get("status", "")).lower() == "success"

    async def wait(
        self,
        *,
        timeout: Optional[float] = None,
        poll_interval: float = 0.5,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        if not self.task_id:
            if self._initial_status == "failed":
                raise ToolExecutionError(self._immediate_error or "Tool call failed")
            if self._initial_status == "cancelled":
                raise ToolCancelledError(self._immediate_error or "Task cancelled")
            return self._immediate_result

        deadline = (timeout if timeout is not None else self._timeout)
        start = asyncio.get_event_loop().time()
        last_progress = -1.0
        last_message = ""

        while True:
            elapsed = asyncio.get_event_loop().time() - start
            if elapsed > deadline:
                raise ToolExecutionError(f"Task {self.task_id} timed out after {deadline}s")

            snapshot = await self.status()
            if on_progress and (
                snapshot.progress != last_progress or snapshot.message != last_message
            ):
                on_progress(snapshot.progress, snapshot.message)
                last_progress = snapshot.progress
                last_message = snapshot.message

            if snapshot.status == "completed":
                return _extract_result_content(snapshot.result)
            if snapshot.status == "failed":
                raise ToolExecutionError(snapshot.error or "Task failed")
            if snapshot.status == "cancelled":
                raise ToolCancelledError(snapshot.error or "Task cancelled")

            await asyncio.sleep(max(0.05, poll_interval))


class ToolGatewayProtocol(Protocol):
    async def get_task_status(self, task_id: str) -> dict[str, Any]:
        ...

    async def cancel_task(self, task_id: str) -> dict[str, Any]:
        ...



def _normalize_progress(raw: Any) -> float:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        value = 0.0
    if value > 1.0:
        value = value / 100.0
    return max(0.0, min(1.0, value))



def _extract_result_content(result: Any) -> Any:
    if isinstance(result, dict) and "content" in result:
        return result.get("content")
    return result


__all__ = ["TaskSnapshot", "ToolTaskHandle", "map_host_error"]
