import json
import threading
import time
import uuid
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional


@dataclass
class LibraryFile:
    id: str
    name: str
    path: str
    status: str
    message: str
    page_count: int
    created_at: float


class LibraryStore:
    def __init__(self, index_path: Path) -> None:
        self.index_path = index_path
        self._lock = threading.RLock()

    def list_files(self) -> List[LibraryFile]:
        with self._lock:
            data = self._load()
            items = [self._to_record(item) for item in data.get("files", [])]
            return sorted(items, key=lambda item: item.created_at, reverse=True)

    def add_file(self, name: str, path: Path, file_id: Optional[str] = None) -> LibraryFile:
        with self._lock:
            data = self._load()
            record = LibraryFile(
                id=file_id or uuid.uuid4().hex,
                name=name,
                path=str(path),
                status="processing",
                message="",
                page_count=0,
                created_at=time.time(),
            )
            data.setdefault("files", []).append(asdict(record))
            self._save(data)
            return record

    def update_status(self, file_id: str, status: str, message: str = "", page_count: int = 0) -> None:
        with self._lock:
            data = self._load()
            for item in data.get("files", []):
                if item.get("id") == file_id:
                    item["status"] = status
                    item["message"] = message
                    if page_count:
                        item["page_count"] = page_count
                    break
            self._save(data)

    def get_file(self, file_id: str) -> Optional[LibraryFile]:
        with self._lock:
            data = self._load()
            for item in data.get("files", []):
                if item.get("id") == file_id:
                    return self._to_record(item)
        return None

    def _load(self) -> dict[str, list[dict[str, object]]]:
        if not self.index_path.exists():
            return {"files": []}
        raw = self.index_path.read_text(encoding="utf-8")
        if not raw.strip():
            return {"files": []}
        return json.loads(raw)

    def _save(self, data: dict[str, list[dict[str, object]]]) -> None:
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        self.index_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def _to_record(self, item: dict[str, object]) -> LibraryFile:
        return LibraryFile(
            id=str(item.get("id", "")),
            name=str(item.get("name", "")),
            path=str(item.get("path", "")),
            status=str(item.get("status", "")),
            message=str(item.get("message", "")),
            page_count=self._to_int(item.get("page_count")),
            created_at=self._to_float(item.get("created_at")),
        )

    def _to_int(self, value: object) -> int:
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, str):
            try:
                return int(float(value))
            except ValueError:
                return 0
        return 0

    def _to_float(self, value: object) -> float:
        if isinstance(value, bool):
            return float(value)
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return 0.0
        return 0.0
