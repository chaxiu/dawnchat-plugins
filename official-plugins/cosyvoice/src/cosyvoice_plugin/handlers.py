import os
from pathlib import Path
from typing import Any

from dawnchat_sdk import report_task_progress
from cosyvoice_worker.server import _ensure_ttsfrd_resource_link, engine


async def synthesize(args: dict[str, Any]) -> dict[str, Any]:
    await report_task_progress(0.05, "validating request")
    model_id = str(args.get("model_id", "")).strip()
    if not model_id:
        return {"code": 400, "message": "model_id_required", "data": None}

    model_path = Path(str(args.get("model_path", ""))).expanduser()
    if not model_path.exists():
        return {"code": 404, "message": "model_path_not_found", "data": None}

    ttsfrd_resource_dir = args.get("ttsfrd_resource_dir")
    if ttsfrd_resource_dir:
        os.environ["COSYVOICE_TTSFRD_RESOURCE_DIR"] = str(ttsfrd_resource_dir)
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


def status(_: dict[str, Any]) -> dict[str, Any]:
    return {
        "code": 200,
        "message": "success",
        "data": {
            "loaded_model_id": engine.loaded_model_id,
            "loaded_model_path": engine.loaded_model_path,
            "device": engine.device,
            "sample_rate": engine.sample_rate,
        },
    }
