import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


@dataclass
class SpeakerSegment:
    speaker: str
    start: float
    end: float

    def to_dict(self) -> dict[str, Any]:
        return {"speaker": self.speaker, "start": self.start, "end": self.end}


class DiarizationService:
    _BUNDLED_MODEL_DIR_NAME = "speaker-diarization-community-1"

    def __init__(self) -> None:
        self._pipeline = None
        self._model_lock = asyncio.Lock()

    @staticmethod
    def _get_required_model_paths(model_dir: Path) -> list[Path]:
        return [
            model_dir / "config.yaml",
            model_dir / "segmentation" / "pytorch_model.bin",
            model_dir / "embedding" / "pytorch_model.bin",
            model_dir / "plda" / "plda.npz",
        ]

    def _is_model_dir_available(self, model_dir: Path) -> bool:
        return all(path.exists() for path in self._get_required_model_paths(model_dir))

    def _get_bundled_models_dir(self) -> Path:
        plugin_root = Path(__file__).resolve().parent.parent
        return plugin_root / "assets" / self._BUNDLED_MODEL_DIR_NAME

    def _get_models_dir(self) -> Path:
        return self._get_bundled_models_dir()

    def is_available(self) -> bool:
        model_dir = self._get_models_dir()
        if not model_dir.exists():
            return False
        return self._is_model_dir_available(model_dir)

    def is_loaded(self) -> bool:
        return self._pipeline is not None

    def get_status(self) -> dict[str, Any]:
        available = self.is_available()
        loaded = self.is_loaded()
        return {
            "available": available,
            "loaded": loaded,
            "model_path": str(self._get_models_dir()) if available else None,
            "device": self._get_device() if loaded else None,
        }

    def _get_device(self) -> str:
        if self._pipeline is None:
            return "none"
        try:
            device = next(self._pipeline.parameters()).device
            return str(device)
        except Exception:
            return "unknown"

    @staticmethod
    def _ensure_torchaudio_compat() -> None:
        import torchaudio

        if not hasattr(torchaudio, "list_audio_backends"):
            def list_audio_backends():
                import importlib.util

                out = []
                try:
                    if importlib.util.find_spec("soundfile") is not None:
                        out.append("soundfile")
                except Exception:
                    pass
                return out

            setattr(torchaudio, "list_audio_backends", list_audio_backends)

        if not hasattr(torchaudio, "get_audio_backend") or not hasattr(torchaudio, "set_audio_backend"):
            state = {"backend": None}

            def get_audio_backend():
                return state["backend"]

            def set_audio_backend(backend):
                state["backend"] = backend

            if not hasattr(torchaudio, "get_audio_backend"):
                setattr(torchaudio, "get_audio_backend", get_audio_backend)
            if not hasattr(torchaudio, "set_audio_backend"):
                setattr(torchaudio, "set_audio_backend", set_audio_backend)

    @staticmethod
    def _ensure_torch_serialization_compat() -> None:
        try:
            import torch
        except Exception:
            return

        add_safe_globals = getattr(getattr(torch, "serialization", None), "add_safe_globals", None)
        if add_safe_globals is None:
            return

        try:
            from pyannote.audio.core.task import Problem, Resolution, Specifications
        except Exception:
            return

        try:
            add_safe_globals([Problem, Resolution, Specifications])
        except Exception:
            return

    def _load_pipeline(self, device: str):
        self._ensure_torchaudio_compat()

        import torch
        from pyannote.audio import Pipeline

        self._ensure_torch_serialization_compat()

        config_path = self._get_models_dir() / "config.yaml"
        pipeline: Any = Pipeline.from_pretrained(config_path)

        if device == "auto":
            if torch.cuda.is_available():
                pipeline.to(torch.device("cuda"))
            elif hasattr(torch.backends, "mps") and getattr(torch.backends, "mps").is_available():
                pipeline.to(torch.device("mps"))
        elif device == "cuda":
            pipeline.to(torch.device("cuda"))
        elif device == "mps":
            pipeline.to(torch.device("mps"))

        return pipeline

    async def load_model(self, device: str = "auto") -> bool:
        if not self.is_available():
            return False

        async with self._model_lock:
            if self._pipeline is not None:
                return True
            try:
                self._pipeline = await asyncio.to_thread(self._load_pipeline, device)
                return True
            except Exception:
                self._pipeline = None
                return False

    async def diarize(
        self,
        audio_path: str,
        num_speakers: Optional[int] = None,
        min_speakers: Optional[int] = None,
        max_speakers: Optional[int] = None,
    ) -> dict[str, Any]:
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {"error": True, "message": f"Audio file does not exist: {audio_path}"}

        if self._pipeline is None:
            success = await self.load_model()
            if not success:
                return {"error": True, "message": "Failed to load diarization model"}

        kwargs: dict[str, Any] = {}
        if num_speakers is not None:
            kwargs["num_speakers"] = num_speakers
        if min_speakers is not None:
            kwargs["min_speakers"] = min_speakers
        if max_speakers is not None:
            kwargs["max_speakers"] = max_speakers

        try:
            waveform = None
            sample_rate = None
            try:
                import soundfile as sf
                import torch

                data, sr = sf.read(str(audio_file), dtype="float32", always_2d=True)
                waveform = torch.from_numpy(data.T)
                sample_rate = int(sr)
            except Exception:
                import torchaudio

                waveform, sample_rate = torchaudio.load(str(audio_file))

            audio_input = {"waveform": waveform, "sample_rate": sample_rate}
            diarization = await asyncio.to_thread(self._pipeline, audio_input, **kwargs)

            segments: list[SpeakerSegment] = []
            speakers_set = set()
            annotation = diarization.speaker_diarization
            for turn, _, speaker in annotation.itertracks(yield_label=True):
                segments.append(SpeakerSegment(speaker=speaker, start=turn.start, end=turn.end))
                speakers_set.add(speaker)

            duration = max((seg.end for seg in segments), default=0.0)
            speakers = sorted(list(speakers_set))
            return {
                "error": False,
                "segments": [seg.to_dict() for seg in segments],
                "speakers": speakers,
                "num_speakers": len(speakers),
                "duration": duration,
            }
        except Exception as exc:
            return {"error": True, "message": str(exc)}

    def merge_with_transcription(
        self,
        diarization_segments: list[dict[str, Any]],
        transcription_segments: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not diarization_segments:
            return transcription_segments

        result: list[dict[str, Any]] = []
        for trans_seg in transcription_segments:
            trans_start = trans_seg.get("start", 0)
            trans_end = trans_seg.get("end", 0)
            trans_mid = (trans_start + trans_end) / 2

            best_speaker = None
            best_overlap = 0
            for diar_seg in diarization_segments:
                diar_start = diar_seg.get("start", 0)
                diar_end = diar_seg.get("end", 0)
                overlap_start = max(trans_start, diar_start)
                overlap_end = min(trans_end, diar_end)
                overlap = max(0, overlap_end - overlap_start)
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_speaker = diar_seg.get("speaker")

            if best_speaker is None:
                for diar_seg in diarization_segments:
                    if diar_seg.get("start", 0) <= trans_mid <= diar_seg.get("end", 0):
                        best_speaker = diar_seg.get("speaker")
                        break

            merged_seg = dict(trans_seg)
            merged_seg["speaker"] = best_speaker or "UNKNOWN"
            result.append(merged_seg)

        return result
