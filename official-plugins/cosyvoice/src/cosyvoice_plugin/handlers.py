import os
from pathlib import Path
from typing import Any

from dawnchat_sdk import report_task_progress
from cosyvoice_worker.server import _ensure_ttsfrd_resource_link, engine
from cosyvoice_plugin.model_management import model_manager


async def synthesize(args: dict[str, Any]) -> dict[str, Any]:
    await report_task_progress(0.05, "validating request")
    model_id = str(args.get("model_id") or model_manager.get_default_main_model_id() or "").strip()
    if not model_id:
        return {"code": 400, "message": "model_id_required", "data": None}

    model_path_arg = str(args.get("model_path", "")).strip()
    if model_path_arg:
        model_path = Path(model_path_arg).expanduser()
    else:
        resolved = await model_manager.get_installed_model_path(model_id)
        model_path = resolved if resolved else Path("")
    if not model_path.exists():
        return {"code": 404, "message": "model_path_not_found", "data": None}

    ttsfrd_resource_dir = args.get("ttsfrd_resource_dir")
    if ttsfrd_resource_dir:
        os.environ["COSYVOICE_TTSFRD_RESOURCE_DIR"] = str(ttsfrd_resource_dir)
    else:
        resource_path = await model_manager.get_installed_model_path("ttsfrd_resource")
        default_resource = None
        if resource_path:
            default_resource = resource_path / "resource" if (resource_path / "resource").exists() else resource_path
        if default_resource:
            os.environ["COSYVOICE_TTSFRD_RESOURCE_DIR"] = str(default_resource)
    await report_task_progress(0.15, "preparing tts resources")
    _ensure_ttsfrd_resource_link()

    prompt_wav_path = args.get("prompt_wav_path")
    prompt_wav_path = Path(str(prompt_wav_path)).expanduser() if prompt_wav_path else None
    output_path = args.get("output_path")
    output_path = Path(str(output_path)).expanduser() if output_path else None

    await report_task_progress(0.3, "starting synthesis")
    result = await engine.synthesize(
        model_id=model_id,
        model_path=model_path,
        mode=str(args.get("mode", "sft")),
        text=str(args.get("text", "")),
        speaker=args.get("speaker"),
        prompt_wav_path=prompt_wav_path,
        prompt_text=args.get("prompt_text"),
        instruct_text=args.get("instruct_text"),
        output_path=output_path,
        speed=args.get("speed"),
        text_frontend=args.get("text_frontend"),
        timeout_seconds=args.get("timeout_seconds"),
    )
    if isinstance(result, dict) and result.get("code") == 200:
        await report_task_progress(1.0, "synthesis completed")
    return result


async def status(_: dict[str, Any]) -> dict[str, Any]:
    models = await model_manager.list_models()
    installed_main = [m for m in models if m.get("installed") and not m.get("is_resource_only")]
    default_model_id = installed_main[0]["model_id"] if installed_main else None
    default_model_path = installed_main[0]["model_path"] if installed_main else None
    installed_resource = next(
        (m for m in models if m.get("installed") and m.get("model_id") == "ttsfrd_resource"),
        None,
    )
    ttsfrd_resource = None
    if installed_resource and installed_resource.get("model_path"):
        p = Path(str(installed_resource["model_path"]))
        ttsfrd_resource = p / "resource" if (p / "resource").exists() else p
    return {
        "code": 200,
        "message": "success",
        "data": {
            "loaded_model_id": engine.loaded_model_id,
            "loaded_model_path": engine.loaded_model_path,
            "device": engine.device,
            "sample_rate": engine.sample_rate,
            "default_model_id": default_model_id,
            "default_model_path": default_model_path,
            "ttsfrd_resource_dir": str(ttsfrd_resource) if ttsfrd_resource else None,
            "models_dir": str(model_manager.paths.models_dir),
        },
    }


async def list_models(_: dict[str, Any]) -> dict[str, Any]:
    models = await model_manager.list_models()
    return {"code": 200, "message": "success", "data": {"models": models}}


async def start_model_download(args: dict[str, Any]) -> dict[str, Any]:
    model_id = str(args.get("model_id", "")).strip()
    if not model_id:
        return {"code": 400, "message": "model_id_required", "data": None}
    use_mirror = args.get("use_mirror")
    resume = bool(args.get("resume", True))
    return await model_manager.start_download(model_id=model_id, use_mirror=use_mirror, resume=resume)


async def get_model_download_status(args: dict[str, Any]) -> dict[str, Any]:
    model_id = str(args.get("model_id", "")).strip()
    if not model_id:
        return {"code": 400, "message": "model_id_required", "data": None}
    return await model_manager.get_download_status(model_id=model_id)


async def pause_model_download(args: dict[str, Any]) -> dict[str, Any]:
    model_id = str(args.get("model_id", "")).strip()
    if not model_id:
        return {"code": 400, "message": "model_id_required", "data": None}
    return await model_manager.pause_download(model_id=model_id)


async def cancel_model_download(args: dict[str, Any]) -> dict[str, Any]:
    model_id = str(args.get("model_id", "")).strip()
    if not model_id:
        return {"code": 400, "message": "model_id_required", "data": None}
    return await model_manager.cancel_download(model_id=model_id)


async def list_pending_downloads(_: dict[str, Any]) -> dict[str, Any]:
    return await model_manager.list_pending_downloads()
