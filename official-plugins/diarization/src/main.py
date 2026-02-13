import argparse
import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import APIRouter, FastAPI

from dawnchat_sdk import report_task_progress, setup_plugin_logging
from diarization_service import DiarizationService
from mcp import build_mcp_router

logger = setup_plugin_logging("diarization", level=20)
service = DiarizationService()


def load_manifest(base_dir: Path) -> dict[str, Any]:
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
        logger.info("Diarization plugin ready")
        yield

    app = FastAPI(lifespan=lifespan)
    manifest = load_manifest(base_dir.parent)
    manifest_tools = manifest.get("capabilities", {}).get("tools", [])
    plugin_id = os.environ.get("DAWNCHAT_PLUGIN_ID", "")
    host_port = os.environ.get("DAWNCHAT_HOST_PORT", "")

    async def diarize(arguments: dict[str, Any]) -> dict[str, Any]:
        await report_task_progress(0.05, "checking model")
        if not service.is_available():
            await report_task_progress(1.0, "model unavailable")
            return {
                "code": 503,
                "message": "Speaker diarization model unavailable",
                "data": {"error_code": "model_unavailable", "model_path": service.get_status().get("model_path")},
            }

        await report_task_progress(0.2, "running diarization")
        result = await service.diarize(
            audio_path=str(arguments.get("audio_path", "")),
            num_speakers=arguments.get("num_speakers"),
            min_speakers=arguments.get("min_speakers"),
            max_speakers=arguments.get("max_speakers"),
        )
        if result.get("error"):
            await report_task_progress(1.0, "failed")
            return {"code": 500, "message": result.get("message", "diarization failed"), "data": None}

        await report_task_progress(1.0, "completed")
        return {"code": 200, "message": "success", "data": result}

    async def status(_: dict[str, Any]) -> dict[str, Any]:
        return {"code": 200, "message": "success", "data": service.get_status()}

    async def merge_speakers(arguments: dict[str, Any]) -> dict[str, Any]:
        diarization_segments = arguments.get("diarization_segments") or []
        transcription_segments = arguments.get("transcription_segments") or []
        merged = service.merge_with_transcription(
            diarization_segments=diarization_segments,
            transcription_segments=transcription_segments,
        )
        return {
            "code": 200,
            "message": "success",
            "data": {"segments": merged, "count": len(merged)},
        }

    tool_handlers = {
        "diarize": diarize,
        "status": status,
        "merge_speakers": merge_speakers,
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
