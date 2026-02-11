import logging
import time
from pathlib import Path
from typing import Any, Optional

from dawnchat_sdk import report_task_progress
from vibevoice_worker.engine import VibeVoiceEngine

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

    model_path = Path(str(args.get("model_path", ""))).expanduser()
    if not model_path.exists():
        return {"code": 404, "message": "model_path_not_found", "data": None}

    voices_dir = Path(str(args.get("voices_dir", ""))).expanduser()
    if not voices_dir.exists():
        return {"code": 404, "message": "voices_dir_not_found", "data": None}

    model_size = args.get("model_size") or _quality_to_model_size(args.get("quality"))
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


def status(_: dict[str, Any]) -> dict[str, Any]:
    return {
        "code": 200,
        "message": "success",
        "data": {
            "loaded_model_size": engine.loaded_model_size,
            "loaded_model_path": engine.loaded_model_path,
            "device": engine.device,
        },
    }
