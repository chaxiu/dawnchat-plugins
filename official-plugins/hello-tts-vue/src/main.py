import argparse
import asyncio
import json
import os
import sys
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from dawnchat_sdk import host
from mcp import build_mcp_router


@dataclass
class SynthesisJob:
    job_id: str
    status: str = "pending"
    progress: float = 0.0
    message: str = "queued"
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    output_path: Optional[str] = None
    created_at: float = field(default_factory=lambda: asyncio.get_event_loop().time())
    updated_at: float = field(default_factory=lambda: asyncio.get_event_loop().time())

    def to_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "result": self.result,
            "error": self.error,
            "output_path": self.output_path,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class SynthesizeRequest(BaseModel):
    text: str = Field(min_length=1)
    engine: str = "vibevoice"
    quality: str = "fast"
    mode: str = "instruct2"
    speaker: Optional[str] = None
    model_id: Optional[str] = None
    speed: Optional[float] = None
    text_frontend: Optional[bool] = None


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, SynthesisJob] = {}
        self._lock = asyncio.Lock()

    async def create(self) -> SynthesisJob:
        async with self._lock:
            job_id = str(uuid.uuid4())[:8]
            job = SynthesisJob(job_id=job_id)
            self._jobs[job_id] = job
            return job

    async def get(self, job_id: str) -> Optional[SynthesisJob]:
        async with self._lock:
            return self._jobs.get(job_id)

    async def update(
        self,
        job_id: str,
        *,
        status: Optional[str] = None,
        progress: Optional[float] = None,
        message: Optional[str] = None,
        result: Optional[dict[str, Any]] = None,
        error: Optional[str] = None,
        output_path: Optional[str] = None,
    ) -> Optional[SynthesisJob]:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            if status is not None:
                job.status = status
            if progress is not None:
                job.progress = self._normalize_progress(progress, floor=job.progress)
            if message is not None:
                job.message = str(message)
            if result is not None:
                job.result = result
            if error is not None:
                job.error = error
            if output_path is not None:
                job.output_path = output_path
            job.updated_at = asyncio.get_event_loop().time()
            return job

    @staticmethod
    def _normalize_progress(progress: float, floor: float = 0.0) -> float:
        value = float(progress)
        if value > 1.0:
            value /= 100.0
        value = max(0.0, min(1.0, value))
        # Keep progress monotonic for stable UI.
        return max(floor, value)


job_store = JobStore()


def load_manifest(base_dir: Path) -> dict[str, Any]:
    manifest_path = base_dir / "manifest.json"
    if not manifest_path.exists():
        return {}
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _normalize_tool_result(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict) and "code" in raw:
        return raw
    return {"code": 200, "message": "success", "data": raw}


async def _list_models(engine: str) -> list[dict[str, Any]]:
    resp = await host.tools.call("dawnchat.tts.list_models", arguments={"engine": engine})
    payload = _normalize_tool_result(resp)
    if payload.get("code") != 200:
        raise HTTPException(status_code=502, detail=payload.get("message", "failed to list models"))
    data = payload.get("data") or {}
    models = data.get("models") if isinstance(data, dict) else []
    if not isinstance(models, list):
        return []
    return [m for m in models if isinstance(m, dict)]


async def _list_speakers(engine: str, model_id: Optional[str], quality: str) -> list[str]:
    engine_value = str(engine or "").strip().lower()
    if engine_value == "cosyvoice":
        if not model_id:
            return []
        resp = await host.tools.call(
            "dawnchat.tts.list_speakers",
            arguments={"engine": "cosyvoice", "model_id": model_id},
        )
        payload = _normalize_tool_result(resp)
        if payload.get("code") != 200:
            return []
        data = payload.get("data") or {}
        speakers = data.get("speakers") if isinstance(data, dict) else []
        if not isinstance(speakers, list):
            return []
        return sorted({str(item).strip() for item in speakers if str(item).strip()})

    resp = await host.tools.call("dawnchat.tts.list_voices", arguments={"engine": "vibevoice"})
    payload = _normalize_tool_result(resp)
    if payload.get("code") != 200:
        return []
    data = payload.get("data") or {}
    voices: list[str] = []
    if isinstance(data, dict):
        by_quality = data.get("by_quality")
        if isinstance(by_quality, dict):
            quality_voices = by_quality.get(quality)
            if isinstance(quality_voices, list):
                voices = [str(item).strip() for item in quality_voices if str(item).strip()]
        if not voices:
            all_voices = data.get("voices")
            if isinstance(all_voices, list):
                voices = [str(item).strip() for item in all_voices if str(item).strip()]
    return sorted(set(voices))


async def _run_synthesize_job(job_id: str, request: SynthesizeRequest) -> None:
    args: dict[str, Any] = {
        "text": request.text,
        "engine": request.engine,
    }
    engine_value = str(request.engine or "vibevoice").strip().lower()
    if engine_value == "cosyvoice":
        args["mode"] = request.mode
        if request.model_id:
            args["model_id"] = request.model_id
        if request.speaker:
            args["speaker"] = request.speaker
        if request.speed is not None:
            args["speed"] = request.speed
        if request.text_frontend is not None:
            args["text_frontend"] = request.text_frontend
    else:
        args["quality"] = request.quality
        if request.speaker:
            args["speaker"] = request.speaker

    await job_store.update(job_id, status="running", progress=0.01, message="starting synthesis")

    def on_progress(progress: float, message: str) -> None:
        asyncio.create_task(
            job_store.update(
                job_id,
                status="running",
                progress=progress,
                message=message or "processing",
            )
        )

    try:
        raw_result = await host.tools.call(
            "dawnchat.tts.synthesize",
            arguments=args,
            on_progress=on_progress,
        )
        result = _normalize_tool_result(raw_result)
        output_path = None
        if isinstance(result.get("data"), dict):
            output_path = str(result["data"].get("output_path") or "").strip() or None

        if result.get("code") == 200:
            await job_store.update(
                job_id,
                status="completed",
                progress=1.0,
                message="synthesis completed",
                result=result,
                output_path=output_path,
            )
            return

        await job_store.update(
            job_id,
            status="failed",
            progress=1.0,
            message="synthesis failed",
            result=result,
            error=str(result.get("message") or "synthesis failed"),
        )
    except Exception as exc:
        await job_store.update(
            job_id,
            status="failed",
            progress=1.0,
            message="synthesis failed",
            error=str(exc),
        )


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

    @api_router.get("/tts/models")
    async def tts_models(engine: str = "vibevoice") -> dict[str, Any]:
        models = await _list_models(engine=str(engine or "vibevoice").strip().lower())
        return {"status": "ok", "models": models}

    @api_router.get("/tts/speakers")
    async def tts_speakers(
        engine: str = "vibevoice",
        model_id: Optional[str] = None,
        quality: str = "fast",
    ) -> dict[str, Any]:
        speakers = await _list_speakers(
            engine=str(engine or "vibevoice").strip().lower(),
            model_id=str(model_id).strip() if model_id else None,
            quality=str(quality or "fast").strip().lower(),
        )
        return {"status": "ok", "speakers": speakers}

    @api_router.post("/tts/synthesize")
    async def tts_synthesize(request: SynthesizeRequest) -> dict[str, Any]:
        job = await job_store.create()
        asyncio.create_task(_run_synthesize_job(job.job_id, request))
        return {"status": "ok", "job_id": job.job_id}

    @api_router.get("/tts/jobs/{job_id}")
    async def tts_job(job_id: str) -> dict[str, Any]:
        job = await job_store.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="job not found")
        return {"status": "ok", "job": job.to_dict()}

    @api_router.get("/tts/audio/{job_id}")
    async def tts_audio(job_id: str) -> FileResponse:
        job = await job_store.get(job_id)
        if not job or not job.output_path:
            raise HTTPException(status_code=404, detail="audio not found")
        audio_path = Path(job.output_path)
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
