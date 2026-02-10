"""
EchoFlow - English Pronunciation Training Plugin

Main entry point for the NiceGUI application.
"""

import argparse
import json
import logging
import sys
from pathlib import Path

from dawnchat_sdk import setup_plugin_logging
from dawnchat_sdk.ui import get_theme, setup_dawnchat_ui
from nicegui import app, ui

logger = setup_plugin_logging("echoflow", level=logging.DEBUG)

logger.info("🎤 EchoFlow Plugin starting...")

# Add src directory to path
SRC_DIR = Path(__file__).parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def main():
    """Plugin entry point."""
    from i18n import i18n
    from storage.course_db import CourseDatabase
    from ui.coach import render_coach_view
    from ui.dashboard import render_dashboard
    from ui.library_page import render_library_page
    from ui.practice import render_practice_view
    from ui.report import render_report_view
    from ui.v2_player import render_v2_player_page
    from ui.v2_timeline_demo import render_v2_timeline_demo
    from ui.word_detail_page import render_word_detail_page
    from ui.words_page import render_words_page

    course_db = CourseDatabase()

    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args, _ = parser.parse_known_args()

    @ui.page('/')
    async def index(theme: str = 'dark', lang: str = 'zh', view: str = 'courses', id: str = '', platform: str = ''):
        """Main page - Course Dashboard with Finder-style two-column layout."""
        is_dark = str(theme).lower() == 'dark'
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()
        
        # view can be: courses, library, words, platform
        # id is the library_id when view=library
        # platform is the source_platform when view=platform (bilibili, youtube)
        library_id = id if view == 'library' and id else None
        plat = platform if view == 'platform' and platform else None
        await render_dashboard(course_db, theme_obj, lang=lang, view=view, library_id=library_id, platform=plat)

    @ui.page('/practice/{course_id}')
    async def practice(course_id: str, theme: str = 'dark', lang: str = 'zh'):
        """Practice page for a specific course."""
        is_dark = str(theme).lower() == 'dark'
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()
        
        course = course_db.get(course_id)
        if not course:
            ui.label(i18n.t("course_not_found", lang)).classes('text-xl')
            return
        
        await render_practice_view(course, course_db, theme_obj, lang=lang)

    @ui.page('/coach/{course_id}')
    async def coach(course_id: str, theme: str = 'dark', lang: str = 'zh', view: str = ""):
        is_dark = str(theme).lower() == 'dark'
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()

        course = course_db.get(course_id)
        if not course:
            ui.label(i18n.t("course_not_found", lang)).classes('text-xl')
            return

        await render_coach_view(course, course_db, theme_obj, lang=lang, view=view)

    @ui.page('/report/{course_id}')
    async def report(course_id: str, theme: str = 'dark', lang: str = 'zh'):
        """Learning report page."""
        is_dark = str(theme).lower() == 'dark'
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()
        
        course = course_db.get(course_id)
        if not course:
            ui.label(i18n.t("course_not_found", lang)).classes('text-xl')
            return
        
        await render_report_view(course, theme_obj, lang=lang)

    @ui.page('/v2/mock')
    async def v2_mock(theme: str = "dark", lang: str = "zh"):
        is_dark = str(theme).lower() == "dark"
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()
        await render_v2_timeline_demo(theme_obj, lang=lang)

    @ui.page('/v2/player/{course_id}')
    async def v2_player(course_id: str, theme: str = "dark", lang: str = "zh"):
        """Smart Player v2 page."""
        is_dark = str(theme).lower() == "dark"
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()

        course = course_db.get(course_id)
        if not course:
            ui.label(i18n.t("course_not_found", lang)).classes('text-xl')
            return

        await render_v2_player_page(course, course_db, theme_obj, lang=lang)

    @ui.page('/library')
    async def library(theme: str = "dark", lang: str = "zh"):
        """Media library management page."""
        is_dark = str(theme).lower() == "dark"
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()

        await render_library_page(course_db, theme_obj, lang=lang)

    @ui.page('/words')
    async def words(theme: str = "dark", lang: str = "zh"):
        """Word list browsing page."""
        is_dark = str(theme).lower() == "dark"
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()

        await render_words_page(course_db, theme_obj, lang=lang)

    @ui.page('/word/{word}')
    async def word_detail(word: str, theme: str = "dark", lang: str = "zh"):
        """Word detail page showing occurrences in library."""
        is_dark = str(theme).lower() == "dark"
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()

        await render_word_detail_page(word, course_db, theme_obj, lang=lang)

    # Startup callback
    def on_startup():
        try:
            from v2.runtime import cleanup_temp_dir

            cleanup_temp_dir()
        except Exception:
            pass
        try:
            from lexicon.lexicon_db import ensure_lexicon_sqlite

            plugin_root = Path(__file__).resolve().parent.parent
            data_dir = Path(course_db.db_path).parent
            ensure_lexicon_sqlite(data_dir=data_dir, plugin_root=plugin_root)
        except Exception:
            pass
        try:
            # Ensure schema is up to date (includes v3 migration for library/occurrences)
            from storage.schema_v1 import ensure_schema
            from storage.sqlite import SqliteDatabase

            db = SqliteDatabase(str(course_db.db_path))
            ensure_schema(db)
        except Exception:
            pass
        print(json.dumps({"status": "ready"}), file=sys.stderr, flush=True)

    app.on_startup(on_startup)

    # Start server
    ui.run(
        host=args.host,
        port=args.port,
        title="英语跟读训练",
        favicon="🎤",
        show=False,
        reload=False,
        dark=False
    )


if __name__ in {"__main__", "__mp_main__"}:
    main()
