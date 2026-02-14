from __future__ import annotations

from pathlib import Path
from typing import Iterable, Optional

from .model_downloads import DownloadTask

_NON_COMPLETE_STATUSES = {"pending", "downloading", "paused", "failed", "cancelled"}


def _task_is_non_complete(task: Optional[DownloadTask]) -> bool:
    if not task:
        return False
    return str(task.status or "").lower() in _NON_COMPLETE_STATUSES


def _has_temp_companion(file_path: Path) -> bool:
    # Keep aligned with download managers:
    # - GitHub: <file>.downloading
    # - HF single-file: may leave partial/tmp artifacts in interrupted states
    suffixes = [".downloading", ".partial", ".tmp"]
    for suffix in suffixes:
        if file_path.with_suffix(file_path.suffix + suffix).exists():
            return True
    return False


def is_single_file_installed(
    file_path: Path,
    *,
    task: Optional[DownloadTask] = None,
    min_size_bytes: int = 1,
) -> bool:
    if _task_is_non_complete(task):
        return False
    if not file_path.exists() or not file_path.is_file():
        return False
    if _has_temp_companion(file_path):
        return False
    try:
        return file_path.stat().st_size >= max(0, int(min_size_bytes))
    except Exception:
        return False


def is_repo_installed(
    repo_dir: Path,
    *,
    task: Optional[DownloadTask] = None,
    required_entries: Optional[Iterable[str]] = None,
) -> bool:
    if _task_is_non_complete(task):
        return False
    if not repo_dir.exists() or not repo_dir.is_dir():
        return False
    try:
        if not any(repo_dir.iterdir()):
            return False
    except Exception:
        return False

    # Avoid obvious incomplete artifacts.
    for pattern in ("**/*.partial", "**/*.tmp", "**/*.downloading"):
        if any(repo_dir.glob(pattern)):
            return False

    if required_entries:
        for rel in required_entries:
            if not (repo_dir / rel).exists():
                return False
    return True


__all__ = ["is_single_file_installed", "is_repo_installed"]
