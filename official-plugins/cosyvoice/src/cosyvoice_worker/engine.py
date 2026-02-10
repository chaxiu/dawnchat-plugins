import asyncio
import os
import time
from dataclasses import dataclass
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import torch
import soundfile as sf

logger = logging.getLogger("cosyvoice_worker.engine")


@dataclass
class LoadedModel:
    model_id: str
    model_path: Path
    device: str
    model: Any
    sample_rate: int


def _detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _default_output_path() -> Path:
    output_dir_str = os.getenv("COSYVOICE_OUTPUT_DIR", "")
    output_dir = Path(output_dir_str) if output_dir_str else (Path.cwd() / "outputs")
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"tts_{int(time.time())}.wav"


def _ensure_endofprompt(s: str) -> str:
    if "<|endofprompt|>" in s:
        return s
    return f"{s}<|endofprompt|>"


def _default_instruct_text(tts_text: str) -> str:
    t = str(tts_text or "")
    has_cjk = any("\u4e00" <= ch <= "\u9fff" for ch in t)
    if has_cjk:
        return "请用自然的语气朗读以下内容。<|endofprompt|>"
    return "Read the following text naturally.<|endofprompt|>"


class CosyVoiceEngine:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._loaded: Optional[LoadedModel] = None

    @property
    def loaded_model_id(self) -> Optional[str]:
        return self._loaded.model_id if self._loaded else None

    @property
    def loaded_model_path(self) -> Optional[str]:
        return str(self._loaded.model_path) if self._loaded else None

    @property
    def device(self) -> str:
        return self._loaded.device if self._loaded else _detect_device()

    @property
    def sample_rate(self) -> Optional[int]:
        return self._loaded.sample_rate if self._loaded else None

    async def unload(self) -> None:
        async with self._lock:
            if not self._loaded:
                return
            model = self._loaded.model
            self._loaded = None
            del model
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            import gc

            gc.collect()

    async def load(self, *, model_id: str, model_path: Path) -> Dict[str, Any]:
        async with self._lock:
            if self._loaded and self._loaded.model_id == model_id and self._loaded.model_path == model_path:
                return {"ok": True, "device": self._loaded.device}

            if self._loaded:
                await self.unload()

            from cosyvoice.cli.cosyvoice import AutoModel

            start_time = time.time()
            requested_device = _detect_device()
            fp16_env = os.getenv("COSYVOICE_FP16", "").strip().lower()
            if fp16_env in {"1", "true", "yes"}:
                fp16 = True
            elif fp16_env in {"0", "false", "no"}:
                fp16 = False
            else:
                fp16 = requested_device == "cuda"
            try:
                model = AutoModel(model_dir=str(model_path), fp16=fp16)
            except Exception:
                if fp16:
                    model = AutoModel(model_dir=str(model_path), fp16=False)
                else:
                    raise
            load_time = time.time() - start_time

            device = requested_device
            try:
                inner_device = getattr(getattr(model, "model", None), "device", None)
                if isinstance(inner_device, torch.device):
                    device = str(inner_device.type or device)
            except Exception:
                device = requested_device
            self._loaded = LoadedModel(
                model_id=str(model_id),
                model_path=model_path,
                device=device,
                model=model,
                sample_rate=int(getattr(model, "sample_rate", 24000)),
            )

            logger.info(
                "CosyVoice model loaded (model_id=%s, model_path=%s, requested_device=%s, device=%s, fp16=%s, sample_rate=%s, load_time=%.2fs)",
                str(model_id),
                str(model_path),
                requested_device,
                device,
                fp16,
                self._loaded.sample_rate,
                load_time,
            )
            return {"ok": True, "device": device, "load_time_seconds": round(load_time, 2)}

    async def list_speakers(self) -> list[str]:
        async with self._lock:
            if not self._loaded:
                return []
            try:
                spks = self._loaded.model.list_available_spks()
                if isinstance(spks, list):
                    return [str(x) for x in spks if str(x)]
            except Exception:
                return []
            return []

    def list_speakers_for_model(self, *, model_path: Path) -> list[str]:
        spk_path = model_path / "spk2info.pt"
        if not spk_path.exists():
            return []
        try:
            try:
                data = torch.load(str(spk_path), map_location="cpu")
            except TypeError:
                data = torch.load(str(spk_path), map_location="cpu", weights_only=False)
        except Exception:
            return []

        speakers: list[str] = []
        if isinstance(data, dict):
            speakers = [str(k) for k in data.keys() if str(k)]
        elif isinstance(data, (list, tuple)):
            speakers = [str(x) for x in data if str(x)]
        else:
            try:
                speakers = [str(x) for x in list(data) if str(x)]
            except Exception:
                speakers = []
        return sorted(set(speakers))

    async def synthesize(
        self,
        *,
        model_id: str,
        model_path: Path,
        mode: str,
        text: str,
        speaker: Optional[str],
        prompt_wav_path: Optional[Path],
        prompt_text: Optional[str],
        instruct_text: Optional[str],
        output_path: Optional[Path],
        speed: Optional[float],
        text_frontend: Optional[bool],
        timeout_seconds: Optional[float],
    ) -> Dict[str, Any]:
        if timeout_seconds is None:
            timeout_seconds = 600.0

        effective_output_path = output_path or _default_output_path()
        effective_output_path.parent.mkdir(parents=True, exist_ok=True)
        effective_speed = 1.0 if speed is None else float(speed)
        effective_text_frontend = True if text_frontend is None else bool(text_frontend)

        async def _run():
            await self.load(model_id=model_id, model_path=model_path)
            if not self._loaded:
                raise RuntimeError("model_not_loaded")

            start_time = time.time()

            try:
                if mode == "sft":
                    spks = await self.list_speakers()
                    spk_id = speaker or ""
                    if spk_id not in spks:
                        spk_id = spks[0] if spks else ""
                    if not spk_id:
                        return {"code": 400, "message": "no_available_speakers", "data": None}
                    gen = self._loaded.model.inference_sft(
                        text,
                        spk_id,
                        stream=False,
                        speed=effective_speed,
                        text_frontend=effective_text_frontend,
                    )
                elif mode == "zero_shot":
                    if not prompt_wav_path or not prompt_wav_path.exists():
                        return {"code": 400, "message": "prompt_wav_path_required", "data": None}
                    ptxt = str(prompt_text or "").strip()
                    if not ptxt:
                        return {"code": 400, "message": "prompt_text_required_for_zero_shot", "data": None}
                    if "<|endofprompt|>" not in (ptxt + text):
                        ptxt = _ensure_endofprompt(ptxt)
                    gen = self._loaded.model.inference_zero_shot(
                        text,
                        ptxt,
                        str(prompt_wav_path),
                        stream=False,
                        speed=effective_speed,
                        text_frontend=effective_text_frontend,
                    )
                elif mode == "instruct2":
                    if not prompt_wav_path or not prompt_wav_path.exists():
                        return {"code": 400, "message": "prompt_wav_path_required", "data": None}
                    itxt_raw = str(instruct_text or "").strip()
                    itxt = _ensure_endofprompt(itxt_raw) if itxt_raw else _default_instruct_text(text)
                    gen = self._loaded.model.inference_instruct2(
                        text,
                        itxt,
                        str(prompt_wav_path),
                        stream=False,
                        speed=effective_speed,
                        text_frontend=effective_text_frontend,
                    )
                else:
                    return {"code": 400, "message": f"unsupported_mode: {mode}", "data": None}

                chunks: list[torch.Tensor] = []
                for item in gen:
                    speech = item.get("tts_speech")
                    if speech is None:
                        continue
                    if not torch.is_tensor(speech):
                        speech = torch.as_tensor(speech)
                    speech = speech.detach().cpu()
                    if speech.ndim == 1:
                        speech = speech.unsqueeze(0)
                    chunks.append(speech)

                if not chunks:
                    return {"code": 500, "message": "no_audio_output", "data": None}

                audio = torch.cat(chunks, dim=1)
                sr = int(self._loaded.sample_rate)
                audio = audio.detach().cpu()
                if not audio.numel():
                    return {"code": 500, "message": "empty_audio_output", "data": None}

                finite_mask = torch.isfinite(audio)
                if not bool(finite_mask.all().item()):
                    num_bad = int((~finite_mask).sum().item())
                    total = int(audio.numel())
                    logger.warning(
                        "Non-finite audio output (bad=%s/%s, mode=%s, model_id=%s, device=%s)",
                        num_bad,
                        total,
                        mode,
                        str(model_id),
                        self._loaded.device,
                    )
                    audio = torch.nan_to_num(audio, nan=0.0, posinf=0.0, neginf=0.0)

                peak = float(audio.abs().max().item())
                rms = float((audio.float().pow(2).mean().sqrt()).item()) if audio.numel() else 0.0
                logger.info(
                    "Audio stats (mode=%s, peak=%.6f, rms=%.6f, shape=%s, dtype=%s, sr=%s, out=%s)",
                    mode,
                    peak,
                    rms,
                    tuple(audio.shape),
                    str(audio.dtype),
                    sr,
                    str(effective_output_path),
                )

                if peak < 1e-5:
                    return {"code": 500, "message": "silent_audio_output", "data": None}
                if audio.ndim == 1:
                    audio_np = audio.numpy()
                else:
                    audio_np = audio.transpose(0, 1).numpy()
                sf.write(str(effective_output_path), audio_np.astype("float32", copy=False), sr)

                audio_duration = float(audio.shape[1]) / float(sr) if sr > 0 else 0.0
                generation_time = time.time() - start_time

                return {
                    "code": 200,
                    "message": "success",
                    "data": {
                        "output_path": str(effective_output_path),
                        "audio_duration_seconds": round(audio_duration, 2),
                        "generation_time_seconds": round(generation_time, 2),
                        "rtf": round(generation_time / audio_duration, 2) if audio_duration > 0 else 0,
                        "speaker": speaker or "",
                        "model": str(model_id),
                        "device": self._loaded.device,
                        "sample_rate": sr,
                        "mode": mode,
                    },
                }
            except Exception as e:
                return {"code": 500, "message": str(e), "data": None}

        try:
            return await asyncio.wait_for(_run(), timeout=timeout_seconds)
        except asyncio.TimeoutError:
            return {"code": 504, "message": "synthesize_timeout", "data": None}
