import asyncio
import base64
import json
import os
import time
from pathlib import Path
from typing import Any, AsyncIterator, Dict, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from vibevoice_worker.engine import SAMPLE_RATE, VibeVoiceEngine, _move_to_device_and_dtype, _normalize_text


class SynthesizeRequest(BaseModel):
    text: str = Field(min_length=1)
    speaker: str = "Emma"
    quality: Optional[str] = None
    model_size: Optional[str] = None
    model_path: str
    voices_dir: str
    output_path: Optional[str] = None
    cfg_scale: Optional[float] = None
    ddpm_steps: Optional[int] = None
    timeout_seconds: Optional[float] = None


class UnloadRequest(BaseModel):
    pass


class LoadRequest(BaseModel):
    model_size: str
    model_path: str


def _quality_to_model_size(quality: Optional[str]) -> str:
    if not quality:
        return "0.5B"
    q = quality.lower()
    if q == "standard":
        return "1.5B"
    if q == "high":
        return "7B"
    return "0.5B"


def _pcm16_base64(audio: np.ndarray) -> str:
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767.0).astype(np.int16)
    return base64.b64encode(pcm.tobytes()).decode("ascii")


def _sse(data: Dict[str, Any], event: Optional[str] = None) -> bytes:
    payload = json.dumps(data, ensure_ascii=False)
    if event:
        return f"event: {event}\ndata: {payload}\n\n".encode("utf-8")
    return f"data: {payload}\n\n".encode("utf-8")


engine = VibeVoiceEngine()
app = FastAPI()


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok"}


@app.get("/v1/status")
async def status() -> Dict[str, Any]:
    return {
        "status": "ok",
        "loaded_model_size": engine.loaded_model_size,
        "loaded_model_path": engine.loaded_model_path,
        "device": engine.device,
    }


@app.post("/v1/models/load")
async def load_model(req: LoadRequest) -> Dict[str, Any]:
    model_path = Path(req.model_path).expanduser()
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="model_path_not_found")
    result = await engine.load(model_size=req.model_size, model_path=model_path)
    return {"status": "ok", **result}


@app.post("/v1/models/unload")
async def unload_model(_: UnloadRequest) -> Dict[str, Any]:
    await engine.unload()
    return {"status": "ok"}


@app.post("/v1/tts/synthesize")
async def synthesize(req: SynthesizeRequest) -> Dict[str, Any]:
    model_size = req.model_size or _quality_to_model_size(req.quality)
    model_path = Path(req.model_path).expanduser()
    if not model_path.exists():
        return {"code": 404, "message": "model_path_not_found", "data": None}

    voices_dir = Path(req.voices_dir).expanduser()
    if not voices_dir.exists():
        return {"code": 404, "message": "voices_dir_not_found", "data": None}

    if req.output_path:
        output_path = Path(req.output_path).expanduser()
    else:
        output_dir = Path(os.getenv("VIBEVOICE_OUTPUT_DIR", "")) if os.getenv("VIBEVOICE_OUTPUT_DIR") else None
        if output_dir is None or str(output_dir) == "":
            output_dir = Path.cwd() / "outputs"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"tts_{int(time.time())}.wav"

    return await engine.synthesize(
        text=req.text,
        speaker=req.speaker,
        model_size=model_size,
        model_path=model_path,
        voices_dir=voices_dir,
        output_path=output_path,
        cfg_scale=req.cfg_scale,
        ddpm_steps=req.ddpm_steps,
        timeout_seconds=req.timeout_seconds,
    )


@app.post("/v1/tts/stream")
async def stream(req: SynthesizeRequest):
    model_size = req.model_size or _quality_to_model_size(req.quality)
    if model_size != "0.5B":
        raise HTTPException(status_code=400, detail="stream_only_supports_0_5B")

    model_path = Path(req.model_path).expanduser()
    voices_dir = Path(req.voices_dir).expanduser()
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="model_path_not_found")
    if not voices_dir.exists():
        raise HTTPException(status_code=404, detail="voices_dir_not_found")

    if req.output_path:
        output_path = Path(req.output_path).expanduser()
        output_path.parent.mkdir(parents=True, exist_ok=True)
    else:
        output_dir = Path(os.getenv("VIBEVOICE_OUTPUT_DIR", "")) if os.getenv("VIBEVOICE_OUTPUT_DIR") else None
        if output_dir is None or str(output_dir) == "":
            output_dir = Path.cwd() / "outputs"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"tts_{int(time.time())}.wav"

    stop_signal = object()

    async def event_stream() -> AsyncIterator[bytes]:
        start_at = time.monotonic()
        timeout_s = req.timeout_seconds or 300.0

        await engine.load(model_size=model_size, model_path=model_path)
        if engine.loaded_model_size != "0.5B":
            yield _sse({"code": 500, "message": "model_not_loaded", "data": None}, event="error")
            return

        from vibevoice.modular.streamer import AsyncAudioStreamer
        import torch
        import copy

        voice_preset_path = (voices_dir / "streaming_model")
        preset = None
        for pt in voice_preset_path.glob("*.pt"):
            if req.speaker.lower() in pt.stem.lower():
                preset = pt
                break
        if preset is None:
            pt_files = list(voice_preset_path.glob("*.pt"))
            if not pt_files:
                yield _sse({"code": 400, "message": "voice_not_found", "data": None}, event="error")
                return
            preset = pt_files[0]

        target_device = engine.device if engine.device != "cpu" else "cpu"
        model_dtype = next(engine._loaded.model.parameters()).dtype
        all_prefilled_outputs = torch.load(preset, map_location=target_device, weights_only=False)
        all_prefilled_outputs = _move_to_device_and_dtype(all_prefilled_outputs, device=target_device, dtype=model_dtype)
        full_script = _normalize_text(req.text)
        inputs = engine._loaded.processor.process_input_with_cached_prompt(
            text=full_script,
            cached_prompt=all_prefilled_outputs,
            padding=True,
            return_tensors="pt",
            return_attention_mask=True,
        )
        inputs = _move_to_device_and_dtype(inputs, device=target_device, dtype=model_dtype)

        streamer = AsyncAudioStreamer(batch_size=1, stop_signal=stop_signal, timeout=1.0)
        chunks: list[np.ndarray] = []

        def stop_check_fn() -> bool:
            return (time.monotonic() - start_at) > timeout_s

        def run_generate():
            ddpm_steps = int(req.ddpm_steps or 5)
            cfg_scale = float(req.cfg_scale or 1.5)
            engine._loaded.model.set_ddpm_inference_steps(num_steps=ddpm_steps)
            try:
                try:
                    engine._loaded.model.generate(
                        **inputs,
                        max_new_tokens=None,
                        cfg_scale=cfg_scale,
                        tokenizer=engine._loaded.processor.tokenizer,
                        generation_config={"do_sample": False},
                        verbose=False,
                        all_prefilled_outputs=copy.deepcopy(all_prefilled_outputs),
                        audio_streamer=streamer,
                        stop_check_fn=stop_check_fn,
                    )
                except Exception:
                    if engine._loaded.device == "mps" and model_dtype == torch.float16:
                        engine._loaded.model = engine._loaded.model.to(dtype=torch.float32)
                        engine._loaded.model.eval()
                        new_dtype = torch.float32
                        prompt = _move_to_device_and_dtype(all_prefilled_outputs, device=target_device, dtype=new_dtype)
                        rebuilt = engine._loaded.processor.process_input_with_cached_prompt(
                            text=full_script,
                            cached_prompt=prompt,
                            padding=True,
                            return_tensors="pt",
                            return_attention_mask=True,
                        )
                        rebuilt = _move_to_device_and_dtype(rebuilt, device=target_device, dtype=new_dtype)
                        engine._loaded.model.generate(
                            **rebuilt,
                            max_new_tokens=None,
                            cfg_scale=cfg_scale,
                            tokenizer=engine._loaded.processor.tokenizer,
                            generation_config={"do_sample": False},
                            verbose=False,
                            all_prefilled_outputs=copy.deepcopy(prompt),
                            audio_streamer=streamer,
                            stop_check_fn=stop_check_fn,
                        )
                    else:
                        raise
            finally:
                streamer.end()

        task = asyncio.create_task(asyncio.to_thread(run_generate))

        try:
            yield _sse(
                {
                    "event": "start",
                    "sample_rate": SAMPLE_RATE,
                    "format": "pcm_s16le_base64",
                    "output_path": str(output_path),
                },
                event="start",
            )
            async for chunk in streamer.get_stream(0):
                arr = chunk.detach().cpu().numpy().astype(np.float32).reshape(-1)
                chunks.append(arr)
                yield _sse(
                    {
                        "event": "audio",
                        "sample_rate": SAMPLE_RATE,
                        "format": "pcm_s16le_base64",
                        "data": _pcm16_base64(arr),
                    },
                    event="audio",
                )
        finally:
            await task
            if chunks:
                audio = np.concatenate(chunks, axis=0)
                from scipy.io import wavfile

                pcm = (np.clip(audio, -1.0, 1.0) * 32767.0).astype(np.int16)
                wavfile.write(str(output_path), SAMPLE_RATE, pcm)
                yield _sse({"event": "done", "output_path": str(output_path)}, event="done")
            else:
                yield _sse({"event": "done", "output_path": str(output_path)}, event="done")

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
