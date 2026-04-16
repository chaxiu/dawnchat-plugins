"""
Resolve frontend paths from official plugin manifest.json.

Uses preview.frontend_dir (default web-src) and runtime.root (e.g. _ir) so desktop
plugins under _ir/frontend/web-src match build.sh / preview metadata.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def resolve_frontend_web_src(plugin_dir: Path) -> Path | None:
    """
    Return the frontend directory that contains package.json / Vite app.

    - If manifest.runtime.root is set (e.g. "_ir"), path is
      plugin_dir / root / preview.frontend_dir (e.g. frontend/web-src).
    - Otherwise plugin_dir / preview.frontend_dir (typically web-src).
    Returns None if manifest is missing/invalid or ui.type is not web.
    """
    manifest_path = plugin_dir / "manifest.json"
    if not manifest_path.is_file():
        return None
    try:
        manifest: dict[str, Any] = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    ui = manifest.get("ui") or {}
    if str(ui.get("type") or "").strip().lower() != "web":
        return None

    preview = manifest.get("preview") or {}
    frontend_dir = str(preview.get("frontend_dir") or "web-src").strip() or "web-src"

    runtime = manifest.get("runtime") or {}
    root = str(runtime.get("root") or "").strip()

    if root:
        return (plugin_dir / root / frontend_dir).resolve()
    return (plugin_dir / frontend_dir).resolve()
