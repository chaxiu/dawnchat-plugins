"""
Word Detail Page - Show word occurrences across the subtitle library.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any, Optional

from nicegui import ui

from i18n import i18n

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase

logger = logging.getLogger("echoflow.word_detail_page")


async def render_word_detail_page(
    word: str,
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
):
    """
    Render the word detail page.

    Shows:
    - Word information (translation, frequency, type)
    - Occurrences across all courses (aggregated by course)
    - Recommended segments for learning
    - Jump to practice button
    """
    from lexicon.lexicon_db import LexiconRepo, ensure_lexicon_sqlite
    from services.word_search_service import WordSearchService
    from storage.occurrence_repo import OccurrenceRepo
    from storage.sqlite import SqliteDatabase

    c = theme.colors
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    query = f"?theme={theme_mode}&lang={lang}"
    # Build back URL that preserves words view state
    back_url = f"/?theme={theme_mode}&lang={lang}&view=words"
    lang_key = "zh" if lang.startswith("zh") else "en"

    def _t(key: str) -> str:
        val = i18n.t(key, lang)
        return val if val != key else _fallback_text(key, lang)

    # Initialize services
    db_path = Path(course_db.db_path)
    data_dir = db_path.parent
    plugin_root = Path(__file__).resolve().parents[2]

    db = SqliteDatabase(str(db_path))
    lexicon_path = ensure_lexicon_sqlite(data_dir=data_dir, plugin_root=plugin_root)
    lexicon_repo = LexiconRepo(lexicon_path)
    occurrence_repo = OccurrenceRepo(db)
    search_service = WordSearchService(occurrence_repo, lexicon_repo)

    # Get word info and search results
    word_info = search_service.get_word_info(word)
    search_result = search_service.search_word(word, limit=100)

    # Add styles - optimized for desktop with full-width layout
    ui.add_head_html(f"""
    <style>
        .word-detail-page {{
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }}
        .word-detail-content {{
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem 2rem;
        }}
        .word-header {{
            background: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }}
        .word-tabs-container {{
            display: flex;
            gap: 0;
            border-bottom: 1px solid {c.border};
            margin-bottom: 1rem;
        }}
        .course-list {{
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }}
        .course-hit-card {{
            background: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 8px;
            overflow: hidden;
        }}
        .course-hit-header {{
            padding: 0.75rem 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .course-hit-header:hover {{
            background: {c.bg_primary};
        }}
        .segment-item {{
            padding: 0.75rem 1rem;
            border-top: 1px solid {c.border};
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 1rem;
        }}
        .segment-item:hover {{
            background: rgba(0,0,0,0.05);
        }}
        .highlight-term {{
            background: rgba(255, 235, 59, 0.4);
            padding: 0 2px;
            border-radius: 2px;
        }}
        .tab-btn {{
            padding: 0.5rem 1rem;
            border: none;
            background: transparent;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: {c.text_secondary};
        }}
        .tab-btn.active {{
            border-bottom-color: {c.primary};
            color: {c.primary};
        }}
    </style>
    """)

    # Main page container
    with ui.element("div").classes("word-detail-page"):
        # Header bar
        with ui.row().classes("w-full items-center justify-between p-4 flex-shrink-0").style(
            f"background-color: {c.bg_secondary}; border-bottom: 1px solid {c.border};"
        ):
            with ui.row().classes("items-center gap-4"):
                ui.button(icon="arrow_back", on_click=lambda: ui.navigate.to(back_url)).props(
                    "flat round"
                )
                ui.label(word).classes("text-xl font-bold").style(f"color: {c.text_primary};")

        # Scrollable content container
        with ui.element("div").classes("word-detail-content"):
            # Word info header
            with ui.element("div").classes("word-header"):
                with ui.row().classes("items-start justify-between"):
                    with ui.column().classes("gap-2"):
                        ui.label(word).classes("text-3xl font-bold").style(f"color: {c.text_primary};")

                        if word_info.get("found"):
                            # Translation
                            tran = word_info.get("translation", "")
                            if tran:
                                # Show first few lines
                                lines = tran.split("\n")[:3]
                                for line in lines:
                                    ui.label(line).style(f"color: {c.text_secondary};")

                            # Type and frequency
                            with ui.row().classes("gap-4 mt-2"):
                                word_type = word_info.get("type")
                                if word_type is not None:
                                    type_name = _get_type_name(word_type, lang_key)
                                    ui.label(type_name).classes("px-2 py-1 rounded text-sm").style(
                                        f"background: {c.bg_primary}; color: {c.text_secondary};"
                                    )

                                freq = word_info.get("frequency")
                                if freq is not None:
                                    ui.label(f"#{freq}").classes("text-sm").style(
                                        f"color: {c.text_secondary};"
                                    )
                        else:
                            ui.label(_t("word_not_in_dict")).style(f"color: {c.text_secondary};")

                    # Stats
                    with ui.column().classes("items-end gap-1"):
                        if search_result.stats:
                            ui.label(f"{search_result.total_matches} {_t('occurrences')}").classes(
                                "text-lg font-medium"
                            ).style(f"color: {c.text_primary};")
                            ui.label(f"{len(search_result.courses)} {_t('courses')}").style(
                                f"color: {c.text_secondary};"
                            )

                            if search_result.is_stopword:
                                ui.label(_t("high_freq_word")).classes("text-sm px-2 py-1 rounded").style(
                                    f"background: {c.warning}; color: white;"
                                )
                        else:
                            ui.label(_t("no_occurrences")).style(f"color: {c.text_secondary};")

            # Tabs
            state = {"active_tab": "courses"}

            with ui.element("div").classes("word-tabs-container"):
                courses_tab = ui.button(
                    _t("by_course"),
                    on_click=lambda: switch_tab("courses"),
                ).classes("tab-btn active").props("flat")

                recommendations_tab = ui.button(
                    _t("recommendations"),
                    on_click=lambda: switch_tab("recommendations"),
                ).classes("tab-btn").props("flat")

            # Content area
            content_container = ui.column().classes("w-full course-list")

        def switch_tab(tab: str):
            state["active_tab"] = tab
            if tab == "courses":
                courses_tab.classes(add="active")
                recommendations_tab.classes(remove="active")
            else:
                courses_tab.classes(remove="active")
                recommendations_tab.classes(add="active")
            render_content()

        def render_content():
            content_container.clear()

            with content_container:
                if state["active_tab"] == "courses":
                    render_courses_tab()
                else:
                    render_recommendations_tab()

        def render_courses_tab():
            """Render occurrences grouped by course."""
            if not search_result.courses:
                ui.label(_t("no_occurrences")).style(f"color: {c.text_secondary};")
                return

            for course_hit in search_result.courses[:20]:  # Limit display
                with ui.element("div").classes("course-hit-card"):
                    # Course header (expandable)
                    expanded_state = {"expanded": False}
                    segments_container = ui.column().classes("w-full")
                    segments_container.visible = False

                    with ui.element("div").classes("course-hit-header"):
                        with ui.row().classes("items-center gap-3"):
                            # Cover thumbnail
                            if course_hit.cover_path:
                                ui.image(course_hit.cover_path).classes(
                                    "w-12 h-8 object-cover rounded"
                                )
                            else:
                                ui.element("div").classes("w-12 h-8 rounded").style(
                                    f"background: {c.bg_primary};"
                                )

                            with ui.column().classes("gap-0"):
                                ui.label(course_hit.title).classes("font-medium").style(
                                    f"color: {c.text_primary};"
                                )
                                ui.label(f"{course_hit.hit_count} {_t('matches')}").classes(
                                    "text-sm"
                                ).style(f"color: {c.text_secondary};")

                        with ui.row().classes("items-center gap-2"):
                            expand_icon = ui.icon("expand_more").style(
                                f"color: {c.text_secondary};"
                            )

                            async def toggle_expand(
                                course_id=course_hit.course_id,
                                container=segments_container,
                                icon=expand_icon,
                                exp_state=expanded_state,
                            ):
                                exp_state["expanded"] = not exp_state["expanded"]
                                container.visible = exp_state["expanded"]
                                icon.name = "expand_less" if exp_state["expanded"] else "expand_more"

                                if exp_state["expanded"] and container.default_slot.children == []:
                                    # Load segments
                                    matches = search_service.get_matches_for_course(
                                        word, course_id, limit=10
                                    )
                                    with container:
                                        for m in matches:
                                            render_segment_item(m, course_id)

                            ui.element("div").classes("course-hit-header").on(
                                "click", toggle_expand
                            )

                    segments_container

        def render_segment_item(match, course_id: str):
            """Render a single segment match."""
            with ui.element("div").classes("segment-item"):
                with ui.column().classes("flex-1 gap-1"):
                    # Time
                    start = match.start_time
                    end = match.end_time
                    time_str = f"{_format_time(start)} - {_format_time(end)}"
                    ui.label(time_str).classes("text-xs").style(f"color: {c.text_secondary};")

                    # Text with highlighted term
                    text = match.text
                    highlighted = _highlight_term(text, word)
                    ui.html(
                        f'<span style="color: {c.text_primary};">{highlighted}</span>'
                    ).classes("text-sm")

                # Practice button
                ui.button(
                    _t("practice"),
                    on_click=lambda cid=course_id, idx=match.segment_idx: ui.navigate.to(
                        f"/practice/{cid}?segment={idx}&{query[1:]}"
                    ),
                ).props("outline dense")

        def render_recommendations_tab():
            """Render recommended segments for learning."""
            # Get recommendations
            recommendations = search_service.recommend_segments(word, max_segments=5)

            if not recommendations:
                ui.label(_t("no_recommendations")).style(f"color: {c.text_secondary};")
                return

            for rec in recommendations:
                with ui.element("div").classes("course-hit-card"):
                    with ui.element("div").classes("segment-item"):
                        with ui.column().classes("flex-1 gap-2"):
                            # Course title
                            ui.label(rec.course_title).classes("font-medium").style(
                                f"color: {c.text_primary};"
                            )

                            # Text with highlighted term
                            highlighted = _highlight_term(rec.text, word)
                            ui.html(
                                f'<span style="color: {c.text_secondary};">{highlighted}</span>'
                            ).classes("text-sm")

                            # Metadata
                            with ui.row().classes("gap-4 mt-1"):
                                time_str = f"{_format_time(rec.start_time)} - {_format_time(rec.end_time)}"
                                ui.label(time_str).classes("text-xs").style(
                                    f"color: {c.text_secondary};"
                                )

                                if rec.difficulty is not None:
                                    diff_str = f"{_t('difficulty')}: {rec.difficulty:.0%}"
                                    ui.label(diff_str).classes("text-xs").style(
                                        f"color: {c.text_secondary};"
                                    )

                        # Practice button
                        ui.button(
                            _t("practice"),
                            on_click=lambda cid=rec.course_id, idx=rec.segment_idx: ui.navigate.to(
                                f"/practice/{cid}?segment={idx}&{query[1:]}"
                            ),
                        ).props("color=primary")

        # Initial render
        render_content()


def _format_time(seconds: float) -> str:
    """Format seconds as MM:SS."""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}:{secs:02d}"


def _highlight_term(text: str, term: str) -> str:
    """Highlight occurrences of term in text."""
    import re

    if not term:
        return text

    # Escape HTML
    import html
    text = html.escape(text)

    # Case-insensitive replace with highlight
    pattern = re.compile(re.escape(term), re.IGNORECASE)

    def replacer(match):
        return f'<span class="highlight-term">{match.group(0)}</span>'

    return pattern.sub(replacer, text)


def _get_type_name(type_val: int, lang_key: str) -> str:
    """Get type name for word type."""
    types = {
        0: {"zh": "其他", "en": "Other"},
        1: {"zh": "小学", "en": "Elementary"},
        2: {"zh": "初中", "en": "Middle School"},
        3: {"zh": "高中", "en": "High School"},
        4: {"zh": "四级", "en": "CET-4"},
        5: {"zh": "六级", "en": "CET-6"},
        6: {"zh": "考研", "en": "Graduate"},
        7: {"zh": "托福", "en": "TOEFL"},
        8: {"zh": "雅思", "en": "IELTS"},
        9: {"zh": "GRE", "en": "GRE"},
    }
    return types.get(type_val, {}).get(lang_key, "")


def _fallback_text(key: str, lang: str) -> str:
    """Fallback translations for word detail page."""
    translations = {
        "zh": {
            "word_not_in_dict": "词典中未收录",
            "occurrences": "次出现",
            "courses": "个课程",
            "high_freq_word": "高频词",
            "no_occurrences": "在媒体库中未找到此单词",
            "by_course": "按课程",
            "recommendations": "推荐片段",
            "matches": "处匹配",
            "practice": "跟读",
            "no_recommendations": "暂无推荐片段",
            "difficulty": "难度",
        },
        "en": {
            "word_not_in_dict": "Not in dictionary",
            "occurrences": "occurrences",
            "courses": "courses",
            "high_freq_word": "High Frequency",
            "no_occurrences": "No occurrences found in library",
            "by_course": "By Course",
            "recommendations": "Recommendations",
            "matches": "matches",
            "practice": "Practice",
            "no_recommendations": "No recommendations available",
            "difficulty": "Difficulty",
        },
    }
    lang_key = "zh" if lang.startswith("zh") else "en"
    return translations.get(lang_key, translations["en"]).get(key, key)

