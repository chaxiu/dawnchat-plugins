import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI

from importlib import import_module

base_dir = Path(__file__).parent
vibevoice_src = base_dir / "vibevoice"
if vibevoice_src.exists():
    sys.path.insert(0, str(vibevoice_src))

from vibevoice_plugin import handlers
from dawnchat_sdk import setup_plugin_logging

build_mcp_router = import_module("mcp").build_mcp_router

logger = setup_plugin_logging("vibevoice", level=20)

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
        logger.info("VibeVoice plugin ready")
        yield

    app = FastAPI(lifespan=lifespan)
    manifest = load_manifest(base_dir.parent)
    manifest_tools = manifest.get("capabilities", {}).get("tools", [])
    plugin_id = os.environ.get("DAWNCHAT_PLUGIN_ID", "")
    host_port = os.environ.get("DAWNCHAT_HOST_PORT", "")

    tool_handlers = {
        "tts_synthesize": handlers.synthesize,
        "tts_list_voices": handlers.list_voices,
        "tts_status": handlers.status,
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
