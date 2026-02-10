"""
Library Service - Directory scanning and batch import for media libraries.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Optional

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase
    from storage.library_repo import Library, LibraryRepo

logger = logging.getLogger("echoflow.library_service")


# Supported file extensions
SUBTITLE_EXTS: tuple[str, ...] = (".srt", ".vtt", ".ass", ".ssa", ".lrc", ".sub")
MEDIA_EXTS: tuple[str, ...] = (
    ".mp4", ".mkv", ".mov", ".avi", ".webm",
    ".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg", ".opus",
)


@dataclass
class ScanItem:
    """A scanned media item with optional subtitle."""

    media_path: str
    subtitle_path: Optional[str]
    relative_path: str
    title: str
    status: str = "pending"  # pending / importing / imported / error
    error_message: Optional[str] = None
    course_id: Optional[str] = None


@dataclass
class ScanResult:
    """Result of scanning a library directory."""

    items: list[ScanItem] = field(default_factory=list)
    total_media: int = 0
    with_subtitle: int = 0
    without_subtitle: int = 0
    errors: list[str] = field(default_factory=list)


@dataclass
class ImportProgress:
    """Progress of batch import."""

    total: int = 0
    completed: int = 0
    failed: int = 0
    current_item: Optional[str] = None


@dataclass
class ImportResult:
    """Result of batch import."""

    total: int = 0
    imported: int = 0
    failed: int = 0
    errors: list[str] = field(default_factory=list)


class LibraryService:
    """Service for media library scanning and batch import."""

    def __init__(
        self,
        library_repo: "LibraryRepo",
        course_db: "CourseDatabase",
    ):
        self.library_repo = library_repo
        self.course_db = course_db

    async def scan_directory(
        self,
        root_path: str,
        *,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> ScanResult:
        """
        Scan a directory recursively for media files with subtitles.

        Args:
            root_path: Root directory to scan
            progress_callback: Optional callback for progress updates

        Returns:
            ScanResult with found items and statistics
        """
        result = ScanResult()
        root = Path(root_path)

        if not root.exists() or not root.is_dir():
            result.errors.append(f"Directory not found: {root_path}")
            return result

        # Scan for all media files
        media_files: list[Path] = []
        subtitle_files: list[Path] = []

        def scan_dir(path: Path) -> None:
            try:
                for entry in path.iterdir():
                    if entry.is_dir():
                        scan_dir(entry)
                    elif entry.is_file():
                        ext = entry.suffix.lower()
                        if ext in MEDIA_EXTS:
                            media_files.append(entry)
                        elif ext in SUBTITLE_EXTS:
                            subtitle_files.append(entry)
            except PermissionError:
                result.errors.append(f"Permission denied: {path}")
            except Exception as e:
                result.errors.append(f"Error scanning {path}: {e}")

        # Run scan in thread pool to avoid blocking
        await asyncio.to_thread(scan_dir, root)

        result.total_media = len(media_files)

        # Match subtitles to media files
        for media in media_files:
            if progress_callback:
                progress_callback(f"Processing: {media.name}")

            relative = str(media.relative_to(root))
            title = media.stem

            # Find best matching subtitle
            subtitle = self._find_best_subtitle(media, subtitle_files)

            item = ScanItem(
                media_path=str(media),
                subtitle_path=str(subtitle) if subtitle else None,
                relative_path=relative,
                title=title,
            )

            if subtitle:
                # Verify it has English content
                if self._subtitle_has_english(subtitle):
                    result.with_subtitle += 1
                else:
                    item.subtitle_path = None
                    result.without_subtitle += 1
            else:
                result.without_subtitle += 1

            result.items.append(item)

        return result

    async def batch_import(
        self,
        library_id: str,
        items: list[ScanItem],
        *,
        difficulty: str = "medium",
        progress_callback: Optional[Callable[[ImportProgress], None]] = None,
    ) -> ImportResult:
        """
        Batch import scanned items as courses.

        Args:
            library_id: ID of the library
            items: List of scanned items to import
            difficulty: Difficulty setting for segmentation
            progress_callback: Optional callback for progress updates

        Returns:
            ImportResult with statistics
        """
        from course.importer import CourseImporter

        result = ImportResult(total=len(items))
        progress = ImportProgress(total=len(items))
        importer = CourseImporter()

        # Get library for relative path calculation
        library = self.library_repo.get(library_id)
        if not library:
            result.errors.append(f"Library not found: {library_id}")
            return result

        root_path = Path(library.root_path)

        for item in items:
            progress.current_item = item.title

            if progress_callback:
                progress_callback(progress)

            if not item.subtitle_path:
                item.status = "error"
                item.error_message = "No English subtitle found"
                result.failed += 1
                result.errors.append(f"{item.title}: No English subtitle")
                progress.failed += 1
                progress.completed += 1
                continue

            try:
                item.status = "importing"

                # Import using existing importer
                import_result = await importer.import_from_local(
                    item.media_path,
                    subtitle_path=item.subtitle_path,
                    difficulty=difficulty,
                )

                if import_result.get("error"):
                    item.status = "error"
                    item.error_message = import_result.get("message", "Unknown error")
                    result.failed += 1
                    result.errors.append(f"{item.title}: {item.error_message}")
                else:
                    course = import_result.get("course")
                    if course:
                        # Set library metadata
                        course.library_id = library_id
                        try:
                            course.relative_path = str(Path(item.media_path).relative_to(root_path))
                        except ValueError:
                            course.relative_path = item.relative_path

                        # Save course
                        self.course_db.save(course)
                        item.status = "imported"
                        item.course_id = course.id
                        result.imported += 1

                        # Build inverted index for the course
                        await self._build_index_for_course(course)
                    else:
                        item.status = "error"
                        item.error_message = "No course returned"
                        result.failed += 1

            except Exception as e:
                logger.error(f"Failed to import {item.title}: {e}", exc_info=True)
                item.status = "error"
                item.error_message = str(e)
                result.failed += 1
                result.errors.append(f"{item.title}: {e}")

            progress.completed += 1

        # Update library scan result
        self.library_repo.update(
            library_id,
            status="ready",
            scan_result={
                "total": result.total,
                "imported": result.imported,
                "failed": result.failed,
            },
        )

        return result

    async def _build_index_for_course(self, course: Any) -> None:
        """Build inverted index for a course after import."""
        try:
            from lexicon.lexicon_db import LexiconRepo, ensure_lexicon_sqlite
            from storage.occurrence_repo import OccurrenceRepo
            from storage.sqlite import SqliteDatabase

            # Get database path from course_db
            db_path = Path(self.course_db.db_path)
            data_dir = db_path.parent
            plugin_root = Path(__file__).resolve().parents[2]

            # Ensure lexicon is available
            lexicon_path = ensure_lexicon_sqlite(data_dir=data_dir, plugin_root=plugin_root)
            lexicon_repo = LexiconRepo(lexicon_path)

            # Create occurrence repo
            db = SqliteDatabase(str(db_path))
            occurrence_repo = OccurrenceRepo(db)

            # Build index
            with db.transaction() as conn:
                count = occurrence_repo.build_for_course(
                    conn,
                    course_id=course.id,
                    segments=course.segments,
                    lexicon_repo=lexicon_repo,
                )
                logger.info(f"Built index for {course.title}: {count} occurrences")

        except Exception as e:
            logger.error(f"Failed to build index for {course.id}: {e}", exc_info=True)

    def _find_best_subtitle(
        self,
        media_path: Path,
        all_subtitles: list[Path],
    ) -> Optional[Path]:
        """Find the best matching subtitle for a media file."""
        media_stem = media_path.stem.lower()
        media_dir = media_path.parent

        # Filter subtitles in same directory or subdirectories
        candidates = [
            s for s in all_subtitles
            if s.parent == media_dir or media_dir in s.parents
        ]

        if not candidates:
            return None

        # Score each candidate
        scored: list[tuple[float, Path]] = []
        for sub in candidates:
            score = self._score_subtitle_match(media_path, sub)
            if score > 0:
                scored.append((score, sub))

        if not scored:
            return None

        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[0][1]

    def _score_subtitle_match(self, media: Path, subtitle: Path) -> float:
        """Score how well a subtitle matches a media file."""
        score = 0.0

        media_stem = media.stem.lower()
        sub_stem = subtitle.stem.lower()

        # Same directory bonus
        if media.parent == subtitle.parent:
            score += 20.0

        # Exact stem match (before language tag)
        if sub_stem.startswith(media_stem):
            score += 50.0
        elif media_stem in sub_stem or sub_stem in media_stem:
            score += 30.0

        # English language indicator bonus
        sub_lower = sub_stem.lower()
        if any(k in sub_lower for k in ("eng", "english", ".en.", "_en_", "-en-")):
            score += 15.0

        # Penalize Chinese-only subtitles
        if any(k in sub_lower for k in ("chs", "cht", "chinese", "简", "繁")) and "eng" not in sub_lower:
            score -= 20.0

        return score

    def _subtitle_has_english(self, path: Path) -> bool:
        """Check if subtitle file contains English content."""
        import re

        try:
            data = path.read_bytes()[:200_000]
        except Exception:
            return False

        # Try different encodings
        text = ""
        for enc in ("utf-8-sig", "utf-16", "utf-8", "latin-1"):
            try:
                text = data.decode(enc, errors="ignore")
                break
            except Exception:
                continue

        if not text:
            return False

        # Clean and check for English words
        cleaned = []
        for line in text.splitlines():
            s = (line or "").strip()
            if not s:
                continue
            if "-->" in s:  # Timestamp line
                continue
            if s.isdigit():
                continue
            if s.startswith(("WEBVTT", "[Script Info]", "Style:", "Format:", "Dialogue:", "Comment:")):
                continue
            # Remove tags
            s = re.sub(r"<[^>]+>", " ", s)
            s = re.sub(r"\{[^}]+\}", " ", s)
            s = re.sub(r"\[[0-9:.]+\]", " ", s)
            cleaned.append(s)

        sample = " ".join(cleaned)
        english_words = re.findall(r"[A-Za-z]{2,}", sample)

        return len(english_words) >= 5 and sum(len(w) for w in english_words) >= 30


