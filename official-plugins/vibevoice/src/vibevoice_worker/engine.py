import asyncio
import hashlib
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import torch
from transformers.modeling_outputs import ModelOutput


SAMPLE_RATE = 24000


def _normalize_text(text: str) -> str:
    return text.replace("'", "'").replace('"', '"').replace('"', '"')


def _resolve_streaming_voice_preset(voices_dir: Path, speaker_name: str) -> Optional[Path]:
    streaming_dir = voices_dir / "streaming_model"
    if not streaming_dir.exists():
        return None

    for pt_file in sorted(streaming_dir.glob("*.pt"), key=lambda p: p.name.lower()):
        name = pt_file.stem
        if speaker_name.lower() in name.lower():
            return pt_file
        clean_name = name.split("_")[0].split("-")[-1]
        if clean_name.lower() == speaker_name.lower():
            return pt_file

    return None


def _resolve_wav_voice(voices_dir: Path, speaker_name: str) -> Optional[Path]:
    if not voices_dir.exists():
        return None

    for wav_file in sorted(voices_dir.glob("*.wav"), key=lambda p: p.name.lower()):
        name = wav_file.stem
        if speaker_name.lower() in name.lower():
            return wav_file
        clean_name = name.split("_")[0].split("-")[-1]
        if clean_name.lower() == speaker_name.lower():
            return wav_file

    return None


def _detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _get_device_config(device: str) -> tuple:
    if device == "mps":
        return torch.float32, "sdpa"
    if device == "cuda":
        return torch.bfloat16, "flash_attention_2"
    return torch.float32, "sdpa"


def _move_to_device_and_dtype(value: Any, *, device: str, dtype: torch.dtype) -> Any:
    if torch.is_tensor(value):
        if value.is_floating_point():
            return value.to(device=device, dtype=dtype)
        return value.to(device=device)
    if isinstance(value, ModelOutput):
        return value.__class__(
            **{k: _move_to_device_and_dtype(v, device=device, dtype=dtype) for k, v in value.items()}
        )
    if isinstance(value, dict):
        return {k: _move_to_device_and_dtype(v, device=device, dtype=dtype) for k, v in value.items()}
    if isinstance(value, list):
        return [_move_to_device_and_dtype(v, device=device, dtype=dtype) for v in value]
    if isinstance(value, tuple):
        return tuple(_move_to_device_and_dtype(v, device=device, dtype=dtype) for v in value)
    return value


@dataclass
class LoadedModel:
    model_size: str
    model_path: Path
    device: str
    is_streaming: bool
    model: Any
    processor: Any


class VibeVoiceEngine:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._loaded: Optional[LoadedModel] = None

    @property
    def loaded_model_size(self) -> Optional[str]:
        return self._loaded.model_size if self._loaded else None

    @property
    def loaded_model_path(self) -> Optional[str]:
        return str(self._loaded.model_path) if self._loaded else None

    @property
    def device(self) -> str:
        return self._loaded.device if self._loaded else _detect_device()

    async def unload(self) -> None:
        async with self._lock:
            if not self._loaded:
                return
            model = self._loaded.model
            processor = self._loaded.processor
            self._loaded = None
            del model
            del processor
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            import gc

            gc.collect()

    async def load(self, model_size: str, model_path: Path, device: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            if self._loaded and self._loaded.model_size == model_size and self._loaded.model_path == model_path:
                return {"ok": True, "device": self._loaded.device}

            if self._loaded:
                await self.unload()

            if device is None:
                device = _detect_device()

            load_dtype, attn_impl = _get_device_config(device)
            is_streaming = model_size == "0.5B"

            processor = None
            model = None
            try:
                if is_streaming:
                    from vibevoice.modular.modeling_vibevoice_streaming_inference import (
                        VibeVoiceStreamingForConditionalGenerationInference,
                    )
                    from vibevoice.processor.vibevoice_streaming_processor import VibeVoiceStreamingProcessor

                    processor = VibeVoiceStreamingProcessor.from_pretrained(str(model_path))
                    model = self._load_model_with_config(
                        VibeVoiceStreamingForConditionalGenerationInference,
                        model_path,
                        device,
                        load_dtype,
                        attn_impl,
                    )
                    model.eval()
                    model.set_ddpm_inference_steps(num_steps=5)
                else:
                    from vibevoice.modular.modeling_vibevoice_inference import VibeVoiceForConditionalGenerationInference
                    from vibevoice.processor.vibevoice_processor import VibeVoiceProcessor

                    processor = VibeVoiceProcessor.from_pretrained(str(model_path))
                    model = self._load_model_with_config(
                        VibeVoiceForConditionalGenerationInference,
                        model_path,
                        device,
                        load_dtype,
                        attn_impl,
                    )
                    model.eval()
            except Exception:
                if device == "mps" and load_dtype != torch.float32:
                    load_dtype, attn_impl = torch.float32, "sdpa"
                    if is_streaming:
                        from vibevoice.modular.modeling_vibevoice_streaming_inference import (
                            VibeVoiceStreamingForConditionalGenerationInference,
                        )
                        from vibevoice.processor.vibevoice_streaming_processor import VibeVoiceStreamingProcessor

                        processor = VibeVoiceStreamingProcessor.from_pretrained(str(model_path))
                        model = self._load_model_with_config(
                            VibeVoiceStreamingForConditionalGenerationInference,
                            model_path,
                            device,
                            load_dtype,
                            attn_impl,
                        )
                        model.eval()
                        model.set_ddpm_inference_steps(num_steps=5)
                    else:
                        from vibevoice.modular.modeling_vibevoice_inference import VibeVoiceForConditionalGenerationInference
                        from vibevoice.processor.vibevoice_processor import VibeVoiceProcessor

                        processor = VibeVoiceProcessor.from_pretrained(str(model_path))
                        model = self._load_model_with_config(
                            VibeVoiceForConditionalGenerationInference,
                            model_path,
                            device,
                            load_dtype,
                            attn_impl,
                        )
                        model.eval()
                else:
                    raise

            self._loaded = LoadedModel(
                model_size=model_size,
                model_path=model_path,
                device=device,
                is_streaming=is_streaming,
                model=model,
                processor=processor,
            )
            return {"ok": True, "device": device}

    def _load_model_with_config(self, model_class, model_path: Path, device: str, load_dtype, attn_impl):
        if device == "mps":
            model = model_class.from_pretrained(
                str(model_path),
                torch_dtype=load_dtype,
                attn_implementation=attn_impl,
                device_map=None,
            )
            model.to("mps")
            return model
        if device == "cuda":
            return model_class.from_pretrained(
                str(model_path),
                torch_dtype=load_dtype,
                device_map="cuda",
                attn_implementation=attn_impl,
            )
        return model_class.from_pretrained(
            str(model_path),
            torch_dtype=load_dtype,
            device_map="cpu",
            attn_implementation=attn_impl,
        )

    async def synthesize(
        self,
        *,
        text: str,
        speaker: str,
        model_size: str,
        model_path: Path,
        voices_dir: Path,
        output_path: Path,
        cfg_scale: Optional[float],
        ddpm_steps: Optional[int],
        timeout_seconds: Optional[float],
    ) -> Dict[str, Any]:
        if timeout_seconds is None:
            timeout_seconds = 300.0

        async def _run():
            await self.load(model_size=model_size, model_path=model_path)
            if not self._loaded:
                raise RuntimeError("model_not_loaded")

            if self._loaded.is_streaming:
                effective_ddpm_steps = 5 if ddpm_steps is None else ddpm_steps
                effective_cfg_scale = 1.5 if cfg_scale is None else cfg_scale
                return await asyncio.to_thread(
                    self._synthesize_streaming_sync,
                    text,
                    speaker,
                    voices_dir,
                    output_path,
                    float(effective_cfg_scale),
                    int(effective_ddpm_steps),
                )

            effective_cfg_scale = 1.3 if cfg_scale is None else cfg_scale
            return await asyncio.to_thread(
                self._synthesize_standard_sync,
                text,
                speaker,
                voices_dir,
                output_path,
                float(effective_cfg_scale),
            )

        try:
            return await asyncio.wait_for(_run(), timeout=timeout_seconds)
        except asyncio.TimeoutError:
            return {"code": 504, "message": "synthesize_timeout", "data": None}

    def _stable_seed(self, *, speaker: str, model_size: str, cfg_scale: float, ddpm_steps: int | None) -> int:
        payload = "\n".join(
            [
                str(model_size or ""),
                str(speaker or ""),
                str(cfg_scale),
                "" if ddpm_steps is None else str(int(ddpm_steps)),
            ]
        )
        d = hashlib.sha256(payload.encode("utf-8", errors="ignore")).digest()
        return int.from_bytes(d[:8], byteorder="big", signed=False) & 0x7FFFFFFF

    def _synthesize_streaming_sync(
        self,
        text: str,
        speaker: str,
        voices_dir: Path,
        output_path: Path,
        cfg_scale: float,
        ddpm_steps: int,
    ) -> Dict[str, Any]:
        if not self._loaded or not self._loaded.is_streaming:
            return {"code": 500, "message": "streaming_model_not_loaded", "data": None}

        voice_preset_path = _resolve_streaming_voice_preset(voices_dir, speaker)
        if voice_preset_path is None:
            return {"code": 400, "message": f"voice_not_found: {speaker}", "data": None}

        import copy

        target_device = self._loaded.device if self._loaded.device != "cpu" else "cpu"
        raw_prefilled_outputs = torch.load(voice_preset_path, map_location=target_device, weights_only=False)

        full_script = _normalize_text(text)

        def build_inputs_and_prompt(dtype: torch.dtype):
            prompt = _move_to_device_and_dtype(raw_prefilled_outputs, device=target_device, dtype=dtype)
            processed = self._loaded.processor.process_input_with_cached_prompt(
                text=full_script,
                cached_prompt=prompt,
                padding=True,
                return_tensors="pt",
                return_attention_mask=True,
            )
            processed = _move_to_device_and_dtype(processed, device=target_device, dtype=dtype)
            return processed, prompt

        model_dtype = next(self._loaded.model.parameters()).dtype
        inputs, all_prefilled_outputs = build_inputs_and_prompt(model_dtype)

        self._loaded.model.set_ddpm_inference_steps(num_steps=ddpm_steps)

        seed = self._stable_seed(speaker=speaker, model_size=self._loaded.model_size, cfg_scale=cfg_scale, ddpm_steps=ddpm_steps)
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)

        start_time = time.time()
        with torch.inference_mode():
            try:
                outputs = self._loaded.model.generate(
                    **inputs,
                    max_new_tokens=None,
                    cfg_scale=cfg_scale,
                    tokenizer=self._loaded.processor.tokenizer,
                    generation_config={"do_sample": False},
                    verbose=False,
                    all_prefilled_outputs=copy.deepcopy(all_prefilled_outputs),
                )
            except Exception:
                if self._loaded.device == "mps" and model_dtype == torch.float16:
                    self._loaded.model = self._loaded.model.to(dtype=torch.float32)
                    self._loaded.model.eval()
                    model_dtype = torch.float32
                    inputs, all_prefilled_outputs = build_inputs_and_prompt(model_dtype)
                    outputs = self._loaded.model.generate(
                        **inputs,
                        max_new_tokens=None,
                        cfg_scale=cfg_scale,
                        tokenizer=self._loaded.processor.tokenizer,
                        generation_config={"do_sample": False},
                        verbose=False,
                        all_prefilled_outputs=copy.deepcopy(all_prefilled_outputs),
                    )
                else:
                    raise
        generation_time = time.time() - start_time

        if outputs.speech_outputs and outputs.speech_outputs[0] is not None:
            audio_samples = outputs.speech_outputs[0].shape[-1]
            audio_duration = audio_samples / SAMPLE_RATE
        else:
            return {"code": 500, "message": "no_audio_output", "data": None}

        self._loaded.processor.save_audio(outputs.speech_outputs[0], output_path=str(output_path))

        return {
            "code": 200,
            "message": "success",
            "data": {
                "output_path": str(output_path),
                "audio_duration_seconds": round(audio_duration, 2),
                "generation_time_seconds": round(generation_time, 2),
                "rtf": round(generation_time / audio_duration, 2) if audio_duration > 0 else 0,
                "speaker": speaker,
                "model": self._loaded.model_size,
                "device": self._loaded.device,
            },
        }

    def _synthesize_standard_sync(
        self,
        text: str,
        speaker: str,
        voices_dir: Path,
        output_path: Path,
        cfg_scale: float,
    ) -> Dict[str, Any]:
        if not self._loaded or self._loaded.is_streaming:
            return {"code": 500, "message": "standard_model_not_loaded", "data": None}

        voice_wav_path = _resolve_wav_voice(voices_dir, speaker)
        if voice_wav_path is None:
            return {"code": 400, "message": f"voice_not_found: {speaker}", "data": None}

        full_script = _normalize_text(text)
        inputs = self._loaded.processor(
            text=[full_script],
            voice_samples=[[str(voice_wav_path)]],
            padding=True,
            return_tensors="pt",
            return_attention_mask=True,
        )

        target_device = self._loaded.device if self._loaded.device != "cpu" else "cpu"
        model_dtype = next(self._loaded.model.parameters()).dtype
        inputs = _move_to_device_and_dtype(inputs, device=target_device, dtype=model_dtype)

        seed = self._stable_seed(speaker=speaker, model_size=self._loaded.model_size, cfg_scale=cfg_scale, ddpm_steps=None)
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)

        start_time = time.time()
        with torch.inference_mode():
            outputs = self._loaded.model.generate(
                **inputs,
                max_new_tokens=None,
                cfg_scale=cfg_scale,
                tokenizer=self._loaded.processor.tokenizer,
                generation_config={"do_sample": False},
                verbose=False,
                is_prefill=True,
            )
        generation_time = time.time() - start_time

        if outputs.speech_outputs and outputs.speech_outputs[0] is not None:
            audio_samples = outputs.speech_outputs[0].shape[-1]
            audio_duration = audio_samples / SAMPLE_RATE
        else:
            return {"code": 500, "message": "no_audio_output", "data": None}

        self._loaded.processor.save_audio(outputs.speech_outputs[0], output_path=str(output_path))

        return {
            "code": 200,
            "message": "success",
            "data": {
                "output_path": str(output_path),
                "audio_duration_seconds": round(audio_duration, 2),
                "generation_time_seconds": round(generation_time, 2),
                "rtf": round(generation_time / audio_duration, 2) if audio_duration > 0 else 0,
                "speaker": speaker,
                "model": self._loaded.model_size,
                "device": self._loaded.device,
            },
        }
