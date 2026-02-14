import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from comfyui_plugin.tools import ComfyUITools
from dawnchat_sdk import setup_plugin_logging

from importlib import import_module

build_mcp_router = import_module("mcp").build_mcp_router

logger = setup_plugin_logging("comfyui", level=20)


class DownloadStartRequest(BaseModel):
    resume: bool = True
    use_mirror: bool | None = None

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
        logger.info("ComfyUI plugin ready")
        yield

    app = FastAPI(lifespan=lifespan)
    web_dir = base_dir.parent / "web"
    manifest = load_manifest(base_dir.parent)
    manifest_tools = manifest.get("capabilities", {}).get("tools", [])
    plugin_id = os.environ.get("DAWNCHAT_PLUGIN_ID", "")
    host_port = os.environ.get("DAWNCHAT_HOST_PORT", "")

    tools = ComfyUITools(base_dir)

    tool_handlers = {
        "text_to_image": tools.text_to_image,
        "image_to_image": tools.image_to_image,
        "inpaint": tools.inpaint,
        "upscale": tools.upscale,
        "status": lambda _: tools.status(),
        "list_workflows": lambda args: tools.list_workflows(args.get("task_type")),
        "models_list": lambda _: tools.list_models(),
        "models_download": tools.start_model_download,
        "models_download_status": tools.get_model_download_status,
        "models_download_pause": tools.pause_model_download,
        "models_download_cancel": tools.cancel_model_download,
        "models_download_pending": lambda _: tools.list_pending_model_downloads(),
    }

    api_router = APIRouter(prefix="/api")

    @api_router.get("/health")
    async def health():
        return {"status": "ok"}

    @api_router.get("/info")
    async def info():
        return {"status": "ok", "plugin_id": plugin_id, "host_port": host_port}

    @api_router.get("/models")
    async def list_models():
        return await tools.list_models({})

    @api_router.post("/models/{model_id}/download")
    async def start_download(model_id: str, request: DownloadStartRequest):
        return await tools.start_model_download(
            {
                "model_id": model_id,
                "resume": request.resume,
                "use_mirror": request.use_mirror,
            }
        )

    @api_router.get("/models/{model_id}/download/status")
    async def download_status(model_id: str):
        return await tools.get_model_download_status({"model_id": model_id})

    @api_router.post("/models/{model_id}/download/pause")
    async def pause_download(model_id: str):
        return await tools.pause_model_download({"model_id": model_id})

    @api_router.post("/models/{model_id}/download/cancel")
    async def cancel_download(model_id: str):
        return await tools.cancel_model_download({"model_id": model_id})

    @api_router.get("/models/download/pending")
    async def pending_downloads():
        return await tools.list_pending_model_downloads({})

    mcp_router = build_mcp_router(manifest_tools, tool_handlers)
    app.include_router(api_router)
    app.include_router(mcp_router)

    if web_dir.exists():
        @app.get("/")
        async def root():
            html_path = web_dir / "index.html"
            return HTMLResponse(html_path.read_text(encoding="utf-8"))

        app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="web")

    return app


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args, _ = parser.parse_known_args()

    base_dir = Path(__file__).parent
    app = create_app(base_dir)

    import uvicorn

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ in {"__main__", "__mp_main__"}:
    main()
