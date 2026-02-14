from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

from dawnchat_sdk import (
    DownloadSource,
    DownloadTaskStore,
    ModelDownloadFacade,
    PluginDataPaths,
    is_single_file_installed,
)


@dataclass(frozen=True)
class ComfyModelSpec:
    model_id: str
    name: str
    description: str
    download_url: str
    filename: str
    model_type: str
    size_gb: float
    tags: list[str]


BUILTIN_MODELS: list[ComfyModelSpec] = [
    ComfyModelSpec(
        model_id="sdxl-base",
        name="SDXL 1.0 Base",
        description="Stability AI base image generation model",
        download_url="https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors",
        filename="sd_xl_base_1.0.safetensors",
        model_type="checkpoints",
        size_gb=6.94,
        tags=["recommended", "base"],
    ),
    ComfyModelSpec(
        model_id="sdxl-inpaint",
        name="SDXL Inpaint",
        description="SDXL inpaint model",
        download_url="https://huggingface.co/diffusers/stable-diffusion-xl-1.0-inpainting-0.1/resolve/main/sd_xl_base_1.0_inpainting_0.1.safetensors",
        filename="sd_xl_base_1.0_inpainting_0.1.safetensors",
        model_type="checkpoints",
        size_gb=6.94,
        tags=["recommended"],
    ),
    ComfyModelSpec(
        model_id="realesrgan-x4",
        name="RealESRGAN x4",
        description="4x upscaling model",
        download_url="https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
        filename="RealESRGAN_x4plus.pth",
        model_type="upscale_models",
        size_gb=0.064,
        tags=["lightweight"],
    ),
]


class ComfyUIModelManager:
    def __init__(self) -> None:
        plugin_id = os.environ.get("DAWNCHAT_PLUGIN_ID", "com.dawnchat.comfyui").strip() or "com.dawnchat.comfyui"
        self.paths = PluginDataPaths.from_plugin_id(plugin_id).ensure_dirs()
        self.downloader = ModelDownloadFacade()
        self.models: dict[str, ComfyModelSpec] = {item.model_id: item for item in BUILTIN_MODELS}
        self.task_store = DownloadTaskStore(self.paths.meta_dir / "download_tasks.json")
        self._ensure_model_subdirs()

    def _ensure_model_subdirs(self) -> None:
        for subdir in ("checkpoints", "upscale_models", "inpaint", "vae", "loras"):
            (self.paths.models_dir / subdir).mkdir(parents=True, exist_ok=True)

    def get_model_path(self, model_id: str) -> Optional[Path]:
        spec = self.models.get(model_id)
        if not spec:
            return None
        return self.paths.models_dir / spec.model_type / spec.filename

    async def _get_task_for_model(self, model_id: str):
        task_id = self.task_store.get(model_id)
        if not task_id:
            return None
        try:
            return await self.downloader.get(task_id)
        except Exception:
            return None

    async def is_model_installed(self, model_id: str) -> bool:
        path = self.get_model_path(model_id)
        if not path:
            return False
        task = await self._get_task_for_model(model_id)
        return is_single_file_installed(path, task=task)

    async def list_models(self) -> list[dict[str, Any]]:
        task_map = self.task_store.load()
        items: list[dict[str, Any]] = []
        for model_id, spec in self.models.items():
            progress = {"status": "idle", "progress": 0, "downloaded_bytes": 0, "total_bytes": 0, "speed": ""}
            task_id = task_map.get(model_id)
            if task_id:
                try:
                    task = await self.downloader.get(task_id)
                    progress = {
                        "status": task.status,
                        "progress": task.progress,
                        "downloaded_bytes": task.downloaded_bytes,
                        "total_bytes": task.total_bytes,
                        "speed": task.speed,
                        "error_message": task.error_message,
                    }
                except Exception:
                    pass
            items.append(
                {
                    "id": model_id,
                    "name": spec.name,
                    "description": spec.description,
                    "download_url": spec.download_url,
                    "filename": spec.filename,
                    "model_type": spec.model_type,
                    "size_gb": spec.size_gb,
                    "tags": spec.tags,
                    "installed": await self.is_model_installed(model_id),
                    "model_path": str(self.get_model_path(model_id)),
                    **progress,
                }
            )
        return items

    def _parse_hf_url(self, url: str) -> tuple[str, str]:
        parsed = urlparse(url)
        parts = parsed.path.strip("/").split("/")
        if len(parts) >= 5 and parts[2] == "resolve":
            repo_id = f"{parts[0]}/{parts[1]}"
            filename = "/".join(parts[4:])
            return repo_id, filename
        return "", ""

    async def start_download(self, model_id: str, use_mirror: Optional[bool], resume: bool) -> dict[str, Any]:
        spec = self.models.get(model_id)
        if not spec:
            return {"code": 404, "message": "model_not_found", "data": None}
        if await self.is_model_installed(model_id):
            return {"code": 200, "message": "already_installed", "data": {"model_id": model_id}}

        task = None
        if "huggingface.co" in spec.download_url:
            repo_id, filename = self._parse_hf_url(spec.download_url)
            if not repo_id or not filename:
                return {"code": 400, "message": "invalid_hf_url", "data": None}
            task = await self.downloader.start_hf_download(
                model_type="comfyui",
                model_id=model_id,
                hf_repo_id=repo_id,
                save_dir=self.paths.models_dir / spec.model_type,
                filename=filename,
                use_mirror=use_mirror,
                resume=resume,
            )
        else:
            task = await self.downloader.start_url_download(
                source=DownloadSource.GITHUB if "github.com" in spec.download_url else DownloadSource.HTTP,
                url=spec.download_url,
                save_path=self.paths.models_dir / spec.model_type / spec.filename,
                task_id=f"comfyui_{model_id}",
                use_mirror=use_mirror,
                resume=resume,
            )

        self.task_store.set(model_id, task.task_id)
        return {"code": 200, "message": "started", "data": {"task_id": task.task_id, "model_id": model_id}}

    async def get_download_status(self, model_id: str) -> dict[str, Any]:
        if await self.is_model_installed(model_id):
            return {"code": 200, "message": "success", "data": {"status": "completed", "progress": 100, "model_id": model_id}}
        task_id = self.task_store.get(model_id)
        if not task_id:
            return {"code": 200, "message": "success", "data": {"status": "not_found", "progress": 0, "model_id": model_id}}
        task = await self.downloader.get(task_id)
        return {
            "code": 200,
            "message": "success",
            "data": {
                "task_id": task.task_id,
                "status": task.status,
                "progress": task.progress,
                "downloaded_bytes": task.downloaded_bytes,
                "total_bytes": task.total_bytes,
                "speed": task.speed,
                "error_message": task.error_message,
                "model_id": model_id,
            },
        }

    async def pause_download(self, model_id: str) -> dict[str, Any]:
        task_id = self.task_store.get(model_id)
        if not task_id:
            return {"code": 404, "message": "download_task_not_found", "data": None}
        await self.downloader.pause(task_id)
        return {"code": 200, "message": "paused", "data": {"task_id": task_id, "model_id": model_id}}

    async def cancel_download(self, model_id: str) -> dict[str, Any]:
        task_id = self.task_store.get(model_id)
        if not task_id:
            return {"code": 404, "message": "download_task_not_found", "data": None}
        await self.downloader.cancel(task_id)
        self.task_store.remove(model_id)
        return {"code": 200, "message": "cancelled", "data": {"task_id": task_id, "model_id": model_id}}

    async def list_pending_downloads(self) -> dict[str, Any]:
        tasks = await self.downloader.pending(model_type="comfyui", task_id_prefix="comfyui_")
        result: list[dict[str, Any]] = []
        upserts: dict[str, str] = {}
        for task in tasks:
            result.append(
                {
                    "task_id": task.task_id,
                    "model_id": task.model_id or "",
                    "status": task.status,
                    "progress": task.progress,
                    "downloaded_bytes": task.downloaded_bytes,
                    "total_bytes": task.total_bytes,
                    "speed": task.speed,
                    "error_message": task.error_message,
                }
            )
            if task.model_id:
                upserts[str(task.model_id)] = task.task_id
        self.task_store.upsert_many(upserts)
        return {"code": 200, "message": "success", "data": {"tasks": result, "count": len(result)}}


model_manager = ComfyUIModelManager()
