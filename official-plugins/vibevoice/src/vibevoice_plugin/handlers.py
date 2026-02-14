import logging
import time
from pathlib import Path
from typing import Any, Optional

from dawnchat_sdk import report_task_progress
from vibevoice_worker.engine import VibeVoiceEngine
from vibevoice_plugin.model_management import model_manager

logger = logging.getLogger("vibevoice_handlers")

engine = VibeVoiceEngine()


def _quality_to_model_size(quality: Optional[str]) -> str:
    if not quality:
        return "0.5B"
    q = quality.lower()
    if q == "standard":
        return "1.5B"
    if q == "high":
        return "7B"
    return "0.5B"


async def synthesize(args: dict[str, Any]) -> dict[str, Any]:
    await report_task_progress(0.05, "validating request")
    text = str(args.get("text", "")).strip()
    if not text:
        return {"code": 400, "message": "text_required", "data": None}

    model_size = str(args.get("model_size") or _quality_to_model_size(args.get("quality")))
    model_path_arg = str(args.get("model_path", "")).strip()
    if model_path_arg:
        model_path = Path(model_path_arg).expanduser()
    else:
        resolved = await model_manager.get_installed_model_path(model_size)
        model_path = resolved if resolved else Path("")
    if not model_path.exists():
        return {"code": 404, "message": "model_path_not_found", "data": None}

    voices_dir_arg = str(args.get("voices_dir", "")).strip()
    voices_dir = Path(voices_dir_arg).expanduser() if voices_dir_arg else model_manager.get_voices_dir()
    if not voices_dir.exists():
        return {"code": 404, "message": "voices_dir_not_found", "data": None}

    speaker = args.get("speaker") or "Emma"

    output_path = args.get("output_path")
    if output_path:
        output_path = Path(str(output_path)).expanduser()
    else:
        output_dir = Path.cwd() / "outputs"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"tts_{int(time.time())}.wav"

    await report_task_progress(0.25, "initializing model and voice")
    result = await engine.synthesize(
        text=text,
        speaker=speaker,
        model_size=model_size,
        model_path=model_path,
        voices_dir=voices_dir,
        output_path=output_path,
        cfg_scale=args.get("cfg_scale"),
        ddpm_steps=args.get("ddpm_steps"),
        timeout_seconds=args.get("timeout_seconds"),
    )
    if isinstance(result, dict) and result.get("code") == 200:
        await report_task_progress(1.0, "synthesis completed")
    return result


def list_voices(args: dict[str, Any]) -> dict[str, Any]:
    voices_dir = Path(str(args.get("voices_dir", ""))).expanduser()
    if not voices_dir.exists():
        return {"code": 404, "message": "voices_dir_not_found", "data": None}

    voices: set[str] = set()
    for ext in (".pt", ".wav"):
        for file_path in voices_dir.rglob(f"*{ext}"):
            voices.add(file_path.stem)

    return {"code": 200, "message": "success", "data": {"voices": sorted(voices)}}


async def status(_: dict[str, Any]) -> dict[str, Any]:
    models = await model_manager.list_models()
    installed = [m for m in models if m.get("installed")]
    default_model_size = installed[0]["model_size"] if installed else None
    default_model_path = installed[0]["model_path"] if installed else None
    return {
        "code": 200,
        "message": "success",
        "data": {
            "loaded_model_size": engine.loaded_model_size,
            "loaded_model_path": engine.loaded_model_path,
            "device": engine.device,
            "default_model_size": default_model_size,
            "default_model_path": default_model_path,
            "models_dir": str(model_manager.paths.models_dir),
            "voices_dir": str(model_manager.get_voices_dir()),
        },
    }


async def list_models(_: dict[str, Any]) -> dict[str, Any]:
    models = await model_manager.list_models()
    return {"code": 200, "message": "success", "data": {"models": models}}


async def start_model_download(args: dict[str, Any]) -> dict[str, Any]:
    model_size = str(args.get("model_size", "")).strip()
    if not model_size:
        return {"code": 400, "message": "model_size_required", "data": None}
    use_mirror = args.get("use_mirror")
    resume = bool(args.get("resume", True))
    return await model_manager.start_download(model_size=model_size, use_mirror=use_mirror, resume=resume)


async def get_model_download_status(args: dict[str, Any]) -> dict[str, Any]:
    model_size = str(args.get("model_size", "")).strip()
    if not model_size:
        return {"code": 400, "message": "model_size_required", "data": None}
    return await model_manager.get_download_status(model_size=model_size)


async def pause_model_download(args: dict[str, Any]) -> dict[str, Any]:
    model_size = str(args.get("model_size", "")).strip()
    if not model_size:
        return {"code": 400, "message": "model_size_required", "data": None}
    return await model_manager.pause_download(model_size=model_size)


async def cancel_model_download(args: dict[str, Any]) -> dict[str, Any]:
    model_size = str(args.get("model_size", "")).strip()
    if not model_size:
        return {"code": 400, "message": "model_size_required", "data": None}
    return await model_manager.cancel_download(model_size=model_size)


async def list_pending_downloads(_: dict[str, Any]) -> dict[str, Any]:
    return await model_manager.list_pending_downloads()
