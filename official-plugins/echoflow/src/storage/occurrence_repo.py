"""
Occurrence Repository - Inverted index for word search in subtitles.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Iterable, Optional

from .schema_v1 import _segment_id, utc_now_iso
from .sqlite import SqliteDatabase

if TYPE_CHECKING:
    from course.models import Segment
    from lexicon.lexicon_db import LexiconRepo


# Stopwords list - common high-frequency words with low learning value
STOPWORDS = frozenset([
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "a", "an", "the", "this", "that", "these", "those",
    "is", "am", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "to", "of", "in", "on", "at", "for", "with", "by", "from", "as",
    "and", "or", "but", "if", "so", "not", "no", "yes",
    "what", "who", "how", "when", "where", "why", "which",
    "my", "your", "his", "her", "its", "our", "their",
    "here", "there", "now", "then", "just", "only", "also",
    "can", "may", "must", "shall", "need", "let", "get", "got",
    "go", "come", "see", "know", "think", "want", "like", "make", "take",
    "say", "said", "tell", "told", "ask", "asked",
])

# Sampling configuration
MAX_OCCURRENCES_PER_TERM_COURSE = 30
STOPWORD_SAMPLE_RATIO = 0.1


@dataclass
class Occurrence:
    """A single occurrence of a word in a segment."""

    id: int
    term: str
    course_id: str
    segment_id: str
    segment_idx: int
    surface: Optional[str]
    token_pos: Optional[int]
    created_at: str


@dataclass
class CourseHit:
    """Aggregated hit count for a course."""

    course_id: str
    title: str
    cover_path: Optional[str]
    hit_count: int


@dataclass
class WordStats:
    """Statistics for a word across the library."""

    term: str
    total_count: int
    segment_count: int
    course_count: int
    is_stopword: bool
    computed_at: str


def is_stopword(term: str, lexicon_repo: Optional["LexiconRepo"] = None) -> bool:
    """Determine if a term is a stopword."""
    if term in STOPWORDS:
        return True
    if lexicon_repo:
        entry = lexicon_repo.lookup(term)
        if entry and entry.frq is not None and entry.frq <= 50:
            return True
    return False


class OccurrenceRepo:
    """Repository for inverted index operations."""

    def __init__(self, db: SqliteDatabase):
        self.db = db

    def build_for_course(
        self,
        conn: sqlite3.Connection,
        *,
        course_id: str,
        segments: Iterable["Segment"],
        lexicon_repo: "LexiconRepo",
    ) -> int:
        """
        Build inverted index for a single course.
        Returns the number of occurrences written.
        """
        now = utc_now_iso()

        # Clear existing occurrences for this course
        conn.execute("DELETE FROM occurrences WHERE course_id = ?", (course_id,))

        # Track counts per term for sampling
        term_counts: dict[str, int] = {}
        batch: list[tuple[str, str, str, int, str, int, str]] = []
        total_written = 0

        for seg in segments:
            segment_id = _segment_id(course_id, int(seg.id))
            tokens = lexicon_repo.tokenize_text(seg.text)

            for pos, term in enumerate(tokens):
                is_stop = is_stopword(term, lexicon_repo)
                count = term_counts.get(term, 0)

                if self._should_write_occurrence(term, count, is_stop):
                    batch.append((term, course_id, segment_id, int(seg.id), term, pos, now))
                    term_counts[term] = count + 1
                    total_written += 1

                if len(batch) >= 2000:
                    conn.executemany(
                        """INSERT INTO occurrences(term, course_id, segment_id, segment_idx, surface, token_pos, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        batch,
                    )
                    batch.clear()

        if batch:
            conn.executemany(
                """INSERT INTO occurrences(term, course_id, segment_id, segment_idx, surface, token_pos, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                batch,
            )

        # Invalidate word_stats cache for affected terms
        terms = list(term_counts.keys())
        if terms:
            self._invalidate_word_stats(conn, terms)

        return total_written

    def delete_for_course(self, conn: sqlite3.Connection, course_id: str) -> None:
        """Delete all occurrences for a course."""
        # Get affected terms before deletion
        rows = conn.execute(
            "SELECT DISTINCT term FROM occurrences WHERE course_id = ?",
            (course_id,),
        ).fetchall()
        terms = [r["term"] for r in rows]

        conn.execute("DELETE FROM occurrences WHERE course_id = ?", (course_id,))

        if terms:
            self._invalidate_word_stats(conn, terms)

    def search_term(
        self,
        *,
        terms: list[str],
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Search for occurrences of terms (with pagination)."""
        if not terms:
            return []

        placeholders = ",".join("?" * len(terms))
        with self.db.connect() as conn:
            rows = conn.execute(
                f"""
                SELECT o.*, s.text, s.start_time, s.end_time, c.title as course_title, c.cover_path
                FROM occurrences o
                JOIN segments s ON s.id = o.segment_id
                JOIN courses c ON c.id = o.course_id
                WHERE o.term IN ({placeholders})
                ORDER BY o.course_id, o.segment_idx
                LIMIT ? OFFSET ?
                """,
                (*terms, limit, offset),
            ).fetchall()
        return [dict(r) for r in rows]

    def aggregate_by_course(self, *, terms: list[str]) -> list[CourseHit]:
        """Aggregate hit counts by course."""
        if not terms:
            return []

        placeholders = ",".join("?" * len(terms))
        with self.db.connect() as conn:
            rows = conn.execute(
                f"""
                SELECT o.course_id, c.title, c.cover_path, COUNT(*) as hit_count
                FROM occurrences o
                JOIN courses c ON c.id = o.course_id
                WHERE o.term IN ({placeholders})
                GROUP BY o.course_id
                ORDER BY hit_count DESC
                """,
                terms,
            ).fetchall()
        return [
            CourseHit(
                course_id=r["course_id"],
                title=r["title"],
                cover_path=r["cover_path"],
                hit_count=r["hit_count"],
            )
            for r in rows
        ]

    def get_occurrences_for_course(
        self,
        *,
        terms: list[str],
        course_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Get occurrences for specific terms within a course."""
        if not terms:
            return []

        placeholders = ",".join("?" * len(terms))
        with self.db.connect() as conn:
            rows = conn.execute(
                f"""
                SELECT o.*, s.text, s.start_time, s.end_time
                FROM occurrences o
                JOIN segments s ON s.id = o.segment_id
                WHERE o.term IN ({placeholders}) AND o.course_id = ?
                ORDER BY o.segment_idx
                LIMIT ? OFFSET ?
                """,
                (*terms, course_id, limit, offset),
            ).fetchall()
        return [dict(r) for r in rows]

    def count_occurrences(self, *, terms: list[str]) -> int:
        """Count total occurrences for terms."""
        if not terms:
            return 0

        placeholders = ",".join("?" * len(terms))
        with self.db.connect() as conn:
            row = conn.execute(
                f"SELECT COUNT(*) as cnt FROM occurrences WHERE term IN ({placeholders})",
                terms,
            ).fetchone()
        return int(row["cnt"]) if row else 0

    def get_word_stats(self, term: str, lexicon_repo: Optional["LexiconRepo"] = None) -> Optional[WordStats]:
        """Get or compute word statistics."""
        with self.db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM word_stats WHERE term = ?",
                (term,),
            ).fetchone()

        if row:
            return WordStats(
                term=row["term"],
                total_count=row["total_count"],
                segment_count=row["segment_count"],
                course_count=row["course_count"],
                is_stopword=bool(row["is_stopword"]),
                computed_at=row["computed_at"],
            )

        # Compute if not cached
        return self._compute_and_cache_word_stats(term, lexicon_repo)

    def _compute_and_cache_word_stats(
        self,
        term: str,
        lexicon_repo: Optional["LexiconRepo"] = None,
    ) -> Optional[WordStats]:
        """Compute word statistics and cache them."""
        now = utc_now_iso()
        is_stop = is_stopword(term, lexicon_repo)

        with self.db.transaction() as conn:
            # Count total occurrences
            row = conn.execute(
                "SELECT COUNT(*) as cnt FROM occurrences WHERE term = ?",
                (term,),
            ).fetchone()
            total_count = int(row["cnt"]) if row else 0

            if total_count == 0:
                return None

            # Count distinct segments
            row = conn.execute(
                "SELECT COUNT(DISTINCT segment_id) as cnt FROM occurrences WHERE term = ?",
                (term,),
            ).fetchone()
            segment_count = int(row["cnt"]) if row else 0

            # Count distinct courses
            row = conn.execute(
                "SELECT COUNT(DISTINCT course_id) as cnt FROM occurrences WHERE term = ?",
                (term,),
            ).fetchone()
            course_count = int(row["cnt"]) if row else 0

            # Cache the result
            conn.execute(
                """
                INSERT OR REPLACE INTO word_stats(term, total_count, segment_count, course_count, is_stopword, computed_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (term, total_count, segment_count, course_count, int(is_stop), now),
            )

        return WordStats(
            term=term,
            total_count=total_count,
            segment_count=segment_count,
            course_count=course_count,
            is_stopword=is_stop,
            computed_at=now,
        )

    def _should_write_occurrence(self, term: str, current_count: int, is_stop: bool) -> bool:
        """Determine if this occurrence should be written (sampling control)."""
        if is_stop:
            max_count = max(5, int(MAX_OCCURRENCES_PER_TERM_COURSE * STOPWORD_SAMPLE_RATIO))
        else:
            max_count = MAX_OCCURRENCES_PER_TERM_COURSE
        return current_count < max_count

    def _invalidate_word_stats(self, conn: sqlite3.Connection, terms: list[str]) -> None:
        """Invalidate word_stats cache for given terms."""
        if not terms:
            return
        placeholders = ",".join("?" * len(terms))
        conn.execute(f"DELETE FROM word_stats WHERE term IN ({placeholders})", terms)


