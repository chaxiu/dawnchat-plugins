from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from dawnchat_sdk import (
    DownloadTaskStore,
    ModelDownloadFacade,
    PluginDataPaths,
    is_repo_installed,
)


@dataclass(frozen=True)
class CosyVoiceModelSpec:
    model_id: str
    hf_repo_id: str
    description: str
    is_resource_only: bool = False


MODEL_SPECS: dict[str, CosyVoiceModelSpec] = {
    "cv3_0.5b_2512": CosyVoiceModelSpec(
        model_id="cv3_0.5b_2512",
        hf_repo_id="FunAudioLLM/Fun-CosyVoice3-0.5B-2512",
        description="CosyVoice3 main model",
    ),
    "ttsfrd_resource": CosyVoiceModelSpec(
        model_id="ttsfrd_resource",
        hf_repo_id="FunAudioLLM/CosyVoice-ttsfrd",
        description="Text frontend resource",
        is_resource_only=True,
    ),
}


class CosyVoiceModelManager:
    def __init__(self) -> None:
        plugin_id = os.environ.get("DAWNCHAT_PLUGIN_ID", "com.dawnchat.cosyvoice").strip() or "com.dawnchat.cosyvoice"
        self.paths = PluginDataPaths.from_plugin_id(plugin_id).ensure_dirs()
        self.downloader = ModelDownloadFacade()
        self.task_store = DownloadTaskStore(self.paths.meta_dir / "download_tasks.json")

    def _repo_dir(self, repo_id: str) -> Path:
        owner, name = repo_id.split("/", 1)
        return self.paths.models_dir / owner / name

    async def _get_task_for_model(self, model_id: str):
        task_id = self.task_store.get(model_id)
        if not task_id:
            return None
        try:
            return await self.downloader.get(task_id)
        except Exception:
            return None

    def get_model_path(self, model_id: str) -> Optional[Path]:
        spec = MODEL_SPECS.get(model_id)
        if not spec:
            return None
        return self._repo_dir(spec.hf_repo_id)

    async def is_model_installed(self, model_id: str) -> bool:
        spec = MODEL_SPECS.get(model_id)
        if not spec:
            return False
        repo_dir = self._repo_dir(spec.hf_repo_id)
        task = await self._get_task_for_model(model_id)

        if model_id == "ttsfrd_resource":
            return is_repo_installed(
                repo_dir,
                task=task,
                required_entries=["resource"],
            ) or is_repo_installed(
                repo_dir,
                task=task,
                required_entries=["resource.zip"],
            )

        required = [
            "cosyvoice3.yaml",
            "llm.pt",
            "flow.pt",
            "hift.pt",
            "campplus.onnx",
            "speech_tokenizer_v3.onnx",
            "CosyVoice-BlankEN",
        ]
        return is_repo_installed(repo_dir, task=task, required_entries=required)

    async def get_installed_model_path(self, model_id: str) -> Optional[Path]:
        repo_dir = self.get_model_path(model_id)
        if not repo_dir:
            return None
        if await self.is_model_installed(model_id):
            return repo_dir
        return None

    def get_default_main_model_id(self) -> Optional[str]:
        # Sync fast-path for status view; strict check in async APIs.
        for model_id, spec in MODEL_SPECS.items():
            if spec.is_resource_only:
                continue
            p = self.get_model_path(model_id)
            if p and (p / "cosyvoice3.yaml").exists():
                return model_id
        return None

    def get_ttsfrd_resource_dir(self) -> Optional[Path]:
        path = self.get_model_path("ttsfrd_resource")
        if not path:
            return None
        if (path / "resource").exists():
            return path / "resource"
        return path

    async def list_models(self) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for model_id, spec in MODEL_SPECS.items():
            path = await self.get_installed_model_path(model_id)
            result.append(
                {
                    "model_id": model_id,
                    "hf_repo_id": spec.hf_repo_id,
                    "description": spec.description,
                    "installed": path is not None,
                    "model_path": str(path) if path else None,
                    "is_resource_only": spec.is_resource_only,
                }
            )
        return result

    async def start_download(self, model_id: str, use_mirror: Optional[bool], resume: bool) -> dict[str, Any]:
        spec = MODEL_SPECS.get(model_id)
        if not spec:
            return {"code": 400, "message": f"unsupported_model_id: {model_id}", "data": None}
        if await self.is_model_installed(model_id):
            return {
                "code": 200,
                "message": "already_installed",
                "data": {"model_id": model_id, "installed": True, "model_path": str(await self.get_installed_model_path(model_id))},
            }
        task = await self.downloader.start_hf_download(
            model_type="cosyvoice",
            model_id=model_id,
            hf_repo_id=spec.hf_repo_id,
            save_dir=self._repo_dir(spec.hf_repo_id),
            use_mirror=use_mirror,
            resume=resume,
        )
        self.task_store.set(model_id, task.task_id)
        return {"code": 200, "message": "started", "data": {"task_id": task.task_id, "model_id": model_id}}

    async def get_download_status(self, model_id: str) -> dict[str, Any]:
        if await self.is_model_installed(model_id):
            return {
                "code": 200,
                "message": "success",
                "data": {"status": "completed", "progress": 100, "model_id": model_id, "installed": True},
            }
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
        tasks = await self.downloader.pending(model_type="cosyvoice")
        normalized: list[dict[str, Any]] = []
        upserts: dict[str, str] = {}
        for task in tasks:
            normalized.append(
                {
                    "task_id": task.task_id,
                    "model_id": task.model_id,
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
        return {"code": 200, "message": "success", "data": {"tasks": normalized, "count": len(normalized)}}


model_manager = CosyVoiceModelManager()
