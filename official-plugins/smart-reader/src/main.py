import argparse
import importlib
import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

def create_app(base_dir: Path) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI):
        ensure_data_dirs = _load_attr("smart_reader.core.config", "ensure_data_dirs")
        ensure_data_dirs()
        print(json.dumps({"status": "ready"}), file=sys.stderr, flush=True)
        yield

    app = FastAPI(lifespan=lifespan)
    web_dir = base_dir / "web"
    base_path = os.environ.get("DAWNCHAT_PLUGIN_BASE_PATH", "").strip().rstrip("/")

    def render_index_html() -> str:
        html_path = web_dir / "index.html"
        html = html_path.read_text(encoding="utf-8")
        if base_path:
            asset_prefix = f"{base_path}/assets/"
            html = html.replace('="/assets/', f'="{asset_prefix}')
            html = html.replace("='/assets/", f"='{asset_prefix}")
        return html

    @app.get("/")
    async def root():
        return HTMLResponse(render_index_html())

    app.include_router(_load_router("smart_reader.api.library"))
    app.include_router(_load_router("smart_reader.api.session"))
    app.include_router(_load_router("smart_reader.api.chat"))
    app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="web")
    return app


def _load_router(module_path: str):
    module = importlib.import_module(module_path)
    return module.router


def _load_attr(module_path: str, name: str):
    module = importlib.import_module(module_path)
    return getattr(module, name)


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
