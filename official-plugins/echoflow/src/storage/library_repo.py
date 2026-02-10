"""
Library Repository - CRUD operations for media libraries.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from .schema_v1 import utc_now_iso
from .sqlite import SqliteDatabase


@dataclass
class Library:
    """Represents a media library (folder containing media files)."""

    id: str
    name: str
    root_path: str
    status: str = "ready"  # ready / scanning / error
    scan_result_json: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""

    @property
    def scan_result(self) -> dict[str, Any]:
        if not self.scan_result_json:
            return {}
        try:
            return json.loads(self.scan_result_json)
        except Exception:
            return {}


@dataclass
class ScanItem:
    """Represents a scanned media item."""

    media_path: str
    subtitle_path: Optional[str]
    relative_path: str
    title: str
    status: str = "pending"  # pending / imported / error
    error_message: Optional[str] = None


@dataclass
class ScanResult:
    """Result of scanning a library directory."""

    items: list[ScanItem] = field(default_factory=list)
    total_media: int = 0
    with_subtitle: int = 0
    without_subtitle: int = 0
    errors: list[str] = field(default_factory=list)


class LibraryRepo:
    """Repository for media library CRUD operations."""

    def __init__(self, db: SqliteDatabase):
        self.db = db

    def create(
        self,
        *,
        name: str,
        root_path: str,
        status: str = "ready",
        scan_result: Optional[dict[str, Any]] = None,
    ) -> Library:
        """Create a new library."""
        now = utc_now_iso()
        library_id = uuid.uuid4().hex
        scan_result_json = json.dumps(scan_result, ensure_ascii=False) if scan_result else None

        with self.db.transaction() as conn:
            conn.execute(
                """
                INSERT INTO libraries(id, name, root_path, status, scan_result_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (library_id, name, root_path, status, scan_result_json, now, now),
            )

        return Library(
            id=library_id,
            name=name,
            root_path=root_path,
            status=status,
            scan_result_json=scan_result_json,
            created_at=now,
            updated_at=now,
        )

    def get(self, library_id: str) -> Optional[Library]:
        """Get a library by ID."""
        with self.db.connect() as conn:
            row = conn.execute("SELECT * FROM libraries WHERE id = ?", (library_id,)).fetchone()
        return self._row_to_library(row) if row else None

    def get_by_path(self, root_path: str) -> Optional[Library]:
        """Get a library by root path."""
        with self.db.connect() as conn:
            row = conn.execute("SELECT * FROM libraries WHERE root_path = ?", (root_path,)).fetchone()
        return self._row_to_library(row) if row else None

    def list_all(self) -> list[Library]:
        """List all libraries, ordered by updated_at DESC."""
        with self.db.connect() as conn:
            rows = conn.execute("SELECT * FROM libraries ORDER BY updated_at DESC").fetchall()
        return [self._row_to_library(r) for r in rows]

    def update(
        self,
        library_id: str,
        *,
        name: Optional[str] = None,
        status: Optional[str] = None,
        scan_result: Optional[dict[str, Any]] = None,
    ) -> Optional[Library]:
        """Update a library."""
        now = utc_now_iso()
        updates: list[str] = ["updated_at = ?"]
        params: list[Any] = [now]

        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if scan_result is not None:
            updates.append("scan_result_json = ?")
            params.append(json.dumps(scan_result, ensure_ascii=False))

        params.append(library_id)

        with self.db.transaction() as conn:
            conn.execute(
                f"UPDATE libraries SET {', '.join(updates)} WHERE id = ?",
                params,
            )
            row = conn.execute("SELECT * FROM libraries WHERE id = ?", (library_id,)).fetchone()

        return self._row_to_library(row) if row else None

    def delete(self, library_id: str) -> None:
        """Delete a library (courses with library_id will have it set to NULL)."""
        with self.db.transaction() as conn:
            conn.execute("DELETE FROM libraries WHERE id = ?", (library_id,))

    def get_courses_count(self, library_id: str) -> int:
        """Get count of courses belonging to a library."""
        with self.db.connect() as conn:
            row = conn.execute(
                "SELECT COUNT(*) as cnt FROM courses WHERE library_id = ?",
                (library_id,),
            ).fetchone()
        return int(row["cnt"]) if row else 0

    def list_courses(self, library_id: str) -> list[dict[str, Any]]:
        """List all courses belonging to a library."""
        with self.db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM courses WHERE library_id = ? ORDER BY relative_path, title",
                (library_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def _row_to_library(self, row: sqlite3.Row) -> Library:
        return Library(
            id=row["id"],
            name=row["name"],
            root_path=row["root_path"],
            status=row["status"],
            scan_result_json=row["scan_result_json"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )


