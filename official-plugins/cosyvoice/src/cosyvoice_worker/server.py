import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from starlette.responses import JSONResponse

from cosyvoice_worker.engine import CosyVoiceEngine


def _inject_cosyvoice_paths() -> None:
    def _prepend_path(path: Path) -> None:
        path_str = str(path)
        if path_str and path_str not in sys.path:
            sys.path.insert(0, path_str)

    app_root = Path(__file__).resolve().parent.parent
    _prepend_path(app_root)
    # CosyVoice upstream repo is vendored as `src/cosyvoice/cosyvoice/...`.
    # Add `src/cosyvoice` so `import cosyvoice.cli...` resolves correctly.
    vendored_source_root = app_root / "cosyvoice"
    if vendored_source_root.exists():
        _prepend_path(vendored_source_root)
    local_overrides_root = app_root / "local_overrides"
    if local_overrides_root.exists():
        _prepend_path(local_overrides_root)

    source_dir = os.getenv("COSYVOICE_SOURCE_DIR", "")
    if source_dir:
        root = Path(source_dir).expanduser()
        _prepend_path(root)
        nested_root = root / "cosyvoice"
        if nested_root.exists():
            _prepend_path(nested_root)

        matcha_root = root / "third_party" / "Matcha-TTS"
        if matcha_root.exists():
            _prepend_path(matcha_root)
            matcha_src = matcha_root / "src"
            if matcha_src.exists():
                _prepend_path(matcha_src)

    # Matcha-TTS is vendored inside `src/cosyvoice/third_party/Matcha-TTS`.
    vendored_matcha_root = vendored_source_root / "third_party" / "Matcha-TTS"
    if vendored_matcha_root.exists():
        _prepend_path(vendored_matcha_root)
        vendored_matcha_src = vendored_matcha_root / "src"
        if vendored_matcha_src.exists():
            _prepend_path(vendored_matcha_src)

    bundled_matcha_root = app_root / "third_party" / "Matcha-TTS"
    if bundled_matcha_root.exists():
        _prepend_path(bundled_matcha_root)
        bundled_matcha_src = bundled_matcha_root / "src"
        if bundled_matcha_src.exists():
            _prepend_path(bundled_matcha_src)


def _patch_yaml_loader_max_depth() -> None:
    try:
        import yaml

        for name in ("Loader", "SafeLoader", "FullLoader", "BaseLoader"):
            loader_cls = getattr(yaml, name, None)
            if loader_cls is not None and not hasattr(loader_cls, "max_depth"):
                setattr(loader_cls, "max_depth", None)
    except Exception:
        pass

    try:
        from ruamel.yaml import loader as ruamel_loader

        for name in ("Loader", "SafeLoader", "RoundTripLoader", "BaseLoader"):
            loader_cls = getattr(ruamel_loader, name, None)
            if loader_cls is not None and not hasattr(loader_cls, "max_depth"):
                setattr(loader_cls, "max_depth", None)
    except Exception:
        pass


def _ensure_ttsfrd_resource_link() -> None:
    resource_dir = os.getenv("COSYVOICE_TTSFRD_RESOURCE_DIR", "")
    if not resource_dir:
        return
    resource_path = Path(resource_dir).expanduser()
    if not resource_path.exists():
        return

    root = Path.cwd()
    target_parent = root / "pretrained_models" / "CosyVoice-ttsfrd"
    target_parent.mkdir(parents=True, exist_ok=True)
    link = target_parent / "resource"
    if link.exists():
        return
    try:
        link.symlink_to(resource_path, target_is_directory=True)
    except Exception:
        return


_inject_cosyvoice_paths()
_patch_yaml_loader_max_depth()

engine = CosyVoiceEngine()
app = FastAPI()


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Any, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"code": 500, "message": str(exc) or "internal_error", "data": None})


class LoadRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_id: str = Field(min_length=1)
    model_path: str = Field(min_length=1)


class UnloadRequest(BaseModel):
    pass


class SpeakersRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_id: str = Field(min_length=1)
    model_path: str = Field(min_length=1)


class SynthesizeRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_id: str = Field(min_length=1)
    model_path: str = Field(min_length=1)
    mode: str = Field(default="sft")
    text: str = Field(min_length=1)
    speaker: Optional[str] = None
    prompt_wav_path: Optional[str] = None
    prompt_text: Optional[str] = None
    instruct_text: Optional[str] = None
    output_path: Optional[str] = None
    speed: Optional[float] = None
    text_frontend: Optional[bool] = None
    timeout_seconds: Optional[float] = None


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok"}


@app.get("/v1/status")
async def status() -> Dict[str, Any]:
    try:
        import cosyvoice as cosyvoice_pkg

        cosyvoice_module_path = str(Path(getattr(cosyvoice_pkg, "__file__", "")).resolve())
    except Exception:
        cosyvoice_module_path = None
    return {
        "status": "ok",
        "loaded_model_id": engine.loaded_model_id,
        "loaded_model_path": engine.loaded_model_path,
        "device": engine.device,
        "sample_rate": engine.sample_rate,
        "cosyvoice_module_path": cosyvoice_module_path,
        "cosyvoice_source_dir_env": os.getenv("COSYVOICE_SOURCE_DIR") or None,
    }


@app.post("/v1/models/load")
async def load_model(req: LoadRequest) -> Dict[str, Any]:
    model_path = Path(req.model_path).expanduser()
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="model_path_not_found")

    _ensure_ttsfrd_resource_link()
    result = await engine.load(model_id=req.model_id, model_path=model_path)
    return {"status": "ok", **result}


@app.post("/v1/models/unload")
async def unload_model(_: UnloadRequest) -> Dict[str, Any]:
    await engine.unload()
    return {"status": "ok"}


@app.post("/v1/models/speakers")
async def list_model_speakers(req: SpeakersRequest) -> Dict[str, Any]:
    model_path = Path(req.model_path).expanduser()
    if not model_path.exists():
        return {"status": "ok", "speakers": []}
    speakers = engine.list_speakers_for_model(model_path=model_path)
    return {"status": "ok", "speakers": speakers}


@app.post("/v1/tts/synthesize")
async def synthesize(req: SynthesizeRequest) -> Dict[str, Any]:
    model_path = Path(req.model_path).expanduser()
    if not model_path.exists():
        return {"code": 404, "message": "model_path_not_found", "data": None}

    prompt_wav_path = Path(req.prompt_wav_path).expanduser() if req.prompt_wav_path else None
    output_path = Path(req.output_path).expanduser() if req.output_path else None

    _ensure_ttsfrd_resource_link()
    return await engine.synthesize(
        model_id=req.model_id,
        model_path=model_path,
        mode=req.mode,
        text=req.text,
        speaker=req.speaker,
        prompt_wav_path=prompt_wav_path,
        prompt_text=req.prompt_text,
        instruct_text=req.instruct_text,
        output_path=output_path,
        speed=req.speed,
        text_frontend=req.text_frontend,
        timeout_seconds=req.timeout_seconds,
    )
