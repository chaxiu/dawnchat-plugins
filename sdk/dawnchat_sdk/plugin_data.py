from __future__ import annotations

import os
import platform
from dataclasses import dataclass
from pathlib import Path


def _default_data_root() -> Path:
    env_dir = os.getenv("DAWNCHAT_DATA_DIR", "").strip()
    if env_dir:
        return Path(env_dir).expanduser()

    system = platform.system()
    if system == "Darwin":
        return Path.home() / "Library" / "Application Support" / "DawnChat"
    if system == "Windows":
        appdata = os.getenv("APPDATA")
        if appdata:
            return Path(appdata) / "DawnChat"
        return Path.home() / "AppData" / "Roaming" / "DawnChat"
    return Path.home() / ".local" / "share" / "DawnChat"


@dataclass(frozen=True)
class PluginDataPaths:
    plugin_id: str
    data_root: Path

    @classmethod
    def from_plugin_id(cls, plugin_id: str) -> "PluginDataPaths":
        return cls(plugin_id=plugin_id, data_root=_default_data_root())

    @property
    def plugin_root(self) -> Path:
        return self.data_root / "plugins" / self.plugin_id

    @property
    def data_dir(self) -> Path:
        return self.plugin_root / "data"

    @property
    def models_dir(self) -> Path:
        return self.data_dir / "models"

    @property
    def cache_dir(self) -> Path:
        return self.data_dir / "cache"

    @property
    def tmp_dir(self) -> Path:
        return self.data_dir / "tmp"

    @property
    def meta_dir(self) -> Path:
        return self.data_dir / "meta"

    def ensure_dirs(self) -> "PluginDataPaths":
        for directory in (
            self.plugin_root,
            self.data_dir,
            self.models_dir,
            self.cache_dir,
            self.tmp_dir,
            self.meta_dir,
        ):
            directory.mkdir(parents=True, exist_ok=True)
        return self


__all__ = ["PluginDataPaths"]
