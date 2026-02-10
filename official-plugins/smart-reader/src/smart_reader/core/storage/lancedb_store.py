from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List

import lancedb


@dataclass
class ChunkRecord:
    text: str
    page: int
    vector: List[float]


class LanceDBStore:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir

    def upsert_chunks(self, file_id: str, chunks: List[ChunkRecord]) -> None:
        if not chunks:
            return
        db_dir = self._db_dir(file_id)
        db_dir.mkdir(parents=True, exist_ok=True)
        db = lancedb.connect(str(db_dir))
        table_name = self._table_name(file_id)
        data = [
            {"text": chunk.text, "page": chunk.page, "vector": chunk.vector}
            for chunk in chunks
        ]
        if table_name in db.table_names():
            db.drop_table(table_name)
        db.create_table(table_name, data, mode="overwrite")

    def query(self, file_id: str, vector: List[float], top_k: int = 4) -> List[ChunkRecord]:
        if not vector:
            return []
        db_dir = self._db_dir(file_id)
        if not db_dir.exists():
            return []
        db = lancedb.connect(str(db_dir))
        table_name = self._table_name(file_id)
        if table_name not in db.table_names():
            return []
        table = db.open_table(table_name)
        results = table.search(vector).limit(top_k).to_list()
        return [
            ChunkRecord(text=item.get("text", ""), page=int(item.get("page", 0)), vector=[])
            for item in results
        ]

    def _db_dir(self, file_id: str) -> Path:
        return self.base_dir / file_id

    def _table_name(self, file_id: str) -> str:
        return f"chunks_{file_id}"
