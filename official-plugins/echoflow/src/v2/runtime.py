from __future__ import annotations

import os
import tempfile
import time
import uuid
from pathlib import Path
from typing import Optional


def echoflow_temp_dir() -> Path:
    p = Path(tempfile.gettempdir()) / "echoflow"
    p.mkdir(parents=True, exist_ok=True)
    return p


def new_temp_path(suffix: str, prefix: str = "tmp_") -> Path:
    name = f"{prefix}{uuid.uuid4().hex}{suffix}"
    return echoflow_temp_dir() / name


def cleanup_temp_dir(older_than_s: float = 24 * 3600, max_files: int = 200) -> int:
    base = echoflow_temp_dir()
    now = time.time()
    removed = 0

    try:
        files = [p for p in base.iterdir() if p.is_file()]
    except Exception:
        return 0

    files.sort(key=lambda p: p.stat().st_mtime if p.exists() else now)

    for p in files:
        try:
            age = now - p.stat().st_mtime
        except Exception:
            age = older_than_s + 1
        if age >= older_than_s:
            try:
                p.unlink(missing_ok=True)  # type: ignore[arg-type]
                removed += 1
            except Exception:
                pass

    try:
        files = [p for p in base.iterdir() if p.is_file()]
        if len(files) > max_files:
            files.sort(key=lambda p: p.stat().st_mtime if p.exists() else now)
            for p in files[: max(0, len(files) - max_files)]:
                try:
                    p.unlink(missing_ok=True)  # type: ignore[arg-type]
                    removed += 1
                except Exception:
                    pass
    except Exception:
        pass

    return removed


def safe_unlink(path: Optional[os.PathLike | str]) -> bool:
    if not path:
        return False
    try:
        p = Path(path)
        p.unlink(missing_ok=True)  # type: ignore[arg-type]
        return True
    except Exception:
        return False

