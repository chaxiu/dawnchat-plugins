import argparse
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

from dawnchat_sdk import create_tool_proxy_router, host, report_task_progress
from dawnchat_sdk.result_utils import extract_result_data
from dawnchat_sdk.tool_gateway import ToolGateway
from mcp import build_mcp_router


class TranscribeRequest(BaseModel):
    audio_path: str
    language: Optional[str] = None
    model_size: Optional[str] = None
    num_speakers: Optional[int] = None
    enable_diarization: bool = True


def load_manifest(base_dir: Path) -> dict[str, Any]:
    manifest_path = base_dir / "manifest.json"
    if not manifest_path.exists():
        return {}
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _normalize_tool_result(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict) and "code" in raw and "data" in raw:
        return raw

    if isinstance(raw, dict) and "content" in raw:
        return _normalize_tool_result(raw.get("content"))

    if isinstance(raw, list) and raw:
        first = raw[0]
        if isinstance(first, dict) and isinstance(first.get("text"), str):
            try:
                parsed = json.loads(first["text"])
                if isinstance(parsed, dict):
                    return _normalize_tool_result(parsed)
            except Exception:
                pass

    if isinstance(raw, dict):
        return {"code": 200, "message": "success", "data": raw}
    return {"code": 500, "message": f"unexpected result type: {type(raw)}", "data": None}


def _normalize_models_payload(result: dict[str, Any]) -> dict[str, Any]:
    data = result.get("data") if isinstance(result, dict) else None
    raw_models = data.get("models") if isinstance(data, dict) else None
    if not isinstance(raw_models, list):
        return result

    normalized_models: list[dict[str, Any]] = []
    for item in raw_models:
        if not isinstance(item, dict):
            continue
        model_id = str(item.get("id") or item.get("size") or "").strip()
        if not model_id:
            continue
        model_name = str(item.get("name") or item.get("description") or model_id).strip() or model_id
        normalized_models.append(
            {
                "id": model_id,
                "name": model_name,
                "installed": bool(item.get("installed")),
                "description": item.get("description"),
                "hf_repo_id": item.get("hf_repo_id"),
                "size_mb": item.get("size_mb"),
                "languages": item.get("languages"),
            }
        )

    out = dict(result)
    out_data = dict(data) if isinstance(data, dict) else {}
    out_data["models"] = normalized_models
    out["data"] = out_data
    return out


async def _run_transcribe_with_speakers(
    sdk_host,
    gateway: ToolGateway,
    audio_path: str,
    language: Optional[str] = None,
    model_size: Optional[str] = None,
    num_speakers: Optional[int] = None,
    enable_diarization: bool = True,
) -> dict[str, Any]:
    await report_task_progress(0.05, "starting whisper transcription")
    transcribe_args: dict[str, Any] = {"audio_path": audio_path, "output_format": "segments"}
    if language is not None:
        transcribe_args["language"] = language
    if model_size is not None:
        transcribe_args["model_size"] = model_size

    transcribe_raw = await sdk_host.tools.call("dawnchat.asr.transcribe", arguments=transcribe_args)
    transcribe_result = _normalize_tool_result(transcribe_raw)
    if transcribe_result.get("code") != 200:
        await report_task_progress(1.0, "whisper failed")
        return transcribe_result
    transcribe_data = extract_result_data(transcribe_result)

    if not enable_diarization:
        await report_task_progress(1.0, "completed without diarization")
        return {
            "code": 200,
            "message": "success",
            "data": {
                "text": transcribe_data.get("text", ""),
                "language": transcribe_data.get("language"),
                "duration": transcribe_data.get("duration"),
                "segments": transcribe_data.get("segments", []),
                "speakers": [],
                "diarization_segments": [],
                "diarization_enabled": False,
            },
        }

    await report_task_progress(0.45, "starting diarization")
    diarize_args: dict[str, Any] = {"audio_path": audio_path}
    if num_speakers is not None:
        diarize_args["num_speakers"] = num_speakers
    handle = await gateway.submit(
        "plugin.com.dawnchat.diarization.diarize",
        arguments=diarize_args,
        timeout=1800.0,
    )
    diarize_raw = await handle.wait(timeout=1800.0)
    diarize_result = _normalize_tool_result(diarize_raw)
    if diarize_result.get("code") != 200:
        await report_task_progress(1.0, "diarization failed")
        return diarize_result
    diarize_data = extract_result_data(diarize_result)

    await report_task_progress(0.85, "merging whisper and diarization")
    merge_raw = await sdk_host.tools.call(
        "plugin.com.dawnchat.diarization.merge_speakers",
        arguments={
            "diarization_segments": diarize_data.get("segments", []),
            "transcription_segments": transcribe_data.get("segments", []),
        },
    )
    merge_result = _normalize_tool_result(merge_raw)
    if merge_result.get("code") != 200:
        await report_task_progress(1.0, "merge failed")
        return merge_result
    merge_data = extract_result_data(merge_result)

    await report_task_progress(1.0, "completed")
    return {
        "code": 200,
        "message": "success",
        "data": {
            "text": transcribe_data.get("text", ""),
            "language": transcribe_data.get("language"),
            "duration": transcribe_data.get("duration"),
            "speakers": diarize_data.get("speakers", []),
            "segments": merge_data.get("segments", []),
            "diarization_segments": diarize_data.get("segments", []),
            "diarization_enabled": True,
        },
    }


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
        return {"status": "ok", "plugin_id": plugin_id, "host_port": host_port}

    @api_router.post("/asr/transcribe_with_speakers")
    async def transcribe_with_speakers(request: TranscribeRequest) -> dict[str, Any]:
        return await _run_transcribe_with_speakers(
            sdk_host,
            gateway,
            audio_path=request.audio_path,
            language=request.language,
            model_size=request.model_size,
            num_speakers=request.num_speakers,
            enable_diarization=request.enable_diarization,
        )

    @api_router.get("/asr/models")
    async def asr_models() -> dict[str, Any]:
        raw = await sdk_host.tools.call("dawnchat.asr.list_models", arguments={})
        return _normalize_models_payload(_normalize_tool_result(raw))

    @api_router.get("/asr/status")
    async def asr_status() -> dict[str, Any]:
        raw = await sdk_host.tools.call("dawnchat.asr.status", arguments={})
        return _normalize_tool_result(raw)

    async def mcp_transcribe(arguments: dict[str, Any]) -> dict[str, Any]:
        return await _run_transcribe_with_speakers(
            sdk_host,
            gateway,
            audio_path=str(arguments.get("audio_path", "")),
            language=arguments.get("language"),
            model_size=arguments.get("model_size"),
            num_speakers=arguments.get("num_speakers"),
            enable_diarization=bool(arguments.get("enable_diarization", True)),
        )

    mcp_router = build_mcp_router(
        manifest_tools,
        {"transcribe_with_speakers": mcp_transcribe},
    )

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
