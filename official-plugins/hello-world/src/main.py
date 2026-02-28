import argparse
import asyncio
import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from dawnchat_sdk import host, report_task_progress
from mcp import build_mcp_router


class ChatRequest(BaseModel):
    prompt: str
    temperature: float = 0.7


class KVSetRequest(BaseModel):
    key: str
    value: Any


class ToolCallRequest(BaseModel):
    name: str
    arguments: dict[str, Any] | None = None
    timeout: float | None = None

def load_manifest(base_dir: Path) -> dict:
    manifest_path = base_dir / "manifest.json"
    if not manifest_path.exists():
        return {}
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def create_app(base_dir: Path) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI):
        print(json.dumps({"status": "ready"}), file=sys.stderr, flush=True)
        yield

    app = FastAPI(lifespan=lifespan)
    web_dir = base_dir / "web"
    manifest = load_manifest(base_dir)
    manifest_tools = manifest.get("capabilities", {}).get("tools", [])
    plugin_id = os.environ.get("DAWNCHAT_PLUGIN_ID", "")
    host_port = os.environ.get("DAWNCHAT_HOST_PORT", "")
    base_path = os.environ.get("DAWNCHAT_PLUGIN_BASE_PATH", "").strip().rstrip("/")

    async def _tool_hello_world(arguments: dict) -> dict:
        name = str(arguments.get("name", "")).strip() or "World"
        return {"greeting": f"Hello, {name}!"}

    async def _tool_hello_world_async(arguments: dict) -> dict:
        name = str(arguments.get("name", "")).strip() or "World"
        delay_seconds = arguments.get("delay_seconds", 2)
        try:
            delay = float(delay_seconds)
        except (TypeError, ValueError):
            delay = 2.0
        delay = max(0.0, min(delay, 30.0))
        await report_task_progress(0.1, "preparing async greeting")
        steps = 5
        for idx in range(steps):
            await asyncio.sleep(delay / steps if steps > 0 else delay)
            await report_task_progress(
                0.1 + 0.8 * ((idx + 1) / steps),
                f"processing {idx + 1}/{steps}",
            )
        return {"greeting": f"Hello async, {name}!", "delay_seconds": delay}

    tool_handlers = {
        "hello_world": _tool_hello_world,
        "hello_world_async": _tool_hello_world_async,
    }

    api_router = APIRouter(prefix="/api")

    @api_router.get("/health")
    async def health():
        return {"status": "ok"}

    @api_router.get("/info")
    async def info():
        return {
            "status": "ok",
            "plugin_id": plugin_id,
            "host_port": host_port,
        }

    @api_router.post("/sdk/ai")
    async def sdk_ai(request: ChatRequest):
        try:
            response = await host.ai.chat(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": request.prompt},
                ],
                temperature=request.temperature,
            )
            return {
                "status": "ok",
                "content": response.get("content", ""),
                "model": response.get("model", ""),
                "usage": response.get("usage", {}),
            }
        except Exception as exc:
            return {"status": "error", "message": str(exc)}

    @api_router.get("/sdk/tools")
    async def sdk_tools(limit: Optional[int] = 100):
        try:
            tools = await host.tools.list()
            if limit is not None:
                tools = tools[: max(1, limit)]
            return {"status": "ok", "tools": tools}
        except Exception as exc:
            return {"status": "error", "message": str(exc), "tools": []}

    @api_router.post("/sdk/tools/call")
    async def sdk_tools_call(request: ToolCallRequest):
        try:
            if request.timeout is None:
                result = await host.tools.call(
                    request.name,
                    arguments=request.arguments or {},
                )
            else:
                result = await host.tools.call(
                    request.name,
                    arguments=request.arguments or {},
                    timeout=request.timeout,
                )
            return {"status": "ok", "result": result}
        except Exception as exc:
            return {"status": "error", "message": str(exc), "result": None}

    @api_router.get("/sdk/kv")
    async def sdk_kv_get(key: str):
        try:
            value = await host.storage.kv.get(key)
            return {"status": "ok", "value": value}
        except Exception as exc:
            return {"status": "error", "message": str(exc), "value": None}

    @api_router.post("/sdk/kv")
    async def sdk_kv_set(request: KVSetRequest):
        try:
            ok = await host.storage.kv.set(request.key, request.value)
            return {"status": "ok", "saved": ok}
        except Exception as exc:
            return {"status": "error", "message": str(exc), "saved": False}

    mcp_router = build_mcp_router(manifest_tools, tool_handlers)

    def _render_index_html() -> str:
        html_path = web_dir / "index.html"
        html = html_path.read_text(encoding="utf-8")
        if base_path:
            asset_prefix = f"{base_path}/assets/"
            html = html.replace('="/assets/', f'="{asset_prefix}')
            html = html.replace("='/assets/", f"='{asset_prefix}")
        return html

    @app.get("/")
    async def root():
        return HTMLResponse(_render_index_html())

    app.include_router(api_router)
    app.include_router(mcp_router)
    app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="web")
    return app

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args, _ = parser.parse_known_args()
    
    base_dir = Path(__file__).parent.parent
    web_dir = base_dir / "web"
    if not web_dir.exists():
        raise FileNotFoundError(f"web directory not found: {web_dir}")

    app = create_app(base_dir)
    
    import uvicorn
    
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")

if __name__ in {"__main__", "__mp_main__"}:
    main()
