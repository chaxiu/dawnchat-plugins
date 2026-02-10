"""
Word Search Service - Search words across the subtitle library.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:
    from lexicon.lexicon_db import LexiconRepo
    from storage.occurrence_repo import CourseHit, OccurrenceRepo, WordStats

logger = logging.getLogger("echoflow.word_search_service")


@dataclass
class SegmentMatch:
    """A segment that matches the search term."""

    course_id: str
    course_title: str
    cover_path: Optional[str]
    segment_idx: int
    text: str
    start_time: float
    end_time: float
    term: str
    token_pos: Optional[int]


@dataclass
class WordSearchResult:
    """Result of searching for a word."""

    term: str
    normalized_term: str
    stats: Optional["WordStats"]
    courses: list["CourseHit"]
    matches: list[SegmentMatch]
    total_matches: int
    is_stopword: bool

    @classmethod
    def empty(cls, term: str = "") -> "WordSearchResult":
        return cls(
            term=term,
            normalized_term="",
            stats=None,
            courses=[],
            matches=[],
            total_matches=0,
            is_stopword=False,
        )


@dataclass
class SegmentRecommendation:
    """A recommended segment for learning a word."""

    course_id: str
    course_title: str
    cover_path: Optional[str]
    segment_idx: int
    text: str
    start_time: float
    end_time: float
    difficulty: Optional[float]
    token_count: Optional[int]
    score: float  # Recommendation score


class WordSearchService:
    """Service for searching words across the subtitle library."""

    def __init__(
        self,
        occurrence_repo: "OccurrenceRepo",
        lexicon_repo: "LexiconRepo",
    ):
        self.occurrence_repo = occurrence_repo
        self.lexicon_repo = lexicon_repo

    def search_word(
        self,
        word: str,
        *,
        expand_morphs: bool = True,
        limit: int = 100,
        offset: int = 0,
    ) -> WordSearchResult:
        """
        Search for a word across the entire subtitle library.

        Args:
            word: Word to search for
            expand_morphs: Whether to expand word forms (plurals, tenses, etc.)
            limit: Maximum number of matches to return
            offset: Offset for pagination

        Returns:
            WordSearchResult with matches and statistics
        """
        from lexicon.lexicon_db import _morph_candidates, _normalize_word

        normalized = _normalize_word(word)
        if not normalized:
            return WordSearchResult.empty(word)

        # Build list of terms to search
        terms = [normalized]
        if expand_morphs:
            terms.extend(_morph_candidates(normalized))
            # Also check exchange field in lexicon
            entry = self.lexicon_repo.lookup_with_exchange(normalized)
            if entry and entry.word != normalized:
                terms.append(entry.word)
        terms = list(set(terms))

        # Get statistics
        stats = self.occurrence_repo.get_word_stats(normalized, self.lexicon_repo)

        # Check if stopword
        from storage.occurrence_repo import is_stopword
        is_stop = is_stopword(normalized, self.lexicon_repo)

        # Get course aggregates
        courses = self.occurrence_repo.aggregate_by_course(terms=terms)

        # Get matches
        raw_matches = self.occurrence_repo.search_term(
            terms=terms,
            limit=limit,
            offset=offset,
        )

        matches = [
            SegmentMatch(
                course_id=m["course_id"],
                course_title=m.get("course_title", ""),
                cover_path=m.get("cover_path"),
                segment_idx=m["segment_idx"],
                text=m.get("text", ""),
                start_time=float(m.get("start_time", 0)),
                end_time=float(m.get("end_time", 0)),
                term=m["term"],
                token_pos=m.get("token_pos"),
            )
            for m in raw_matches
        ]

        total = self.occurrence_repo.count_occurrences(terms=terms)

        return WordSearchResult(
            term=word,
            normalized_term=normalized,
            stats=stats,
            courses=courses,
            matches=matches,
            total_matches=total,
            is_stopword=is_stop,
        )

    def get_matches_for_course(
        self,
        word: str,
        course_id: str,
        *,
        expand_morphs: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> list[SegmentMatch]:
        """
        Get matches for a word within a specific course.

        Args:
            word: Word to search for
            course_id: Course ID to filter by
            expand_morphs: Whether to expand word forms
            limit: Maximum number of matches
            offset: Offset for pagination

        Returns:
            List of segment matches
        """
        from lexicon.lexicon_db import _morph_candidates, _normalize_word

        normalized = _normalize_word(word)
        if not normalized:
            return []

        terms = [normalized]
        if expand_morphs:
            terms.extend(_morph_candidates(normalized))
        terms = list(set(terms))

        raw_matches = self.occurrence_repo.get_occurrences_for_course(
            terms=terms,
            course_id=course_id,
            limit=limit,
            offset=offset,
        )

        return [
            SegmentMatch(
                course_id=m["course_id"],
                course_title="",  # Not included in this query
                cover_path=None,
                segment_idx=m["segment_idx"],
                text=m.get("text", ""),
                start_time=float(m.get("start_time", 0)),
                end_time=float(m.get("end_time", 0)),
                term=m["term"],
                token_pos=m.get("token_pos"),
            )
            for m in raw_matches
        ]

    def recommend_segments(
        self,
        word: str,
        *,
        profile: str = "child",  # child / adult
        max_segments: int = 5,
        expand_morphs: bool = True,
    ) -> list[SegmentRecommendation]:
        """
        Recommend segments for learning a word.

        Args:
            word: Word to find segments for
            profile: User profile (child/adult) affects scoring
            max_segments: Maximum number of recommendations
            expand_morphs: Whether to expand word forms

        Returns:
            List of recommended segments
        """
        from lexicon.lexicon_db import _morph_candidates, _normalize_word

        normalized = _normalize_word(word)
        if not normalized:
            return []

        terms = [normalized]
        if expand_morphs:
            terms.extend(_morph_candidates(normalized))
        terms = list(set(terms))

        # Get more candidates than needed for filtering
        candidate_limit = max_segments * 5

        # Fetch candidates with segment metadata
        raw_matches = self._get_matches_with_metadata(terms, candidate_limit)

        # Score and filter candidates
        scored: list[tuple[float, dict]] = []
        seen_courses: dict[str, int] = {}

        for m in raw_matches:
            course_id = m["course_id"]

            # Limit segments per course to ensure variety
            course_count = seen_courses.get(course_id, 0)
            if course_count >= 2:
                continue

            score = self._score_segment(m, profile)
            if score > 0:
                scored.append((score, m))
                seen_courses[course_id] = course_count + 1

        # Sort by score descending
        scored.sort(key=lambda x: x[0], reverse=True)

        # Build recommendations
        recommendations = []
        for score, m in scored[:max_segments]:
            recommendations.append(
                SegmentRecommendation(
                    course_id=m["course_id"],
                    course_title=m.get("course_title", ""),
                    cover_path=m.get("cover_path"),
                    segment_idx=m["segment_idx"],
                    text=m.get("text", ""),
                    start_time=float(m.get("start_time", 0)),
                    end_time=float(m.get("end_time", 0)),
                    difficulty=m.get("difficulty"),
                    token_count=m.get("token_count"),
                    score=score,
                )
            )

        return recommendations

    def _get_matches_with_metadata(
        self,
        terms: list[str],
        limit: int,
    ) -> list[dict]:
        """Get matches with segment metadata (difficulty, token_count)."""
        if not terms:
            return []

        placeholders = ",".join("?" * len(terms))
        with self.occurrence_repo.db.connect() as conn:
            rows = conn.execute(
                f"""
                SELECT o.*, s.text, s.start_time, s.end_time, s.difficulty, s.token_count,
                       c.title as course_title, c.cover_path, c.tags_json
                FROM occurrences o
                JOIN segments s ON s.id = o.segment_id
                JOIN courses c ON c.id = o.course_id
                WHERE o.term IN ({placeholders})
                ORDER BY RANDOM()
                LIMIT ?
                """,
                (*terms, limit),
            ).fetchall()
        return [dict(r) for r in rows]

    def _score_segment(self, match: dict, profile: str) -> float:
        """
        Score a segment for recommendation.

        Higher score = better recommendation.
        """
        score = 50.0  # Base score

        difficulty = match.get("difficulty")
        token_count = match.get("token_count")
        tags_json = match.get("tags_json", "") or ""

        # Difficulty scoring (profile-dependent)
        if difficulty is not None:
            if profile == "child":
                # Prefer easier segments for children
                if difficulty <= 0.3:
                    score += 20.0
                elif difficulty <= 0.5:
                    score += 10.0
                elif difficulty > 0.7:
                    score -= 15.0
            else:
                # Adults can handle more difficulty
                if 0.3 <= difficulty <= 0.6:
                    score += 15.0
                elif difficulty > 0.8:
                    score -= 5.0

        # Token count scoring
        if token_count is not None:
            if profile == "child":
                # Prefer shorter segments for children
                if token_count <= 8:
                    score += 15.0
                elif token_count <= 12:
                    score += 8.0
                elif token_count > 20:
                    score -= 10.0
            else:
                # Adults prefer moderate length
                if 8 <= token_count <= 18:
                    score += 10.0
                elif token_count > 25:
                    score -= 5.0

        # Tag-based scoring
        if profile == "child":
            if any(k in tags_json.lower() for k in ("child", "kids", "cartoon", "animation")):
                score += 25.0
            if any(k in tags_json.lower() for k in ("adult", "mature")):
                score -= 30.0
        else:
            if any(k in tags_json.lower() for k in ("child", "kids")):
                score -= 10.0

        return max(0.0, score)

    def get_word_info(self, word: str) -> dict[str, Any]:
        """
        Get detailed information about a word from the lexicon.

        Args:
            word: Word to look up

        Returns:
            Dictionary with word information
        """
        from lexicon.lexicon_db import _normalize_word

        normalized = _normalize_word(word)
        if not normalized:
            return {"found": False, "word": word}

        entry = self.lexicon_repo.lookup_with_exchange(normalized)
        if not entry:
            return {"found": False, "word": word, "normalized": normalized}

        return {
            "found": True,
            "word": entry.word,
            "normalized": normalized,
            "translation": entry.tran,
            "type": entry.type,
            "frequency": entry.frq,
            "exchange": entry.exchange,
        }


