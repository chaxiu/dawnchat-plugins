import argparse
import json
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from app.config import load_manifest, resolve_plugin_id
from mcp import build_plugin_mcp_router


def create_app(plugin_root: Path) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI):
        print(json.dumps({"status": "ready", "service": "python-sidecar"}), file=sys.stderr, flush=True)
        yield

    app = FastAPI(lifespan=lifespan)
    plugin_id = resolve_plugin_id()
    manifest = load_manifest(plugin_root)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "plugin_id": plugin_id, "service": "python-sidecar"}

    app.include_router(build_plugin_mcp_router(manifest, plugin_id))
    return app


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8081)
    args, _ = parser.parse_known_args()
    plugin_root = Path(__file__).resolve().parents[3]
    app = create_app(plugin_root)

    import uvicorn

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ in {"__main__", "__mp_main__"}:
    main()
