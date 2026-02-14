from __future__ import annotations

import json
from pathlib import Path


class DownloadTaskStore:
    def __init__(self, file_path: Path) -> None:
        self._file_path = file_path

    def load(self) -> dict[str, str]:
        if not self._file_path.exists():
            return {}
        try:
            data = json.loads(self._file_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return {str(k): str(v) for k, v in data.items()}
        except Exception:
            return {}
        return {}

    def save(self, mapping: dict[str, str]) -> None:
        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        self._file_path.write_text(
            json.dumps(mapping, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def get(self, key: str) -> str | None:
        return self.load().get(str(key))

    def set(self, key: str, task_id: str) -> None:
        mapping = self.load()
        mapping[str(key)] = str(task_id)
        self.save(mapping)

    def remove(self, key: str) -> str | None:
        mapping = self.load()
        removed = mapping.pop(str(key), None)
        self.save(mapping)
        return removed

    def upsert_many(self, pairs: dict[str, str]) -> None:
        if not pairs:
            return
        mapping = self.load()
        for k, v in pairs.items():
            mapping[str(k)] = str(v)
        self.save(mapping)
