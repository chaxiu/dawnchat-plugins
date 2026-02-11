from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Literal, Optional

from .host_transport import DEFAULT_ASYNC_TIMEOUT, DEFAULT_TIMEOUT, ProgressCallback
from .task_handle import ToolTaskHandle
from .tool_errors import ToolExecutionError, map_host_error

if TYPE_CHECKING:
    from .host_client import HostClient

ToolCallMode = Literal["auto", "sync", "async"]


@dataclass
class ToolCallOptions:
    timeout: float = DEFAULT_TIMEOUT
    mode: ToolCallMode = "auto"


class ToolGateway:
    """Unified SDK gateway for sync/async tool calls."""

    def __init__(self, client: HostClient) -> None:
        self._client = client

    async def call_sync(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        *,
        timeout: float = DEFAULT_TIMEOUT,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        try:
            return await self._client._call_tool(
                tool_name=tool_name,
                arguments=arguments,
                timeout=timeout,
                on_progress=on_progress,
            )
        except Exception as exc:
            raise map_host_error(exc) from exc

    async def call_async(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        *,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> ToolTaskHandle:
        payload = {
            "tool_name": tool_name,
            "arguments": arguments or {},
            "timeout": timeout,
        }
        try:
            response = await self._client._request("POST", "/sdk/tools/call", json=payload)
        except Exception as exc:
            raise map_host_error(exc) from exc

        mode = str(response.get("mode") or "")
        if mode == "async":
            task_id = response.get("task_id")
            if not task_id:
                raise ToolExecutionError("Async task response missing task_id")
            return ToolTaskHandle(
                self,
                task_id=str(task_id),
                timeout=timeout if timeout > DEFAULT_TIMEOUT else DEFAULT_ASYNC_TIMEOUT,
                initial_status="pending",
            )

        sync_result = response.get("result")
        if isinstance(sync_result, dict) and "content" in sync_result:
            sync_result = sync_result["content"]
        return ToolTaskHandle(
            self,
            task_id=None,
            timeout=timeout,
            initial_status="completed",
            immediate_result=sync_result,
        )

    async def call(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        *,
        timeout: float = DEFAULT_TIMEOUT,
        mode: ToolCallMode = "auto",
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        if mode == "sync":
            return await self.call_sync(tool_name, arguments, timeout=timeout, on_progress=on_progress)

        if mode == "async":
            handle = await self.call_async(tool_name, arguments, timeout=timeout)
            return await handle.wait(timeout=timeout, on_progress=on_progress)

        return await self.call_sync(tool_name, arguments, timeout=timeout, on_progress=on_progress)

    async def submit(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        *,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> ToolTaskHandle:
        return await self.call_async(tool_name, arguments=arguments, timeout=timeout)

    async def get_task_status(self, task_id: str) -> dict[str, Any]:
        try:
            return await self._client._request("GET", f"/sdk/tasks/{task_id}")
        except Exception as exc:
            raise map_host_error(exc) from exc

    async def cancel_task(self, task_id: str) -> dict[str, Any]:
        try:
            return await self._client._request("DELETE", f"/sdk/tasks/{task_id}")
        except Exception as exc:
            raise map_host_error(exc) from exc
