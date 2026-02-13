import asyncio
import importlib
import logging
import time
from typing import Any, Callable, Optional

import httpx

from .host_exceptions import HostAPIError, HostConnectionError, SDKError
from .result_utils import normalize_tool_result

websockets: Any
try:
    import websockets as _websockets
    websockets = _websockets
except ImportError:
    websockets = None
HAS_WEBSOCKETS = websockets is not None

logger = logging.getLogger("dawnchat_sdk")

DEFAULT_TIMEOUT = 120.0
DEFAULT_ASYNC_TIMEOUT = 3600.0
ProgressCallback = Callable[[float, str], None]


class BaseTransport:
    async def request(
        self,
        method: str,
        path: str,
        json: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    async def call_tool(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        timeout: float = DEFAULT_TIMEOUT,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        raise NotImplementedError

    async def list_tools(
        self,
        namespace: Optional[str] = None,
        include_unavailable: bool = False,
    ) -> list[dict[str, Any]]:
        raise NotImplementedError

    async def close(self) -> None:
        return None


class HttpTransport(BaseTransport):
    def __init__(self, host_url: str, host_port: int, plugin_id: str, timeout: float = DEFAULT_TIMEOUT):
        self._host_url = host_url
        self._host_port = host_port
        self._plugin_id = plugin_id
        self._timeout = timeout
        self._http_client: Optional[httpx.AsyncClient] = None

    def _get_http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                base_url=self._host_url,
                timeout=httpx.Timeout(self._timeout),
                headers={
                    "Content-Type": "application/json",
                    "X-Plugin-ID": self._plugin_id,
                },
            )
        return self._http_client

    async def request(
        self,
        method: str,
        path: str,
        json: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        client = self._get_http_client()
        try:
            response = await client.request(
                method=method,
                url=path,
                json=json,
                params=params,
            )
            if response.status_code >= 400:
                try:
                    error_data = response.json()
                    detail = error_data.get("detail", str(error_data))
                except Exception:
                    detail = response.text
                raise HostAPIError(
                    f"Host API error: {response.status_code}",
                    status_code=response.status_code,
                    detail=detail,
                )
            data = response.json()
            if data.get("status") == "error":
                raise HostAPIError(
                    data.get("message", "Unknown error"),
                    detail=data.get("detail"),
                )
            return data
        except httpx.ConnectError as e:
            logger.error(f"Failed to connect to Host at {self._host_url}: {e}")
            raise HostConnectionError(
                f"Unable to connect to Host at {self._host_url}. "
                "Is the DawnChat backend running?"
            ) from e
        except httpx.TimeoutException as e:
            logger.error(f"Request to Host timed out: {e}")
            raise HostConnectionError(
                f"Request to Host timed out after {self._timeout}s"
            ) from e
        except HostAPIError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during Host request: {e}")
            raise SDKError(f"Unexpected error: {e}") from e

    async def call_tool(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        timeout: float = DEFAULT_TIMEOUT,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        payload = {
            "tool_name": tool_name,
            "arguments": arguments or {},
            "timeout": timeout,
        }
        response = await self.request(
            "POST",
            "/sdk/tools/call",
            json=payload,
        )
        if response.get("mode") == "async":
            task_id = response.get("task_id")
            if not task_id:
                raise HostAPIError("Async task response missing task_id")
            logger.info(f"[SDK] Tool '{tool_name}' submitted as async task {task_id}")
            return await self._wait_for_async_task(
                task_id=task_id,
                timeout=timeout if timeout > DEFAULT_TIMEOUT else DEFAULT_ASYNC_TIMEOUT,
                on_progress=on_progress,
            )
        if "result" in response and "content" in response["result"]:
            return normalize_tool_result(response["result"]["content"])
        return normalize_tool_result(response)

    async def list_tools(
        self,
        namespace: Optional[str] = None,
        include_unavailable: bool = False,
    ) -> list[dict[str, Any]]:
        params: dict[str, str] = {}
        if namespace:
            params["namespace"] = namespace
        if include_unavailable:
            params["include_unavailable"] = "true"
        response = await self.request(
            "GET",
            "/sdk/tools/list",
            params=params,
        )
        return response.get("tools", [])

    async def _wait_for_async_task(
        self,
        task_id: str,
        timeout: float = DEFAULT_ASYNC_TIMEOUT,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        if not HAS_WEBSOCKETS:
            return await self._poll_for_task_completion(task_id, timeout, on_progress)
        ws_url = f"ws://127.0.0.1:{self._host_port}/ws/zmp"
        start_time = time.time()
        try:
            async with websockets.connect(ws_url) as ws:
                subscribe_msg = {
                    "protocol": "zmp",
                    "version": "2.0",
                    "type": "task_subscribe",
                    "payload": {"task_id": task_id},
                }
                await ws.send(__import__("json").dumps(subscribe_msg))
                logger.debug(f"[SDK] Subscribed to task {task_id}")
                while True:
                    elapsed = time.time() - start_time
                    if elapsed > timeout:
                        raise HostConnectionError(
                            f"Task {task_id} timed out after {timeout}s"
                        )
                    try:
                        msg_str = await asyncio.wait_for(
                            ws.recv(),
                            timeout=min(30.0, timeout - elapsed),
                        )
                        msg = __import__("json").loads(msg_str)
                        msg_type = msg.get("type")
                        payload = msg.get("payload", {})
                        if msg_type == "task_progress":
                            if on_progress and payload.get("task_id") == task_id:
                                on_progress(
                                    payload.get("progress", 0),
                                    payload.get("message", ""),
                                )
                        elif msg_type == "task_completed":
                            if payload.get("task_id") == task_id:
                                logger.info(f"[SDK] Task {task_id} completed")
                                result = payload.get("result", {})
                                if isinstance(result, dict) and "content" in result:
                                    return normalize_tool_result(result["content"])
                                return normalize_tool_result(result)
                        elif msg_type == "task_failed":
                            if payload.get("task_id") == task_id:
                                error = payload.get("error", "Unknown error")
                                logger.error(f"[SDK] Task {task_id} failed: {error}")
                                raise HostAPIError(f"Task failed: {error}")
                    except asyncio.TimeoutError:
                        continue
        except Exception as e:
            if isinstance(e, (HostConnectionError, HostAPIError)):
                raise
            logger.error(f"[SDK] WebSocket error: {e}")
            return await self._poll_for_task_completion(
                task_id,
                timeout - (time.time() - start_time),
                on_progress,
            )

    async def _poll_for_task_completion(
        self,
        task_id: str,
        timeout: float,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        start_time = time.time()
        poll_interval = 2.0
        last_progress: Optional[float] = None
        last_message: Optional[str] = None
        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout:
                raise HostConnectionError(
                    f"Task {task_id} timed out after {timeout}s"
                )
            try:
                response = await self.request(
                    "GET",
                    f"/sdk/tasks/{task_id}",
                )
                task = response.get("task", {})
                status = task.get("status")
                if on_progress:
                    progress = task.get("progress", 0.0)
                    message = task.get("progress_message", "")
                    if progress != last_progress or message != last_message:
                        on_progress(progress, message)
                        last_progress = progress
                        last_message = message
                if status == "completed":
                    logger.info(f"[SDK] Task {task_id} completed (polling)")
                    result = task.get("result", {})
                    if isinstance(result, dict) and "content" in result:
                        return normalize_tool_result(result["content"])
                    return normalize_tool_result(result)
                if status in ("failed", "cancelled"):
                    error = task.get("error", "Unknown error")
                    raise HostAPIError(f"Task failed: {error}")
                await asyncio.sleep(poll_interval)
            except HostAPIError:
                raise
            except Exception as e:
                logger.warning(f"[SDK] Poll error: {e}")
                await asyncio.sleep(poll_interval)

    async def close(self) -> None:
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
            self._http_client = None


class InProcessTransport(BaseTransport):
    def __init__(self, plugin_id: str, fallback_http: HttpTransport):
        self._plugin_id = plugin_id
        self._fallback_http = fallback_http

    async def request(
        self,
        method: str,
        path: str,
        json: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        return await self._fallback_http.request(method, path, json=json, params=params)

    async def list_tools(
        self,
        namespace: Optional[str] = None,
        include_unavailable: bool = False,
    ) -> list[dict[str, Any]]:
        tools_module = importlib.import_module("app.tools")
        models_module = importlib.import_module("app.tools.models")
        manager = tools_module.get_tool_manager()
        ExecutionStrategy = models_module.ExecutionStrategy
        tools = await manager.list_tools(
            namespace=namespace,
            include_unavailable=include_unavailable,
        )
        tool_list = []
        for tool in tools:
            tool_list.append({
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.input_schema,
                "category": tool.category.value if tool.category else None,
                "icon": tool.icon,
                "tags": tool.tags,
                "execution_strategy": tool.execution_strategy.value
                if isinstance(tool.execution_strategy, ExecutionStrategy)
                else str(tool.execution_strategy),
                "duration_hint": tool.duration_hint.value,
                "supports_progress": tool.supports_progress,
            })
        return tool_list

    async def call_tool(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        timeout: float = DEFAULT_TIMEOUT,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        tools_module = importlib.import_module("app.tools")
        manager = tools_module.get_tool_manager()
        decision = manager.get_dispatch_decision(
            tool_name,
            context={"caller": "sdk_inprocess", "plugin_id": self._plugin_id, "prefer_async": True},
        )
        if decision.run_async:
            task_id = await manager.submit_tool_call(
                tool_name=tool_name,
                arguments=arguments or {},
                timeout=timeout,
                plugin_id=self._plugin_id,
                context={"caller": "sdk_inprocess", "route_reason": decision.reason},
            )
            return await self._wait_for_task_completion(
                task_id=task_id,
                timeout=timeout if timeout > DEFAULT_TIMEOUT else DEFAULT_ASYNC_TIMEOUT,
                on_progress=on_progress,
            )
        result = await manager.call_tool(
            tool_name=tool_name,
            arguments=arguments or {},
            timeout=timeout,
        )
        return normalize_tool_result(result.content)

    async def _wait_for_task_completion(
        self,
        task_id: str,
        timeout: float,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        task_module = importlib.import_module("app.services.task_manager")
        task_manager = task_module.get_task_manager()
        start_time = time.time()
        poll_interval = 0.2
        last_progress: Optional[float] = None
        last_message: Optional[str] = None
        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout:
                raise HostConnectionError(
                    f"Task {task_id} timed out after {timeout}s"
                )
            task = task_manager.get_task_status(task_id)
            if task:
                status = task.get("status")
                if on_progress:
                    progress = task.get("progress", 0.0)
                    message = task.get("progress_message", "")
                    if progress != last_progress or message != last_message:
                        on_progress(progress, message)
                        last_progress = progress
                        last_message = message
                if status == "completed":
                    result = task.get("result", {})
                    if isinstance(result, dict) and "content" in result:
                        return normalize_tool_result(result["content"])
                    return normalize_tool_result(result)
                if status in ("failed", "cancelled"):
                    error = task.get("error", "Unknown error")
                    raise HostAPIError(f"Task failed: {error}")
            await asyncio.sleep(poll_interval)

    async def close(self) -> None:
        await self._fallback_http.close()
