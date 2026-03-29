import json
import os
from pathlib import Path
from typing import Any


def load_manifest(plugin_root: Path) -> dict[str, Any]:
    manifest_path = plugin_root / "manifest.json"
    if not manifest_path.exists():
        return {}
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def resolve_plugin_id() -> str:
    return os.environ.get("DAWNCHAT_PLUGIN_ID", "")
