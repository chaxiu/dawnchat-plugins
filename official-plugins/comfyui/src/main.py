import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI

from comfyui_plugin.tools import ComfyUITools
from dawnchat_sdk import setup_plugin_logging

from importlib import import_module

build_mcp_router = import_module("mcp").build_mcp_router

logger = setup_plugin_logging("comfyui", level=20)

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
    }

    api_router = APIRouter(prefix="/api")

    @api_router.get("/health")
    async def health():
        return {"status": "ok"}

    @api_router.get("/info")
    async def info():
        return {"status": "ok", "plugin_id": plugin_id, "host_port": host_port}

    mcp_router = build_mcp_router(manifest_tools, tool_handlers)
    app.include_router(api_router)
    app.include_router(mcp_router)
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
