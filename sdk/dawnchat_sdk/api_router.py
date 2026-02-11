from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .host_client import HostClient
from .tool_gateway import ToolCallMode, ToolGateway
from .tool_errors import ToolCallError


class ToolCallRequest(BaseModel):
    tool_name: str = Field(..., description="Tool full name")
    arguments: dict[str, Any] = Field(default_factory=dict)
    timeout: float = Field(default=120.0, ge=1.0, le=7200.0)
    mode: ToolCallMode = "auto"


class ToolSubmitRequest(BaseModel):
    tool_name: str = Field(..., description="Tool full name")
    arguments: dict[str, Any] = Field(default_factory=dict)
    timeout: float = Field(default=120.0, ge=1.0, le=7200.0)



def create_tool_proxy_router(
    *,
    host_client: Optional[HostClient] = None,
    prefix: str = "/api/sdk",
) -> APIRouter:
    """Create reusable FastAPI router for proxying tool calls from Vue plugins."""
    client = host_client or HostClient()
    gateway = ToolGateway(client)
    router = APIRouter(prefix=prefix)

    @router.post("/tools/call")
    async def tools_call(request: ToolCallRequest) -> dict[str, Any]:
        try:
            if request.mode == "async":
                handle = await gateway.submit(
                    request.tool_name,
                    arguments=request.arguments,
                    timeout=request.timeout,
                )
                if handle.task_id:
                    return {
                        "status": "accepted",
                        "mode": "async",
                        "task_id": handle.task_id,
                    }

                result = await handle.wait(timeout=request.timeout)
                return {"status": "success", "mode": "sync", "result": result}

            result = await gateway.call(
                request.tool_name,
                arguments=request.arguments,
                timeout=request.timeout,
                mode=request.mode,
            )
            return {"status": "success", "mode": "sync", "result": result}
        except ToolCallError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @router.post("/tools/submit")
    async def tools_submit(request: ToolSubmitRequest) -> dict[str, Any]:
        try:
            handle = await gateway.submit(
                request.tool_name,
                arguments=request.arguments,
                timeout=request.timeout,
            )
            if not handle.task_id:
                result = await handle.wait(timeout=request.timeout)
                return {"status": "success", "mode": "sync", "result": result}
            return {
                "status": "accepted",
                "mode": "async",
                "task_id": handle.task_id,
            }
        except ToolCallError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @router.get("/tasks/{task_id}")
    async def tasks_get(task_id: str) -> dict[str, Any]:
        try:
            return await gateway.get_task_status(task_id)
        except ToolCallError as exc:
            detail = str(exc)
            status_code = 404 if "not found" in detail.lower() else 500
            raise HTTPException(status_code=status_code, detail=detail) from exc

    @router.delete("/tasks/{task_id}")
    async def tasks_cancel(task_id: str) -> dict[str, Any]:
        try:
            return await gateway.cancel_task(task_id)
        except ToolCallError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    return router
