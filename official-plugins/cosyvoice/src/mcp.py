import inspect
import json
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel


class JsonRpcRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    method: str
    params: Optional[dict[str, Any]] = None


def build_mcp_router(manifest_tools: list[dict], tool_handlers: dict[str, Any]) -> APIRouter:
    tool_defs = [
        tool
        for tool in manifest_tools
        if isinstance(tool, dict) and tool.get("name") in tool_handlers
    ]
    router = APIRouter(prefix="/mcp")

    def _wrap_tool_result(data: dict) -> dict:
        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(
                        {
                            "code": 200,
                            "message": "success",
                            "data": data,
                        },
                        ensure_ascii=False,
                    ),
                }
            ]
        }

    def _rpc_error(code: int, message: str, request_id: Any) -> dict:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": code, "message": message},
        }

    @router.post("")
    async def mcp_rpc(payload: JsonRpcRequest):
        method = payload.method
        request_id = payload.id
        if payload.jsonrpc != "2.0":
            return _rpc_error(-32600, "Invalid JSON-RPC version", request_id)
        if method == "ping":
            return {"jsonrpc": "2.0", "id": request_id, "result": {"status": "ok"}}
        if method == "tools/list":
            return {"jsonrpc": "2.0", "id": request_id, "result": {"tools": tool_defs}}
        if method == "tools/call":
            params = payload.params or {}
            name = params.get("name")
            arguments = params.get("arguments") or {}
            handler = tool_handlers.get(name)
            if not handler:
                result = {
                    "code": 404,
                    "message": f"Tool {name} not found",
                    "data": None,
                }
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "content": [
                            {"type": "text", "text": json.dumps(result, ensure_ascii=False)}
                        ]
                    },
                }
            data = handler(arguments)
            if inspect.isawaitable(data):
                data = await data
            return {"jsonrpc": "2.0", "id": request_id, "result": _wrap_tool_result(data)}
        return _rpc_error(-32601, f"Method {method} not found", request_id)

    return router
