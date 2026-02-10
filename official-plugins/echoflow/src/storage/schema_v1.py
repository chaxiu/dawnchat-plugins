from __future__ import annotations

import json
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

import sqlite3

from .sqlite import SqliteDatabase


SCHEMA_VERSION = "3"


def ensure_schema(db: SqliteDatabase) -> None:
    with db.transaction() as conn:
        existing = _schema_version(conn)
        if existing == SCHEMA_VERSION:
            return
        if not existing:
            if _is_legacy_courses_db(conn):
                _migrate_legacy(conn)
            else:
                _create_schema(conn)
            return
        _migrate_schema(conn, from_version=existing)


def _schema_version(conn: sqlite3.Connection) -> Optional[str]:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='meta'"
    ).fetchone()
    if not row:
        return None
    ver = conn.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
    return str(ver["value"]).strip() if ver and ver["value"] is not None else None


def _migrate_schema(conn: sqlite3.Connection, *, from_version: str) -> None:
    v = str(from_version or "").strip()
    if v == SCHEMA_VERSION:
        return

    if v == "1":
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(plan_nodes)").fetchall()}
        if "reason" not in cols:
            conn.execute("ALTER TABLE plan_nodes ADD COLUMN reason TEXT")
        v = "2"

    if v == "2":
        _migrate_v2_to_v3(conn)
        return

    _create_schema(conn)


def _migrate_v2_to_v3(conn: sqlite3.Connection) -> None:
    """Migrate from v2 to v3: add libraries, occurrences, word_stats tables and extend courses."""
    conn.executescript(
        """
        -- Libraries table (media library)
        CREATE TABLE IF NOT EXISTS libraries (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          root_path TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'ready',
          scan_result_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_libraries_updated ON libraries(updated_at);

        -- Occurrences table (inverted index)
        CREATE TABLE IF NOT EXISTS occurrences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          term TEXT NOT NULL,
          course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          segment_id TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
          segment_idx INTEGER NOT NULL,
          surface TEXT,
          token_pos INTEGER,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_occ_term_course_seg ON occurrences(term, course_id, segment_idx);
        CREATE INDEX IF NOT EXISTS idx_occ_course ON occurrences(course_id);
        CREATE INDEX IF NOT EXISTS idx_occ_segment ON occurrences(segment_id);

        -- Word stats cache table
        CREATE TABLE IF NOT EXISTS word_stats (
          term TEXT PRIMARY KEY,
          total_count INTEGER NOT NULL,
          segment_count INTEGER NOT NULL,
          course_count INTEGER NOT NULL,
          is_stopword INTEGER NOT NULL DEFAULT 0,
          computed_at TEXT NOT NULL
        );
        """
    )

    # Extend courses table with new columns
    courses_cols = {r["name"] for r in conn.execute("PRAGMA table_info(courses)").fetchall()}
    if "library_id" not in courses_cols:
        conn.execute("ALTER TABLE courses ADD COLUMN library_id TEXT REFERENCES libraries(id) ON DELETE SET NULL")
    if "relative_path" not in courses_cols:
        conn.execute("ALTER TABLE courses ADD COLUMN relative_path TEXT")
    if "tags_json" not in courses_cols:
        conn.execute("ALTER TABLE courses ADD COLUMN tags_json TEXT")

    # Create index for library_id if not exists
    conn.execute("CREATE INDEX IF NOT EXISTS idx_courses_library ON courses(library_id)")

    # Update schema version
    conn.execute("INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', '3')")
    conn.execute(
        "INSERT OR REPLACE INTO meta(key, value) VALUES ('updated_at', strftime('%Y-%m-%dT%H:%M:%fZ','now'))"
    )


def _is_legacy_courses_db(conn: sqlite3.Connection) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='courses'"
    ).fetchone()
    if not row:
        return False
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(courses)").fetchall()}
    return "segments_json" in cols


def _create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          source_url TEXT,
          source_platform TEXT,
          lang TEXT NOT NULL DEFAULT 'en',
          audio_path TEXT NOT NULL,
          video_path TEXT,
          subtitle_path TEXT,
          cover_path TEXT,
          duration_s REAL,
          pass_threshold INTEGER NOT NULL DEFAULT 80,
          library_id TEXT REFERENCES libraries(id) ON DELETE SET NULL,
          relative_path TEXT,
          tags_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_courses_updated_at ON courses(updated_at);
        CREATE INDEX IF NOT EXISTS idx_courses_source_url ON courses(source_url);
        CREATE INDEX IF NOT EXISTS idx_courses_library ON courses(library_id);

        CREATE TABLE IF NOT EXISTS segments (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          idx INTEGER NOT NULL,
          start_time REAL NOT NULL,
          end_time REAL NOT NULL,
          text TEXT NOT NULL,
          norm_text TEXT,
          token_count INTEGER,
          difficulty REAL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(course_id, idx)
        );
        CREATE INDEX IF NOT EXISTS idx_segments_course ON segments(course_id);
        CREATE INDEX IF NOT EXISTS idx_segments_course_time ON segments(course_id, start_time, end_time);

        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          audience TEXT NOT NULL,
          target_level TEXT NOT NULL,
          vocab_size_estimate INTEGER,
          prefs_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

        CREATE TABLE IF NOT EXISTS strategy_presets (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          config_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_strategy_name ON strategy_presets(name);

        CREATE TABLE IF NOT EXISTS learning_plans (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          profile_id TEXT REFERENCES profiles(id),
          strategy_id TEXT REFERENCES strategy_presets(id),
          name TEXT,
          lang TEXT NOT NULL DEFAULT 'zh',
          status TEXT NOT NULL DEFAULT 'active',
          current_node_index INTEGER NOT NULL DEFAULT 0,
          pass_threshold INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_plans_course ON learning_plans(course_id, updated_at);
        CREATE INDEX IF NOT EXISTS idx_plans_profile ON learning_plans(profile_id);

        CREATE TABLE IF NOT EXISTS plan_nodes (
          id TEXT PRIMARY KEY,
          plan_id TEXT NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
          idx INTEGER NOT NULL,
          node_type TEXT NOT NULL,
          segment_id TEXT REFERENCES segments(id),
          range_start_idx INTEGER,
          range_end_idx INTEGER,
          narration_kind TEXT,
          reason TEXT,
          state TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(plan_id, idx)
        );
        CREATE INDEX IF NOT EXISTS idx_plan_nodes_plan ON plan_nodes(plan_id);
        CREATE INDEX IF NOT EXISTS idx_plan_nodes_type ON plan_nodes(plan_id, node_type);

        CREATE TABLE IF NOT EXISTS narrations (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          plan_id TEXT REFERENCES learning_plans(id) ON DELETE CASCADE,
          node_id TEXT REFERENCES plan_nodes(id) ON DELETE CASCADE,
          kind TEXT NOT NULL,
          lang TEXT NOT NULL,
          range_start_idx INTEGER,
          range_end_idx INTEGER,
          segment_id TEXT REFERENCES segments(id) ON DELETE CASCADE,
          input_hash TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          model_id TEXT,
          temperature REAL,
          content_text TEXT NOT NULL,
          content_json TEXT,
          tts_audio_path TEXT,
          tts_voice TEXT,
          tts_model TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(course_id, kind, lang, input_hash)
        );
        CREATE INDEX IF NOT EXISTS idx_narrations_course_kind ON narrations(course_id, kind, lang);
        CREATE INDEX IF NOT EXISTS idx_narrations_hash ON narrations(input_hash);

        CREATE TABLE IF NOT EXISTS practice_attempts (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          plan_id TEXT REFERENCES learning_plans(id) ON DELETE SET NULL,
          node_id TEXT REFERENCES plan_nodes(id) ON DELETE SET NULL,
          segment_id TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
          attempt_no INTEGER NOT NULL,
          wav_path TEXT NOT NULL,
          asr_model TEXT,
          scoring_model TEXT,
          scores_json TEXT NOT NULL,
          report_json TEXT,
          overall INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_attempts_segment ON practice_attempts(segment_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_attempts_course ON practice_attempts(course_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_attempts_plan ON practice_attempts(plan_id, created_at);

        CREATE TABLE IF NOT EXISTS segment_stats (
          segment_id TEXT PRIMARY KEY REFERENCES segments(id) ON DELETE CASCADE,
          best_overall INTEGER NOT NULL DEFAULT 0,
          attempts_count INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TEXT,
          status TEXT NOT NULL DEFAULT 'locked',
          updated_at TEXT NOT NULL
        );

        -- Libraries table (media library)
        CREATE TABLE IF NOT EXISTS libraries (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          root_path TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'ready',
          scan_result_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_libraries_updated ON libraries(updated_at);

        -- Occurrences table (inverted index for word search)
        CREATE TABLE IF NOT EXISTS occurrences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          term TEXT NOT NULL,
          course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          segment_id TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
          segment_idx INTEGER NOT NULL,
          surface TEXT,
          token_pos INTEGER,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_occ_term_course_seg ON occurrences(term, course_id, segment_idx);
        CREATE INDEX IF NOT EXISTS idx_occ_course ON occurrences(course_id);
        CREATE INDEX IF NOT EXISTS idx_occ_segment ON occurrences(segment_id);

        -- Word stats cache table (lazy computation)
        CREATE TABLE IF NOT EXISTS word_stats (
          term TEXT PRIMARY KEY,
          total_count INTEGER NOT NULL,
          segment_count INTEGER NOT NULL,
          course_count INTEGER NOT NULL,
          is_stopword INTEGER NOT NULL DEFAULT 0,
          computed_at TEXT NOT NULL
        );

        INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', '3');
        INSERT OR REPLACE INTO meta(key, value) VALUES ('created_at', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
        INSERT OR REPLACE INTO meta(key, value) VALUES ('updated_at', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
        """
    )


def _migrate_legacy(conn: sqlite3.Connection) -> None:
    conn.execute("ALTER TABLE courses RENAME TO legacy_courses")
    _create_schema(conn)

    rows = conn.execute("SELECT * FROM legacy_courses").fetchall()
    for row in rows:
        course_id = str(row["id"])
        created_at = row["created_at"]
        updated_at = row["updated_at"]
        source_url = row["source_url"]
        source_platform = _source_platform(source_url)

        conn.execute(
            """
            INSERT INTO courses(
              id, title, source_url, source_platform, lang,
              audio_path, video_path, subtitle_path, cover_path, duration_s,
              pass_threshold, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                course_id,
                row["title"],
                source_url,
                source_platform,
                "en",
                row["audio_path"],
                row["video_path"],
                row["subtitle_path"],
                row["cover_path"],
                None,
                row["pass_threshold"],
                created_at,
                updated_at,
            ),
        )

        try:
            segs_raw = json.loads(row["segments_json"] or "[]")
        except Exception:
            segs_raw = []

        for seg in segs_raw:
            idx = int(seg.get("id") or 0)
            segment_id = _segment_id(course_id, idx)
            conn.execute(
                """
                INSERT INTO segments(
                  id, course_id, idx, start_time, end_time, text,
                  norm_text, token_count, difficulty, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    segment_id,
                    course_id,
                    idx,
                    float(seg.get("start_time") or 0.0),
                    float(seg.get("end_time") or 0.0),
                    str(seg.get("text") or ""),
                    None,
                    None,
                    None,
                    created_at,
                    updated_at,
                ),
            )

            best = int(seg.get("user_best_score") or 0)
            attempts = int(seg.get("attempts") or 0)
            status = str(seg.get("status") or "locked")
            conn.execute(
                """
                INSERT OR REPLACE INTO segment_stats(
                  segment_id, best_overall, attempts_count, last_attempt_at, status, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (segment_id, best, attempts, None, status, updated_at),
            )

        plan_id = _practice_plan_id(course_id)
        conn.execute(
            """
            INSERT INTO learning_plans(
              id, course_id, profile_id, strategy_id, name, lang, status,
              current_node_index, pass_threshold, created_at, updated_at
            ) VALUES (?, ?, NULL, NULL, ?, ?, 'active', ?, ?, ?, ?)
            """,
            (
                plan_id,
                course_id,
                "Practice",
                "zh",
                int(row["current_segment_index"] or 0),
                int(row["pass_threshold"] or 80),
                created_at,
                updated_at,
            ),
        )

        for seg in segs_raw:
            idx = int(seg.get("id") or 0)
            node_id = _practice_node_id(plan_id, idx)
            segment_id = _segment_id(course_id, idx)
            state = _node_state(str(seg.get("status") or "locked"))
            conn.execute(
                """
                INSERT INTO plan_nodes(
                  id, plan_id, idx, node_type, segment_id,
                  range_start_idx, range_end_idx, narration_kind, state,
                  created_at, updated_at
                ) VALUES (?, ?, ?, 'practice', ?, NULL, NULL, NULL, ?, ?, ?)
                """,
                (node_id, plan_id, idx, segment_id, state, created_at, updated_at),
            )


def _source_platform(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return "other"
    if "youtube.com" in host or "youtu.be" in host:
        return "youtube"
    if "bilibili.com" in host:
        return "bilibili"
    return "other"


def _segment_id(course_id: str, idx: int) -> str:
    return f"{course_id}:{int(idx)}"


def _practice_plan_id(course_id: str) -> str:
    return f"practice:{course_id}"


def _practice_node_id(plan_id: str, idx: int) -> str:
    return f"{plan_id}:{int(idx)}"


def _coach_plan_id(course_id: str) -> str:
    return f"coach:{course_id}"


def _coach_practice_node_id(plan_id: str, segment_idx: int) -> str:
    return f"{plan_id}:practice:{int(segment_idx)}"


def _coach_narration_node_id(plan_id: str, kind: str, start_idx: int, end_idx: int) -> str:
    return f"{plan_id}:narration:{kind}:{int(start_idx)}-{int(end_idx)}"


def _node_state(segment_status: str) -> str:
    s = (segment_status or "").strip()
    if "." in s:
        s = s.split(".")[-1]
    s = s.lower()
    if s == "passed":
        return "done"
    if s == "skipped":
        return "skipped"
    if s == "current":
        return "doing"
    return "pending"


def utc_now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"
