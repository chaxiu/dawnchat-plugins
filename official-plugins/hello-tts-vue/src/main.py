import argparse
import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from dawnchat_sdk import create_tool_proxy_router, host
from dawnchat_sdk.result_utils import extract_result_data
from dawnchat_sdk.tool_gateway import ToolGateway
from mcp import build_mcp_router


def load_manifest(base_dir: Path) -> dict[str, Any]:
    manifest_path = base_dir / "manifest.json"
    if not manifest_path.exists():
        return {}
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _normalize_result(raw: Any) -> Any:
    if isinstance(raw, dict) and "content" in raw:
        return raw.get("content")
    return raw


def _extract_output_path(task: dict[str, Any]) -> Optional[str]:
    result = _normalize_result(task.get("result"))

    # MCP routers may wrap tool result as list[{type: text, text: json-string}]
    if isinstance(result, list) and result:
        first = result[0]
        if isinstance(first, dict) and isinstance(first.get("text"), str):
            try:
                result = json.loads(first["text"])
            except Exception:
                result = None

    if isinstance(result, dict):
        payload = extract_result_data(result)
        if payload:
            path = str(payload.get("output_path") or "").strip()
            return path or None
        path = str(result.get("output_path") or "").strip()
        return path or None

    return None


def create_app(base_dir: Path, host_client=None) -> FastAPI:
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

    sdk_host = host_client or host
    gateway = ToolGateway(sdk_host)

    api_router = APIRouter(prefix="/api")

    @api_router.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @api_router.get("/info")
    async def info() -> dict[str, str]:
        return {
            "status": "ok",
            "plugin_id": plugin_id,
            "host_port": host_port,
        }

    @api_router.get("/tts/audio/{task_id}")
    async def tts_audio(task_id: str) -> FileResponse:
        payload = await gateway.get_task_status(task_id)
        task = payload.get("task") if isinstance(payload, dict) else None
        if not isinstance(task, dict):
            raise HTTPException(status_code=404, detail="task not found")
        output_path = _extract_output_path(task)
        if not output_path:
            raise HTTPException(status_code=404, detail="audio not found")

        audio_path = Path(output_path)
        if not audio_path.exists() or not audio_path.is_file():
            raise HTTPException(status_code=404, detail="audio not found")

        return FileResponse(path=str(audio_path), media_type="audio/wav", filename=audio_path.name)

    mcp_router = build_mcp_router(manifest_tools, {})

    def _render_index_html() -> str:
        html_path = web_dir / "index.html"
        html = html_path.read_text(encoding="utf-8")
        if base_path:
            asset_prefix = f"{base_path}/assets/"
            html = html.replace('="/assets/', f'="{asset_prefix}')
            html = html.replace("='/assets/", f"='{asset_prefix}")
        return html

    @app.get("/")
    async def root() -> HTMLResponse:
        return HTMLResponse(_render_index_html())

    app.include_router(api_router)
    app.include_router(create_tool_proxy_router(host_client=sdk_host, prefix="/api/sdk"))
    app.include_router(mcp_router)
    app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="web")
    return app


def main() -> None:
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
