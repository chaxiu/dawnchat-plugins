"""
SQLite-based course storage.
"""

from pathlib import Path
from typing import List, Optional
import shutil
import json
import logging

from course.models import Course
from lexicon import LexiconRepo, ensure_lexicon_sqlite

from services.planner import build_coach_plan_nodes, parse_strategy_config

from .repos import (
    AttemptRepo,
    CourseRepo,
    NarrationRepo,
    PlanRepo,
    ProfileRepo,
    SegmentRepo,
    StrategyPresetRepo,
    course_from_rows,
)
from .schema_v1 import ensure_schema, utc_now_iso
from .sqlite import SqliteDatabase

logger = logging.getLogger("echoflow.storage")


class CourseDatabase:
    """
    Local SQLite database for storing courses and progress.
    """
    
    def __init__(self, db_path: Optional[Path] = None):
        if db_path is None:
            # Use plugin's data directory
            self._data_dir = Path.home() / ".dawnchat" / "plugins" / "echoflow"
            self._data_dir.mkdir(parents=True, exist_ok=True)
            db_path = self._data_dir / "courses.db"
        else:
            self._data_dir = db_path.parent

        self.db_path = db_path
        self._db = SqliteDatabase(self.db_path)
        ensure_schema(self._db)
        self._course_repo = CourseRepo(self._db)
        self._segment_repo = SegmentRepo(self._db)
        self._plan_repo = PlanRepo(self._db)
        self._attempt_repo = AttemptRepo(self._db)
        self._narration_repo = NarrationRepo(self._db)
        self._profile_repo = ProfileRepo(self._db)
        self._strategy_repo = StrategyPresetRepo(self._db)
        self._lexicon_repo: Optional[LexiconRepo] = None

        try:
            self._plugin_root = Path(__file__).resolve().parents[2]
        except Exception:
            self._plugin_root = None

    def _get_lexicon_repo(self) -> Optional[LexiconRepo]:
        if self._lexicon_repo is not None:
            return self._lexicon_repo
        if not self._plugin_root:
            return None
        try:
            db_path = ensure_lexicon_sqlite(data_dir=self._data_dir, plugin_root=self._plugin_root)
            self._lexicon_repo = LexiconRepo(db_path)
            return self._lexicon_repo
        except Exception:
            return None
    
    def _ensure_defaults(self) -> None:
        now = utc_now_iso()
        with self._db.transaction() as conn:
            self._profile_repo.ensure_defaults(conn, now=now)
            self._strategy_repo.ensure_defaults(conn, now=now)

    def list_profiles(self) -> list[dict]:
        self._ensure_defaults()
        return self._profile_repo.list_all()

    def list_strategy_presets(self) -> list[dict]:
        self._ensure_defaults()
        return self._strategy_repo.list_all()

    def get_profile(self, profile_id: str) -> Optional[dict]:
        self._ensure_defaults()
        return self._profile_repo.get(str(profile_id))

    def get_strategy_preset(self, preset_id: str) -> Optional[dict]:
        self._ensure_defaults()
        return self._strategy_repo.get(str(preset_id))

    def upsert_strategy_preset(self, *, preset_id: str, name: str, version: int, config_json: str) -> None:
        self._ensure_defaults()
        self._strategy_repo.upsert(preset_id=str(preset_id), name=str(name), version=int(version), config_json=str(config_json))

    def get_app_prefs(self) -> dict:
        self._ensure_defaults()
        return self._profile_repo.get_prefs("default")

    def patch_app_prefs(self, patch: dict) -> dict:
        self._ensure_defaults()
        safe_patch = patch if isinstance(patch, dict) else {}
        return self._profile_repo.patch_prefs(profile_id="default", patch=safe_patch)

    def clear_course_tts_cache(self, course_id: str) -> None:
        try:
            shutil.rmtree(Path(self.db_path).parent / "tts" / str(course_id), ignore_errors=True)
        except Exception:
            pass

    def save(
        self,
        course: Course,
        *,
        ensure_practice_plan: bool = True,
        update_practice_plan_cursor: bool = True,
    ) -> bool:
        """Save or update a course."""
        try:
            now = course.updated_at or utc_now_iso()
            course.updated_at = now
            lexicon_repo = self._get_lexicon_repo()
            with self._db.transaction() as conn:
                self._course_repo.upsert_course(conn, course)
                self._segment_repo.upsert_course_segments(
                    conn, course_id=course.id, segments=course.segments, now=now, lexicon_repo=lexicon_repo
                )
                self._segment_repo.upsert_segment_stats(conn, course_id=course.id, segments=course.segments, now=now)
                if ensure_practice_plan:
                    self._plan_repo.ensure_practice_plan(
                        conn, course=course, now=now, update_cursor=bool(update_practice_plan_cursor)
                    )
            return True
        except Exception as e:
            logger.error(f"Failed to save course: {e}")
            return False
    
    def get(self, course_id: str) -> Optional[Course]:
        """Get a course by ID."""
        try:
            course_row = self._course_repo.get_course(course_id)
            if not course_row:
                return None
            segments = self._segment_repo.list_segments_with_stats(course_id)
            plan = self._plan_repo.get_practice_plan(course_id)
            return course_from_rows(course_row=course_row, segment_rows=segments, plan_row=plan)
        except Exception as e:
            logger.error(f"Failed to get course: {e}")
            return None
    
    def list_all(self) -> List[Course]:
        """List all courses."""
        try:
            out: list[Course] = []
            for course_row in self._course_repo.list_courses():
                course_id = str(course_row["id"])
                segments = self._segment_repo.list_segments_with_stats(course_id)
                plan = self._plan_repo.get_practice_plan(course_id)
                out.append(course_from_rows(course_row=course_row, segment_rows=segments, plan_row=plan))
            return out
        except Exception as e:
            logger.error(f"Failed to list courses: {e}")
            return []

    def list_by_library(self, library_id: str) -> List[Course]:
        """List courses belonging to a specific media library."""
        try:
            out: list[Course] = []
            for course_row in self._course_repo.list_courses_by_library(library_id):
                course_id = str(course_row["id"])
                segments = self._segment_repo.list_segments_with_stats(course_id)
                plan = self._plan_repo.get_practice_plan(course_id)
                out.append(course_from_rows(course_row=course_row, segment_rows=segments, plan_row=plan))
            return out
        except Exception as e:
            logger.error(f"Failed to list courses by library: {e}")
            return []

    def list_by_platform(self, platform: str) -> List[Course]:
        """List courses by source platform (youtube, bilibili, other)."""
        try:
            out: list[Course] = []
            for course_row in self._course_repo.list_courses_by_platform(platform):
                course_id = str(course_row["id"])
                segments = self._segment_repo.list_segments_with_stats(course_id)
                plan = self._plan_repo.get_practice_plan(course_id)
                out.append(course_from_rows(course_row=course_row, segment_rows=segments, plan_row=plan))
            return out
        except Exception as e:
            logger.error(f"Failed to list courses by platform: {e}")
            return []
    
    def delete(self, course_id: str) -> bool:
        """Delete a course."""
        try:
            self._course_repo.delete_course(course_id)
            self.clear_course_tts_cache(str(course_id))
            return True
        except Exception as e:
            logger.error(f"Failed to delete course: {e}")
            return False

    def record_attempt(
        self,
        *,
        course_id: str,
        segment_idx: int,
        wav_path: Path,
        overall: int,
        scores: dict,
        report: Optional[dict] = None,
        asr_model: Optional[str] = None,
        scoring_model: Optional[str] = None,
    ) -> None:
        self._attempt_repo.record_attempt(
            course_id=course_id,
            segment_idx=int(segment_idx),
            wav_path=wav_path,
            overall=int(overall),
            scores=scores,
            report=report,
            asr_model=asr_model,
            scoring_model=scoring_model,
        )

    def ensure_coach_plan(
        self,
        course: Course,
        *,
        profile_id: Optional[str] = None,
        strategy_id: Optional[str] = None,
        regenerate: bool = False,
        anchor_segment_idx: Optional[int] = None,
        ui_lang: str = "zh",
    ) -> str:
        self._ensure_defaults()
        now = utc_now_iso()
        with self._db.transaction() as conn:
            existing = conn.execute(
                "SELECT * FROM learning_plans WHERE id = ?",
                (f"coach:{course.id}",),
            ).fetchone()
            existing_profile = str(existing["profile_id"] or "") if existing else ""
            existing_strategy = str(existing["strategy_id"] or "") if existing else ""

            resolved_profile = str(profile_id or existing_profile or "").strip()
            resolved_strategy = str(strategy_id or existing_strategy or "").strip()

            if not resolved_profile:
                row = conn.execute("SELECT id FROM profiles ORDER BY updated_at DESC LIMIT 1").fetchone()
                resolved_profile = str(row["id"]) if row else "default"

            if not resolved_strategy:
                row = conn.execute("SELECT id FROM strategy_presets ORDER BY updated_at DESC LIMIT 1").fetchone()
                resolved_strategy = str(row["id"]) if row else "preset:intensive_v1"

            plan_id = self._plan_repo.upsert_coach_plan(
                conn,
                course=course,
                now=now,
                profile_id=resolved_profile,
                strategy_id=resolved_strategy,
                name="Coach",
                lang=str(ui_lang or "zh"),
                current_node_index=int(existing["current_node_index"] or 0) if existing else 0,
            )

            need_regen = bool(regenerate)
            if not need_regen:
                count = self._plan_repo.plan_node_count(conn=conn, plan_id=plan_id)
                need_regen = count <= 0

            if not need_regen:
                return plan_id

            preset_row = conn.execute(
                "SELECT config_json FROM strategy_presets WHERE id = ?",
                (resolved_strategy,),
            ).fetchone()
            try:
                cfg_obj = json.loads(str(preset_row["config_json"] or "{}")) if preset_row else {}
            except Exception:
                cfg_obj = {}
            strategy = parse_strategy_config(cfg_obj)
            nodes = build_coach_plan_nodes(course=course, plan_id=plan_id, strategy=strategy, lang=str(ui_lang or "zh"))
            self._plan_repo.replace_plan_nodes(conn, plan_id=plan_id, nodes=nodes, now=now)

            if anchor_segment_idx is not None:
                anchor = int(anchor_segment_idx)
                anchor_node_idx = 0
                for i, n in enumerate(nodes):
                    if str(n.get("node_type") or "") != "practice":
                        continue
                    seg_id = str(n.get("segment_id") or "")
                    if seg_id.endswith(f":{anchor}"):
                        anchor_node_idx = int(i)
                        break
                conn.execute(
                    "UPDATE learning_plans SET current_node_index = ?, updated_at = ? WHERE id = ?",
                    (int(anchor_node_idx), now, plan_id),
                )

            return plan_id

    def get_coach_plan(self, course_id: str) -> Optional[dict]:
        return self._plan_repo.get_coach_plan(course_id)

    def list_plan_nodes(self, plan_id: str) -> list[dict]:
        return self._plan_repo.list_plan_nodes(plan_id)

    def set_plan_current_node_index(self, *, plan_id: str, current_node_index: int) -> None:
        self._plan_repo.set_current_node_index(plan_id=plan_id, current_node_index=int(current_node_index))

    def set_plan_node_state(self, *, node_id: str, state: str) -> None:
        self._plan_repo.set_node_state(node_id=node_id, state=state)

    def find_coach_practice_node_index(self, *, plan_id: str, segment_idx: int) -> Optional[int]:
        return self._plan_repo.find_practice_node_index(plan_id=plan_id, segment_idx=int(segment_idx))

    def insert_coach_skip_summary_node_after(
        self,
        *,
        plan_id: str,
        after_idx: int,
        course_id: str,
        range_start_idx: int,
        range_end_idx: int,
    ) -> dict:
        return self._plan_repo.insert_skip_summary_node_after(
            plan_id=plan_id,
            after_idx=int(after_idx),
            course_id=str(course_id),
            range_start_idx=int(range_start_idx),
            range_end_idx=int(range_end_idx),
        )

    def find_cached_narration(self, *, course_id: str, kind: str, lang: str, input_hash: str) -> Optional[dict]:
        return self._narration_repo.find_by_hash(course_id=course_id, kind=kind, lang=lang, input_hash=input_hash)

    def upsert_narration(self, **kwargs) -> None:
        self._narration_repo.upsert(**kwargs)


