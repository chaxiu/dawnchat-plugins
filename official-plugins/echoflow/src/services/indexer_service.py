"""
Indexer Service - Build and manage inverted index for word search.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING, Callable, Optional

if TYPE_CHECKING:
    from course.models import Course, Segment
    from lexicon.lexicon_db import LexiconRepo
    from storage.course_db import CourseDatabase
    from storage.occurrence_repo import OccurrenceRepo
    from storage.sqlite import SqliteDatabase

logger = logging.getLogger("echoflow.indexer_service")


class IndexerService:
    """Service for building and managing inverted index."""

    def __init__(
        self,
        db: "SqliteDatabase",
        occurrence_repo: "OccurrenceRepo",
        lexicon_repo: "LexiconRepo",
    ):
        self.db = db
        self.occurrence_repo = occurrence_repo
        self.lexicon_repo = lexicon_repo

    def build_for_course(
        self,
        course_id: str,
        segments: list["Segment"],
    ) -> int:
        """
        Build inverted index for a single course.

        Args:
            course_id: Course ID
            segments: List of segments to index

        Returns:
            Number of occurrences written
        """
        with self.db.transaction() as conn:
            count = self.occurrence_repo.build_for_course(
                conn,
                course_id=course_id,
                segments=segments,
                lexicon_repo=self.lexicon_repo,
            )
        logger.info(f"Built index for course {course_id}: {count} occurrences")
        return count

    def delete_for_course(self, course_id: str) -> None:
        """
        Delete inverted index for a course.

        Args:
            course_id: Course ID
        """
        with self.db.transaction() as conn:
            self.occurrence_repo.delete_for_course(conn, course_id)
        logger.info(f"Deleted index for course {course_id}")

    def rebuild_for_library(
        self,
        library_id: str,
        course_db: "CourseDatabase",
        *,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
    ) -> int:
        """
        Rebuild inverted index for all courses in a library.

        Args:
            library_id: Library ID
            course_db: Course database for fetching courses
            progress_callback: Optional callback(current, total, course_title)

        Returns:
            Total number of occurrences written
        """
        from storage.library_repo import LibraryRepo

        # Get courses for this library
        lib_repo = LibraryRepo(self.db)
        courses = lib_repo.list_courses(library_id)

        total_count = 0
        total_courses = len(courses)

        for i, course_row in enumerate(courses):
            course_id = course_row.get("id")
            title = course_row.get("title", "Unknown")

            if progress_callback:
                progress_callback(i + 1, total_courses, title)

            # Get full course with segments
            course = course_db.get(course_id)
            if course and course.segments:
                count = self.build_for_course(course_id, course.segments)
                total_count += count

        logger.info(f"Rebuilt index for library {library_id}: {total_count} total occurrences")
        return total_count

    def rebuild_all(
        self,
        course_db: "CourseDatabase",
        *,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
    ) -> int:
        """
        Rebuild inverted index for all courses in the database.

        Args:
            course_db: Course database
            progress_callback: Optional callback(current, total, course_title)

        Returns:
            Total number of occurrences written
        """
        courses = course_db.list_all()
        total_count = 0
        total_courses = len(courses)

        for i, course in enumerate(courses):
            if progress_callback:
                progress_callback(i + 1, total_courses, course.title)

            if course.segments:
                count = self.build_for_course(course.id, course.segments)
                total_count += count

        logger.info(f"Rebuilt all indices: {total_count} total occurrences for {total_courses} courses")
        return total_count

    def get_index_stats(self) -> dict:
        """
        Get statistics about the inverted index.

        Returns:
            Dictionary with index statistics
        """
        with self.db.connect() as conn:
            # Total occurrences
            row = conn.execute("SELECT COUNT(*) as cnt FROM occurrences").fetchone()
            total_occurrences = int(row["cnt"]) if row else 0

            # Unique terms
            row = conn.execute("SELECT COUNT(DISTINCT term) as cnt FROM occurrences").fetchone()
            unique_terms = int(row["cnt"]) if row else 0

            # Indexed courses
            row = conn.execute("SELECT COUNT(DISTINCT course_id) as cnt FROM occurrences").fetchone()
            indexed_courses = int(row["cnt"]) if row else 0

            # Cached word stats
            row = conn.execute("SELECT COUNT(*) as cnt FROM word_stats").fetchone()
            cached_stats = int(row["cnt"]) if row else 0

        return {
            "total_occurrences": total_occurrences,
            "unique_terms": unique_terms,
            "indexed_courses": indexed_courses,
            "cached_word_stats": cached_stats,
        }


def create_indexer_service(
    db_path: Path,
    plugin_root: Path,
) -> IndexerService:
    """
    Factory function to create an IndexerService.

    Args:
        db_path: Path to the SQLite database
        plugin_root: Path to the plugin root directory

    Returns:
        Configured IndexerService
    """
    from lexicon.lexicon_db import LexiconRepo, ensure_lexicon_sqlite
    from storage.occurrence_repo import OccurrenceRepo
    from storage.sqlite import SqliteDatabase

    db = SqliteDatabase(str(db_path))
    data_dir = db_path.parent

    lexicon_path = ensure_lexicon_sqlite(data_dir=data_dir, plugin_root=plugin_root)
    lexicon_repo = LexiconRepo(lexicon_path)
    occurrence_repo = OccurrenceRepo(db)

    return IndexerService(db, occurrence_repo, lexicon_repo)


