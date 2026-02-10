from __future__ import annotations

import json
import math
import sqlite3
import uuid
from enum import Enum
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any, Iterable, Optional

from course.models import Course, Segment, SegmentStatus

from .schema_v1 import (
    _coach_narration_node_id,
    _coach_plan_id,
    _coach_practice_node_id,
    _node_state,
    _practice_node_id,
    _practice_plan_id,
    _segment_id,
    utc_now_iso,
)
from .sqlite import SqliteDatabase

if TYPE_CHECKING:
    from lexicon.lexicon_db import LexiconRepo


@dataclass(frozen=True)
class PracticePlanRef:
    plan_id: str


class CourseRepo:
    def __init__(self, db: SqliteDatabase):
        self.db = db

    def upsert_course(self, conn: sqlite3.Connection, course: Course) -> None:
        source_platform = self._source_platform(course.source_url)
        library_id = getattr(course, "library_id", None)
        relative_path = getattr(course, "relative_path", None)
        tags_json = getattr(course, "tags_json", None)
        conn.execute(
            """
            INSERT INTO courses(
              id, title, source_url, source_platform, lang,
              audio_path, video_path, subtitle_path, cover_path, duration_s,
              pass_threshold, library_id, relative_path, tags_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title=excluded.title,
              source_url=excluded.source_url,
              source_platform=excluded.source_platform,
              audio_path=excluded.audio_path,
              video_path=excluded.video_path,
              subtitle_path=excluded.subtitle_path,
              cover_path=excluded.cover_path,
              pass_threshold=excluded.pass_threshold,
              library_id=excluded.library_id,
              relative_path=excluded.relative_path,
              tags_json=excluded.tags_json,
              updated_at=excluded.updated_at
            """,
            (
                course.id,
                course.title,
                course.source_url,
                source_platform,
                "en",
                course.audio_path,
                course.video_path,
                course.subtitle_path,
                course.cover_path,
                None,
                int(course.pass_threshold or 80),
                library_id,
                relative_path,
                tags_json,
                course.created_at,
                course.updated_at,
            ),
        )

    def get_course(self, course_id: str) -> Optional[dict[str, Any]]:
        with self.db.connect() as conn:
            row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
        return dict(row) if row else None

    def list_courses(self) -> list[dict[str, Any]]:
        with self.db.connect() as conn:
            rows = conn.execute("SELECT * FROM courses ORDER BY updated_at DESC").fetchall()
        return [dict(r) for r in rows]

    def list_courses_by_library(self, library_id: str) -> list[dict[str, Any]]:
        with self.db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM courses WHERE library_id = ? ORDER BY updated_at DESC",
                (library_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def list_courses_by_platform(self, platform: str) -> list[dict[str, Any]]:
        """List courses by source platform (youtube, bilibili, other)."""
        with self.db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM courses WHERE source_platform = ? ORDER BY updated_at DESC",
                (platform,),
            ).fetchall()
        return [dict(r) for r in rows]

    def delete_course(self, course_id: str) -> None:
        with self.db.transaction() as conn:
            conn.execute("DELETE FROM courses WHERE id = ?", (course_id,))

    def _source_platform(self, url: Optional[str]) -> Optional[str]:
        if not url:
            return None
        from urllib.parse import urlparse

        try:
            host = (urlparse(url).hostname or "").lower()
        except Exception:
            return "other"
        if "youtube.com" in host or "youtu.be" in host:
            return "youtube"
        if "bilibili.com" in host:
            return "bilibili"
        return "other"


class SegmentRepo:
    def __init__(self, db: SqliteDatabase):
        self.db = db

    def upsert_course_segments(
        self,
        conn: sqlite3.Connection,
        *,
        course_id: str,
        segments: Iterable[Segment],
        now: str,
        lexicon_repo: Optional["LexiconRepo"] = None,
    ) -> int:
        max_idx = -1
        for seg in segments:
            idx = int(seg.id)
            max_idx = max(max_idx, idx)

            norm_text = None
            token_count = None
            difficulty = None
            if lexicon_repo is not None:
                norm_text = lexicon_repo.normalize_text(seg.text)
                analysis = lexicon_repo.analyze_text(seg.text)
                token_count = int(analysis.token_count)
                rarity = float(analysis.rarity_score or 0.0)
                rarity_norm = (
                    min(1.0, max(0.0, math.log10(rarity + 1.0) / 5.0)) if rarity > 0.0 else 0.0
                )
                difficulty = float(
                    max(0.0, min(1.0, (0.7 * float(analysis.unknown_ratio)) + (0.3 * rarity_norm)))
                )

            conn.execute(
                """
                INSERT INTO segments(
                  id, course_id, idx, start_time, end_time, text,
                  norm_text, token_count, difficulty, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  start_time=excluded.start_time,
                  end_time=excluded.end_time,
                  text=excluded.text,
                  norm_text=excluded.norm_text,
                  token_count=excluded.token_count,
                  difficulty=excluded.difficulty,
                  updated_at=excluded.updated_at
                """,
                (
                    _segment_id(course_id, idx),
                    course_id,
                    idx,
                    float(seg.start_time),
                    float(seg.end_time),
                    seg.text,
                    norm_text,
                    token_count,
                    difficulty,
                    now,
                    now,
                ),
            )
        if max_idx >= 0:
            conn.execute("DELETE FROM segments WHERE course_id = ? AND idx > ?", (course_id, max_idx))
        return max_idx + 1

    def upsert_segment_stats(self, conn: sqlite3.Connection, *, course_id: str, segments: Iterable[Segment], now: str) -> None:
        for seg in segments:
            idx = int(seg.id)
            seg_id = _segment_id(course_id, idx)
            status = _status_value(seg.status)
            conn.execute(
                """
                INSERT INTO segment_stats(segment_id, best_overall, attempts_count, last_attempt_at, status, updated_at)
                VALUES (?, ?, ?, COALESCE((SELECT last_attempt_at FROM segment_stats WHERE segment_id = ?), NULL), ?, ?)
                ON CONFLICT(segment_id) DO UPDATE SET
                  best_overall=excluded.best_overall,
                  attempts_count=excluded.attempts_count,
                  status=excluded.status,
                  updated_at=excluded.updated_at
                """,
                (seg_id, int(seg.user_best_score or 0), int(seg.attempts or 0), seg_id, status, now),
            )

    def list_segments_with_stats(self, course_id: str) -> list[dict[str, Any]]:
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT s.*, st.best_overall, st.attempts_count, st.status
                FROM segments s
                LEFT JOIN segment_stats st ON st.segment_id = s.id
                WHERE s.course_id = ?
                ORDER BY s.idx ASC
                """,
                (course_id,),
            ).fetchall()
        return [dict(r) for r in rows]


class ProfileRepo:
    def __init__(self, db: SqliteDatabase):
        self.db = db

    def ensure_defaults(self, conn: sqlite3.Connection, *, now: str) -> None:
        row = conn.execute("SELECT COUNT(1) AS n FROM profiles").fetchone()
        if row and int(row["n"] or 0) > 0:
            return
        conn.execute(
            """
            INSERT INTO profiles(
              id, name, audience, target_level, vocab_size_estimate, prefs_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("default", "默认", "adult", "general", None, "{}", now, now),
        )

    def list_all(self) -> list[dict[str, Any]]:
        with self.db.connect() as conn:
            rows = conn.execute("SELECT * FROM profiles ORDER BY updated_at DESC").fetchall()
        return [dict(r) for r in rows]

    def get(self, profile_id: str) -> Optional[dict[str, Any]]:
        with self.db.connect() as conn:
            row = conn.execute("SELECT * FROM profiles WHERE id = ?", (str(profile_id),)).fetchone()
        return dict(row) if row else None

    def get_prefs(self, profile_id: str) -> dict[str, Any]:
        with self.db.connect() as conn:
            row = conn.execute("SELECT prefs_json FROM profiles WHERE id = ?", (str(profile_id),)).fetchone()
        if not row:
            return {}
        try:
            raw = row["prefs_json"] or "{}"
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    def patch_prefs(self, *, profile_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        now = utc_now_iso()
        with self.db.transaction() as conn:
            row = conn.execute("SELECT prefs_json FROM profiles WHERE id = ?", (str(profile_id),)).fetchone()
            current: dict[str, Any] = {}
            if row:
                try:
                    parsed = json.loads(row["prefs_json"] or "{}")
                    if isinstance(parsed, dict):
                        current = parsed
                except Exception:
                    current = {}

            merged = dict(current)
            merged.update({k: v for k, v in (patch or {}).items()})
            prefs_json = json.dumps(merged, ensure_ascii=False)

            conn.execute(
                """
                INSERT INTO profiles(
                  id, name, audience, target_level, vocab_size_estimate, prefs_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  prefs_json=excluded.prefs_json,
                  updated_at=excluded.updated_at
                """,
                (
                    str(profile_id),
                    "默认" if str(profile_id) == "default" else str(profile_id),
                    "adult",
                    "general",
                    None,
                    prefs_json,
                    now,
                    now,
                ),
            )
        return merged


class StrategyPresetRepo:
    def __init__(self, db: SqliteDatabase):
        self.db = db

    def ensure_defaults(self, conn: sqlite3.Connection, *, now: str) -> None:
        row = conn.execute("SELECT COUNT(1) AS n FROM strategy_presets").fetchone()
        if row and int(row["n"] or 0) > 0:
            return

        presets: list[tuple[str, str, int, str]] = [
            (
                "preset:intensive_v1",
                "跟读强化",
                1,
                json.dumps(
                    {
                        "narration_lang": "zh",
                        "practice": {"mode": "all", "every_n": 1, "difficulty_max": 1.0, "max_token_count": 120},
                        "narrations": {"plot": False, "translation": False, "vocab": False, "grammar": False},
                    },
                    ensure_ascii=False,
                ),
            ),
            (
                "preset:balanced_v1",
                "教练均衡",
                1,
                json.dumps(
                    {
                        "narration_lang": "zh",
                        "practice": {"mode": "difficulty", "every_n": 3, "difficulty_max": 0.65, "max_token_count": 24},
                        "narrations": {"plot": True, "translation": True, "vocab": True, "grammar": False},
                        "plot_every_n_practice": 5,
                        "translation_every_n_practice": 2,
                        "vocab_min_difficulty": 0.5,
                    },
                    ensure_ascii=False,
                ),
            ),
            (
                "preset:exam_v1",
                "考试向",
                1,
                json.dumps(
                    {
                        "narration_lang": "zh",
                        "practice": {"mode": "sample", "every_n": 2, "difficulty_max": 1.0, "max_token_count": 120},
                        "narrations": {"plot": False, "translation": False, "vocab": True, "grammar": True},
                        "vocab_min_difficulty": 0.4,
                        "grammar_min_token_count": 10,
                    },
                    ensure_ascii=False,
                ),
            ),
        ]
        for preset_id, name, version, config_json in presets:
            conn.execute(
                """
                INSERT INTO strategy_presets(
                  id, name, version, config_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (preset_id, name, int(version), str(config_json), now, now),
            )

    def list_all(self) -> list[dict[str, Any]]:
        with self.db.connect() as conn:
            rows = conn.execute("SELECT * FROM strategy_presets ORDER BY updated_at DESC").fetchall()
        return [dict(r) for r in rows]

    def get(self, preset_id: str) -> Optional[dict[str, Any]]:
        with self.db.connect() as conn:
            row = conn.execute("SELECT * FROM strategy_presets WHERE id = ?", (str(preset_id),)).fetchone()
        return dict(row) if row else None

    def upsert(self, *, preset_id: str, name: str, version: int, config_json: str) -> None:
        now = utc_now_iso()
        with self.db.transaction() as conn:
            conn.execute(
                """
                INSERT INTO strategy_presets(
                  id, name, version, config_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  name=excluded.name,
                  version=excluded.version,
                  config_json=excluded.config_json,
                  updated_at=excluded.updated_at
                """,
                (str(preset_id), str(name), int(version), str(config_json), now, now),
            )


class PlanRepo:
    def __init__(self, db: SqliteDatabase):
        self.db = db

    def upsert_coach_plan(
        self,
        conn: sqlite3.Connection,
        *,
        course: Course,
        now: str,
        profile_id: Optional[str],
        strategy_id: Optional[str],
        name: str = "Coach",
        lang: str = "zh",
        current_node_index: int = 0,
    ) -> str:
        plan_id = _coach_plan_id(course.id)
        conn.execute(
            """
            INSERT INTO learning_plans(
              id, course_id, profile_id, strategy_id, name, lang, status,
              current_node_index, pass_threshold, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              profile_id=excluded.profile_id,
              strategy_id=excluded.strategy_id,
              name=excluded.name,
              pass_threshold=excluded.pass_threshold,
              updated_at=excluded.updated_at
            """,
            (
                plan_id,
                course.id,
                str(profile_id) if profile_id else None,
                str(strategy_id) if strategy_id else None,
                str(name),
                str(lang),
                int(current_node_index),
                int(course.pass_threshold or 80),
                course.created_at,
                now,
            ),
        )

        return plan_id

    def plan_node_count(self, *, conn: sqlite3.Connection, plan_id: str) -> int:
        row = conn.execute("SELECT COUNT(1) AS n FROM plan_nodes WHERE plan_id = ?", (str(plan_id),)).fetchone()
        try:
            return int(row["n"] if row else 0)
        except Exception:
            return 0

    def replace_plan_nodes(self, conn: sqlite3.Connection, *, plan_id: str, nodes: list[dict[str, Any]], now: str) -> None:
        conn.execute("DELETE FROM plan_nodes WHERE plan_id = ?", (str(plan_id),))
        for n in nodes:
            conn.execute(
                """
                INSERT INTO plan_nodes(
                  id, plan_id, idx, node_type, segment_id,
                  range_start_idx, range_end_idx, narration_kind, reason, state,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(n.get("id") or ""),
                    str(plan_id),
                    int(n.get("idx") or 0),
                    str(n.get("node_type") or ""),
                    n.get("segment_id"),
                    n.get("range_start_idx"),
                    n.get("range_end_idx"),
                    n.get("narration_kind"),
                    n.get("reason"),
                    str(n.get("state") or "pending"),
                    now,
                    now,
                ),
            )

    def ensure_practice_plan(
        self,
        conn: sqlite3.Connection,
        *,
        course: Course,
        now: str,
        update_cursor: bool = True,
    ) -> PracticePlanRef:
        plan_id = _practice_plan_id(course.id)
        upsert_sql = (
            """
            INSERT INTO learning_plans(
              id, course_id, profile_id, strategy_id, name, lang, status,
              current_node_index, pass_threshold, created_at, updated_at
            ) VALUES (?, ?, NULL, NULL, ?, ?, 'active', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              current_node_index=excluded.current_node_index,
              pass_threshold=excluded.pass_threshold,
              updated_at=excluded.updated_at
            """
            if update_cursor
            else """
            INSERT INTO learning_plans(
              id, course_id, profile_id, strategy_id, name, lang, status,
              current_node_index, pass_threshold, created_at, updated_at
            ) VALUES (?, ?, NULL, NULL, ?, ?, 'active', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              pass_threshold=excluded.pass_threshold,
              updated_at=excluded.updated_at
            """
        )
        conn.execute(
            upsert_sql,
            (
                plan_id,
                course.id,
                "Practice",
                "zh",
                int(course.current_segment_index or 0),
                int(course.pass_threshold or 80),
                course.created_at,
                now,
            ),
        )

        max_idx = -1
        for seg in course.segments:
            idx = int(seg.id)
            max_idx = max(max_idx, idx)
            node_id = _practice_node_id(plan_id, idx)
            state = _node_state(_status_value(seg.status))
            conn.execute(
                """
                INSERT INTO plan_nodes(
                  id, plan_id, idx, node_type, segment_id,
                  range_start_idx, range_end_idx, narration_kind, state,
                  created_at, updated_at
                ) VALUES (?, ?, ?, 'practice', ?, NULL, NULL, NULL, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  idx=excluded.idx,
                  segment_id=excluded.segment_id,
                  state=excluded.state,
                  updated_at=excluded.updated_at
                """,
                (node_id, plan_id, idx, _segment_id(course.id, idx), state, now, now),
            )
        if max_idx >= 0:
            conn.execute("DELETE FROM plan_nodes WHERE plan_id = ? AND idx > ?", (plan_id, max_idx))
        return PracticePlanRef(plan_id=plan_id)

    def get_practice_plan(self, course_id: str) -> Optional[dict[str, Any]]:
        plan_id = _practice_plan_id(course_id)
        with self.db.connect() as conn:
            row = conn.execute("SELECT * FROM learning_plans WHERE id = ?", (plan_id,)).fetchone()
        return dict(row) if row else None

    def get_coach_plan(self, course_id: str) -> Optional[dict[str, Any]]:
        plan_id = _coach_plan_id(course_id)
        with self.db.connect() as conn:
            row = conn.execute("SELECT * FROM learning_plans WHERE id = ?", (plan_id,)).fetchone()
        return dict(row) if row else None

    def list_plan_nodes(self, plan_id: str) -> list[dict[str, Any]]:
        with self.db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM plan_nodes WHERE plan_id = ? ORDER BY idx ASC",
                (plan_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def set_current_node_index(self, *, plan_id: str, current_node_index: int) -> None:
        now = utc_now_iso()
        with self.db.transaction() as conn:
            conn.execute(
                "UPDATE learning_plans SET current_node_index = ?, updated_at = ? WHERE id = ?",
                (int(current_node_index), now, plan_id),
            )

    def set_node_state(self, *, node_id: str, state: str) -> None:
        now = utc_now_iso()
        with self.db.transaction() as conn:
            conn.execute(
                "UPDATE plan_nodes SET state = ?, updated_at = ? WHERE id = ?",
                (str(state), now, node_id),
            )

    def find_practice_node_index(self, *, plan_id: str, segment_idx: int) -> Optional[int]:
        node_id = _coach_practice_node_id(plan_id, int(segment_idx))
        with self.db.connect() as conn:
            row = conn.execute(
                "SELECT idx FROM plan_nodes WHERE plan_id = ? AND id = ?",
                (plan_id, node_id),
            ).fetchone()
        if not row:
            return None
        try:
            return int(row["idx"])
        except Exception:
            return None

    def insert_skip_summary_node_after(
        self,
        *,
        plan_id: str,
        after_idx: int,
        course_id: str,
        range_start_idx: int,
        range_end_idx: int,
    ) -> dict[str, Any]:
        now = utc_now_iso()
        node_id = _coach_narration_node_id(plan_id, "skip_summary", int(range_start_idx), int(range_end_idx))
        desired_idx = int(after_idx) + 1

        with self.db.transaction() as conn:
            row = conn.execute(
                "SELECT * FROM plan_nodes WHERE plan_id = ? AND id = ?",
                (plan_id, node_id),
            ).fetchone()

            if row:
                existing_idx = int(row["idx"])
                if existing_idx != desired_idx:
                    if desired_idx < existing_idx:
                        conn.execute(
                            "UPDATE plan_nodes SET idx = idx + 1000000 WHERE plan_id = ? AND idx >= ? AND idx < ?",
                            (plan_id, desired_idx, existing_idx),
                        )
                        conn.execute(
                            "UPDATE plan_nodes SET idx = -1 WHERE plan_id = ? AND id = ?",
                            (plan_id, node_id),
                        )
                        conn.execute(
                            "UPDATE plan_nodes SET idx = idx - 999999 WHERE plan_id = ? AND idx >= ?",
                            (plan_id, desired_idx + 1000000),
                        )
                        conn.execute(
                            "UPDATE plan_nodes SET idx = ?, updated_at = ? WHERE plan_id = ? AND id = ?",
                            (desired_idx, now, plan_id, node_id),
                        )
                    else:
                        conn.execute(
                            "UPDATE plan_nodes SET idx = idx + 1000000 WHERE plan_id = ? AND idx > ? AND idx <= ?",
                            (plan_id, existing_idx, desired_idx),
                        )
                        conn.execute(
                            "UPDATE plan_nodes SET idx = -1 WHERE plan_id = ? AND id = ?",
                            (plan_id, node_id),
                        )
                        conn.execute(
                            "UPDATE plan_nodes SET idx = idx - 1000001 WHERE plan_id = ? AND idx > ?",
                            (plan_id, existing_idx + 1000000),
                        )
                        conn.execute(
                            "UPDATE plan_nodes SET idx = ?, updated_at = ? WHERE plan_id = ? AND id = ?",
                            (desired_idx, now, plan_id, node_id),
                        )

                out_row = conn.execute(
                    "SELECT * FROM plan_nodes WHERE plan_id = ? AND id = ?",
                    (plan_id, node_id),
                ).fetchone()
                return dict(out_row) if out_row else dict(row)

            conn.execute(
                "UPDATE plan_nodes SET idx = idx + 1000000 WHERE plan_id = ? AND idx >= ?",
                (plan_id, desired_idx),
            )
            conn.execute(
                "UPDATE plan_nodes SET idx = idx - 999999 WHERE plan_id = ? AND idx >= ?",
                (plan_id, desired_idx + 1000000),
            )

            conn.execute(
                """
                INSERT INTO plan_nodes(
                  id, plan_id, idx, node_type, segment_id,
                  range_start_idx, range_end_idx, narration_kind, state,
                  created_at, updated_at
                ) VALUES (?, ?, ?, 'narration', NULL, ?, ?, ?, ?, ?, ?)
                """,
                (
                    node_id,
                    plan_id,
                    desired_idx,
                    int(range_start_idx),
                    int(range_end_idx),
                    "skip_summary",
                    "pending",
                    now,
                    now,
                ),
            )
            new_row = conn.execute("SELECT * FROM plan_nodes WHERE plan_id = ? AND id = ?", (plan_id, node_id)).fetchone()
            return dict(new_row) if new_row else {"id": node_id, "plan_id": plan_id, "idx": desired_idx}


class AttemptRepo:
    def __init__(self, db: SqliteDatabase):
        self.db = db

    def record_attempt(
        self,
        *,
        course_id: str,
        segment_idx: int,
        wav_path: Path,
        overall: int,
        scores: dict[str, Any],
        report: Optional[dict[str, Any]] = None,
        asr_model: Optional[str] = None,
        scoring_model: Optional[str] = None,
    ) -> None:
        now = utc_now_iso()
        plan_id = _practice_plan_id(course_id)
        node_id = _practice_node_id(plan_id, int(segment_idx))
        segment_id = _segment_id(course_id, int(segment_idx))
        with self.db.transaction() as conn:
            stats_row = conn.execute(
                "SELECT best_overall, attempts_count, status FROM segment_stats WHERE segment_id = ?",
                (segment_id,),
            ).fetchone()
            prev_best = int((stats_row["best_overall"] if stats_row else 0) or 0)
            prev_attempts = int((stats_row["attempts_count"] if stats_row else 0) or 0)
            row = conn.execute(
                "SELECT COALESCE(MAX(attempt_no), 0) AS n FROM practice_attempts WHERE segment_id = ?",
                (segment_id,),
            ).fetchone()
            attempt_no = int((row["n"] if row else 0) or 0) + 1
            attempt_id = uuid.uuid4().hex
            conn.execute(
                """
                INSERT INTO practice_attempts(
                  id, course_id, plan_id, node_id, segment_id, attempt_no,
                  wav_path, asr_model, scoring_model, scores_json, report_json, overall, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    attempt_id,
                    course_id,
                    plan_id,
                    node_id,
                    segment_id,
                    attempt_no,
                    str(wav_path),
                    asr_model,
                    scoring_model,
                    json.dumps(scores, ensure_ascii=False),
                    json.dumps(report, ensure_ascii=False) if report is not None else None,
                    int(overall),
                    now,
                ),
            )
            conn.execute(
                """
                INSERT INTO segment_stats(segment_id, best_overall, attempts_count, last_attempt_at, status, updated_at)
                VALUES (
                  ?,
                  ?,
                  ?,
                  ?,
                  COALESCE((SELECT status FROM segment_stats WHERE segment_id = ?), 'locked'),
                  ?
                )
                ON CONFLICT(segment_id) DO UPDATE SET
                  best_overall=excluded.best_overall,
                  attempts_count=excluded.attempts_count,
                  last_attempt_at=excluded.last_attempt_at,
                  updated_at=excluded.updated_at
                """,
                (
                    segment_id,
                    max(prev_best, int(overall)),
                    max(prev_attempts, attempt_no),
                    now,
                    segment_id,
                    now,
                ),
            )


class NarrationRepo:
    def __init__(self, db: SqliteDatabase):
        self.db = db

    def find_by_hash(self, *, course_id: str, kind: str, lang: str, input_hash: str) -> Optional[dict[str, Any]]:
        with self.db.connect() as conn:
            row = conn.execute(
                """
                SELECT *
                FROM narrations
                WHERE course_id = ? AND kind = ? AND lang = ? AND input_hash = ?
                """,
                (course_id, kind, lang, input_hash),
            ).fetchone()
        return dict(row) if row else None

    def upsert(
        self,
        *,
        narration_id: str,
        course_id: str,
        kind: str,
        lang: str,
        input_hash: str,
        prompt_version: str,
        content_text: str,
        content_json: Optional[str] = None,
        plan_id: Optional[str] = None,
        node_id: Optional[str] = None,
        segment_id: Optional[str] = None,
        range_start_idx: Optional[int] = None,
        range_end_idx: Optional[int] = None,
        model_id: Optional[str] = None,
        temperature: Optional[float] = None,
        tts_audio_path: Optional[str] = None,
        tts_voice: Optional[str] = None,
        tts_model: Optional[str] = None,
    ) -> None:
        now = utc_now_iso()
        with self.db.transaction() as conn:
            conn.execute(
                """
                INSERT INTO narrations(
                  id, course_id, plan_id, node_id, kind, lang,
                  range_start_idx, range_end_idx, segment_id,
                  input_hash, prompt_version, model_id, temperature,
                  content_text, content_json,
                  tts_audio_path, tts_voice, tts_model,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(course_id, kind, lang, input_hash) DO UPDATE SET
                  plan_id=excluded.plan_id,
                  node_id=excluded.node_id,
                  segment_id=excluded.segment_id,
                  range_start_idx=excluded.range_start_idx,
                  range_end_idx=excluded.range_end_idx,
                  prompt_version=excluded.prompt_version,
                  model_id=excluded.model_id,
                  temperature=excluded.temperature,
                  content_text=excluded.content_text,
                  content_json=excluded.content_json,
                  tts_audio_path=excluded.tts_audio_path,
                  tts_voice=excluded.tts_voice,
                  tts_model=excluded.tts_model,
                  updated_at=excluded.updated_at
                """,
                (
                    narration_id,
                    course_id,
                    plan_id,
                    node_id,
                    kind,
                    lang,
                    range_start_idx,
                    range_end_idx,
                    segment_id,
                    input_hash,
                    prompt_version,
                    model_id,
                    temperature,
                    content_text,
                    content_json,
                    tts_audio_path,
                    tts_voice,
                    tts_model,
                    now,
                    now,
                ),
            )


def course_from_rows(*, course_row: dict[str, Any], segment_rows: list[dict[str, Any]], plan_row: Optional[dict[str, Any]]) -> Course:
    segments: list[Segment] = []
    for r in segment_rows:
        seg = Segment(
            id=int(r["idx"]),
            start_time=float(r["start_time"]),
            end_time=float(r["end_time"]),
            text=str(r["text"] or ""),
            norm_text=r.get("norm_text"),
            token_count=int(r["token_count"]) if r.get("token_count") is not None else None,
            difficulty=float(r["difficulty"]) if r.get("difficulty") is not None else None,
            user_best_score=int((r.get("best_overall") or 0) or 0),
            attempts=int((r.get("attempts_count") or 0) or 0),
            status=_status_value(r.get("status") or SegmentStatus.LOCKED),
            phonemes="",
            word_scores=[],
        )
        segments.append(seg)

    current_idx = 0
    if plan_row is not None:
        try:
            current_idx = int(plan_row.get("current_node_index") or 0)
        except Exception:
            current_idx = 0

    if segments:
        for seg in segments:
            if seg.status == SegmentStatus.CURRENT:
                current_idx = int(seg.id)
                break

    return Course(
        id=str(course_row["id"]),
        title=str(course_row["title"]),
        audio_path=str(course_row["audio_path"]),
        subtitle_path=course_row.get("subtitle_path"),
        video_path=course_row.get("video_path"),
        cover_path=course_row.get("cover_path"),
        source_url=course_row.get("source_url"),
        library_id=course_row.get("library_id"),
        relative_path=course_row.get("relative_path"),
        tags_json=course_row.get("tags_json"),
        segments=segments,
        pass_threshold=int(course_row.get("pass_threshold") or 80),
        current_segment_index=current_idx,
        created_at=str(course_row.get("created_at") or utc_now_iso()),
        updated_at=str(course_row.get("updated_at") or utc_now_iso()),
    )


def _status_value(status: Any) -> str:
    if status is None:
        return SegmentStatus.LOCKED.value
    if isinstance(status, SegmentStatus):
        return status.value
    if isinstance(status, Enum):
        return str(getattr(status, "value", "") or SegmentStatus.LOCKED.value)
    s = str(status).strip()
    if "." in s:
        s = s.split(".")[-1]
    s = s.lower()
    if s in {"locked", "current", "passed", "skipped"}:
        return s
    return SegmentStatus.LOCKED.value
