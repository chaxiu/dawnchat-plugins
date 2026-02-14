from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from dawnchat_sdk import (
    ModelDownloadFacade,
    PluginDataPaths,
    DownloadTaskStore,
    is_repo_installed,
)


@dataclass(frozen=True)
class VibeVoiceModelSpec:
    model_size: str
    hf_repo_id: str
    description: str


MODEL_SPECS: dict[str, VibeVoiceModelSpec] = {
    "0.5B": VibeVoiceModelSpec(
        model_size="0.5B",
        hf_repo_id="vibevoice/VibeVoice-Realtime-0.5B",
        description="Realtime model, lower latency",
    ),
    "1.5B": VibeVoiceModelSpec(
        model_size="1.5B",
        hf_repo_id="vibevoice/VibeVoice-1.5B",
        description="Balanced quality and speed",
    ),
    "7B": VibeVoiceModelSpec(
        model_size="7B",
        hf_repo_id="vibevoice/VibeVoice-7B",
        description="Highest quality model",
    ),
}


class VibeVoiceModelManager:
    def __init__(self) -> None:
        plugin_id = os.environ.get("DAWNCHAT_PLUGIN_ID", "com.dawnchat.vibevoice").strip() or "com.dawnchat.vibevoice"
        self.paths = PluginDataPaths.from_plugin_id(plugin_id).ensure_dirs()
        self.downloader = ModelDownloadFacade()
        self.task_store = DownloadTaskStore(self.paths.meta_dir / "download_tasks.json")

    def _repo_dir(self, repo_id: str) -> Path:
        owner, name = repo_id.split("/", 1)
        return self.paths.models_dir / owner / name

    async def _get_task_for_model(self, model_size: str):
        task_id = self.task_store.get(model_size)
        if not task_id:
            return None
        try:
            return await self.downloader.get(task_id)
        except Exception:
            return None

    def get_model_path(self, model_size: str) -> Optional[Path]:
        spec = MODEL_SPECS.get(model_size)
        if not spec:
            return None
        return self._repo_dir(spec.hf_repo_id)

    async def is_model_installed(self, model_size: str) -> bool:
        spec = MODEL_SPECS.get(model_size)
        if not spec:
            return False
        repo_dir = self._repo_dir(spec.hf_repo_id)
        task = await self._get_task_for_model(model_size)
        return is_repo_installed(repo_dir, task=task, required_entries=["config.json"])

    async def get_installed_model_path(self, model_size: str) -> Optional[Path]:
        repo_dir = self.get_model_path(model_size)
        if not repo_dir:
            return None
        if await self.is_model_installed(model_size):
            return repo_dir
        return None

    def get_default_model_size(self) -> Optional[str]:
        # Keep sync path for status view; strict availability is enforced in async APIs.
        for model_size in ("0.5B", "1.5B", "7B"):
            p = self.get_model_path(model_size)
            if p and (p / "config.json").exists():
                return model_size
        return None

    def get_voices_dir(self) -> Path:
        voices_dir = self.paths.models_dir / "voices"
        voices_dir.mkdir(parents=True, exist_ok=True)
        self._sync_demo_voices(voices_dir)
        return voices_dir

    def _sync_demo_voices(self, voices_dir: Path) -> None:
        plugin_root = Path(__file__).resolve().parent.parent
        source = plugin_root / "vibevoice" / "demo" / "voices"
        if not source.exists():
            return
        for file in source.glob("*.wav"):
            target = voices_dir / file.name
            if not target.exists():
                shutil.copy2(file, target)

        src_streaming = source / "streaming_model"
        if src_streaming.exists():
            dst_streaming = voices_dir / "streaming_model"
            dst_streaming.mkdir(parents=True, exist_ok=True)
            for file in src_streaming.glob("*.pt"):
                target = dst_streaming / file.name
                if not target.exists():
                    shutil.copy2(file, target)

    async def list_models(self) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for model_size, spec in MODEL_SPECS.items():
            path = await self.get_installed_model_path(model_size)
            result.append(
                {
                    "model_size": model_size,
                    "hf_repo_id": spec.hf_repo_id,
                    "description": spec.description,
                    "installed": path is not None,
                    "model_path": str(path) if path else None,
                }
            )
        return result

    async def start_download(self, model_size: str, use_mirror: Optional[bool], resume: bool) -> dict[str, Any]:
        spec = MODEL_SPECS.get(model_size)
        if not spec:
            return {"code": 400, "message": f"unsupported_model_size: {model_size}", "data": None}
        if await self.is_model_installed(model_size):
            return {
                "code": 200,
                "message": "already_installed",
                "data": {"model_size": model_size, "installed": True, "model_path": str(await self.get_installed_model_path(model_size))},
            }
        task = await self.downloader.start_hf_download(
            model_type="vibevoice",
            model_id=model_size,
            hf_repo_id=spec.hf_repo_id,
            save_dir=self._repo_dir(spec.hf_repo_id),
            use_mirror=use_mirror,
            resume=resume,
        )
        self.task_store.set(model_size, task.task_id)
        return {"code": 200, "message": "started", "data": {"task_id": task.task_id, "model_size": model_size}}

    async def get_download_status(self, model_size: str) -> dict[str, Any]:
        if await self.is_model_installed(model_size):
            return {
                "code": 200,
                "message": "success",
                "data": {"status": "completed", "progress": 100, "model_size": model_size, "installed": True},
            }
        task_id = self.task_store.get(model_size)
        if not task_id:
            return {"code": 200, "message": "success", "data": {"status": "not_found", "progress": 0, "model_size": model_size}}
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
                "model_size": model_size,
            },
        }

    async def pause_download(self, model_size: str) -> dict[str, Any]:
        task_id = self.task_store.get(model_size)
        if not task_id:
            return {"code": 404, "message": "download_task_not_found", "data": None}
        await self.downloader.pause(task_id)
        return {"code": 200, "message": "paused", "data": {"task_id": task_id, "model_size": model_size}}

    async def cancel_download(self, model_size: str) -> dict[str, Any]:
        task_id = self.task_store.get(model_size)
        if not task_id:
            return {"code": 404, "message": "download_task_not_found", "data": None}
        await self.downloader.cancel(task_id)
        self.task_store.remove(model_size)
        return {"code": 200, "message": "cancelled", "data": {"task_id": task_id, "model_size": model_size}}

    async def list_pending_downloads(self) -> dict[str, Any]:
        tasks = await self.downloader.pending(model_type="vibevoice")
        normalized: list[dict[str, Any]] = []
        upserts: dict[str, str] = {}
        for task in tasks:
            normalized.append(
                {
                    "task_id": task.task_id,
                    "model_size": task.model_id,
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


model_manager = VibeVoiceModelManager()
