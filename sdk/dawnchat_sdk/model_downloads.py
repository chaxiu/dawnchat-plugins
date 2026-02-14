from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Optional

from .host import host


class DownloadSource(str, Enum):
    HUGGINGFACE = "huggingface"
    GITHUB = "github"
    HTTP = "http"


@dataclass
class DownloadTask:
    task_id: str
    backend: str
    source: str
    status: str
    progress: float
    downloaded_bytes: int
    total_bytes: int
    speed: str = ""
    error_message: Optional[str] = None
    model_type: Optional[str] = None
    model_id: Optional[str] = None
    hf_repo_id: Optional[str] = None
    filename: Optional[str] = None
    url: Optional[str] = None
    save_dir: Optional[str] = None
    save_path: Optional[str] = None

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "DownloadTask":
        return cls(
            task_id=str(payload.get("task_id") or ""),
            backend=str(payload.get("backend") or ""),
            source=str(payload.get("source") or ""),
            status=str(payload.get("status") or "unknown"),
            progress=float(payload.get("progress") or 0.0),
            downloaded_bytes=int(payload.get("downloaded_bytes") or 0),
            total_bytes=int(payload.get("total_bytes") or 0),
            speed=str(payload.get("speed") or ""),
            error_message=payload.get("error_message"),
            model_type=payload.get("model_type"),
            model_id=payload.get("model_id"),
            hf_repo_id=payload.get("hf_repo_id"),
            filename=payload.get("filename"),
            url=payload.get("url"),
            save_dir=payload.get("save_dir"),
            save_path=payload.get("save_path"),
        )


class ModelDownloadFacade:
    async def start_hf_download(
        self,
        *,
        model_type: str,
        model_id: str,
        hf_repo_id: str,
        save_dir: Path,
        filename: Optional[str] = None,
        use_mirror: Optional[bool] = None,
        resume: bool = True,
    ) -> DownloadTask:
        response = await host._request(
            "POST",
            "/sdk/downloads/start",
            json={
                "source": DownloadSource.HUGGINGFACE.value,
                "model_type": model_type,
                "model_id": model_id,
                "hf_repo_id": hf_repo_id,
                "save_dir": str(save_dir),
                "filename": filename,
                "use_mirror": use_mirror,
                "resume": resume,
            },
        )
        return DownloadTask.from_dict(response.get("task", {}))

    async def start_url_download(
        self,
        *,
        source: DownloadSource,
        url: str,
        save_path: Path,
        task_id: str,
        use_mirror: Optional[bool] = None,
        resume: bool = True,
    ) -> DownloadTask:
        if source not in {DownloadSource.GITHUB, DownloadSource.HTTP}:
            raise ValueError("source must be github/http for url download")

        response = await host._request(
            "POST",
            "/sdk/downloads/start",
            json={
                "source": source.value,
                "url": url,
                "save_path": str(save_path),
                "task_id": task_id,
                "use_mirror": use_mirror,
                "resume": resume,
            },
        )
        return DownloadTask.from_dict(response.get("task", {}))

    async def get(self, task_id: str) -> DownloadTask:
        response = await host._request("GET", f"/sdk/downloads/task/{task_id}")
        return DownloadTask.from_dict(response.get("task", {}))

    async def pause(self, task_id: str) -> dict[str, Any]:
        return await host._request("POST", f"/sdk/downloads/task/{task_id}/pause", json={})

    async def cancel(self, task_id: str) -> dict[str, Any]:
        return await host._request("POST", f"/sdk/downloads/task/{task_id}/cancel", json={})

    async def pending(
        self,
        *,
        model_type: Optional[str] = None,
        task_id_prefix: Optional[str] = None,
    ) -> list[DownloadTask]:
        response = await host._request("GET", "/sdk/downloads/pending")
        tasks = response.get("tasks") or []
        parsed = [DownloadTask.from_dict(item) for item in tasks if isinstance(item, dict)]
        if model_type:
            parsed = [t for t in parsed if t.model_type == model_type]
        if task_id_prefix:
            parsed = [t for t in parsed if str(t.task_id).startswith(task_id_prefix)]
        return parsed


__all__ = ["DownloadSource", "DownloadTask", "ModelDownloadFacade"]
