"""
Words Page - Browse and search words from the lexicon.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any, Optional

from nicegui import ui

from i18n import i18n

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase

logger = logging.getLogger("echoflow.words_page")


# Word type mappings (based on common_words_rows.csv)
WORD_TYPES = {
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


async def render_words_page(
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
):
    """
    Render the words browsing page (standalone page with header).

    Features:
    - Search words
    - Filter by word type (vocabulary level)
    - Sort by frequency
    - Click to view word detail
    """
    c = theme.colors
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    query = f"?theme={theme_mode}&lang={lang}"

    def _t(key: str) -> str:
        val = i18n.t(key, lang)
        return val if val != key else _fallback_text(key, lang)

    # Add styles
    _add_words_styles(c)

    # Header
    with ui.row().classes("w-full items-center justify-between p-4").style(
        f"background-color: {c.bg_secondary}; border-bottom: 1px solid {c.border};"
    ):
        with ui.row().classes("items-center gap-4"):
            ui.button(icon="arrow_back", on_click=lambda: ui.navigate.to(f"/{query}")).props(
                "flat round"
            )
            ui.label(_t("word_list")).classes("text-xl font-bold").style(
                f"color: {c.text_primary};"
            )

    # Main container
    main_container = ui.element("div").classes("words-container")

    # Render content inside container
    await render_words_content(main_container, course_db, theme, lang)


async def render_words_content(
    container,
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
):
    """
    Render the words browsing content inside a given container.
    
    This is the embeddable version without a header, suitable for use
    inside the Dashboard's right content area.

    Args:
        container: NiceGUI container element to render into
        course_db: Course database instance
        theme: UI theme object
        lang: Language code
    """
    from lexicon.lexicon_db import LexiconRepo, ensure_lexicon_sqlite

    c = theme.colors
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    query = f"?theme={theme_mode}&lang={lang}"
    lang_key = "zh" if lang.startswith("zh") else "en"

    def _t(key: str) -> str:
        val = i18n.t(key, lang)
        return val if val != key else _fallback_text(key, lang)

    # Initialize lexicon
    db_path = Path(course_db.db_path)
    data_dir = db_path.parent
    plugin_root = Path(__file__).resolve().parents[2]

    lexicon_path = ensure_lexicon_sqlite(data_dir=data_dir, plugin_root=plugin_root)
    lexicon_repo = LexiconRepo(lexicon_path)

    # State
    state = {
        "search": "",
        "type_filter": None,  # None = all
        "sort_by": "frq_asc",  # frq_asc (most common first), frq_desc, alpha
        "page": 0,
        "page_size": 50,
        "words": [],
        "total": 0,
    }

    # Add styles (may be called multiple times, but CSS handles duplicates)
    _add_words_styles(c)

    with container:
        # Search and filters
        with ui.row().classes("w-full items-center gap-2 mb-4"):
            search_input = ui.input(
                placeholder=_t("search_word"),
            ).classes("w-full max-w-[420px]").props("outlined dense")

            async def apply_search(_=None):
                state["search"] = str(search_input.value or "").strip()
                state["page"] = 0
                await load_words()

            search_input.on("keyup.enter", lambda _: asyncio.create_task(apply_search()))

            ui.button(icon="search", on_click=lambda: asyncio.create_task(apply_search())).props(
                "flat round"
            )

        # Type filters
        with ui.row().classes("w-full flex-wrap gap-2 mb-4"):
            ui.label(_t("filter_by_type") + ":").style(f"color: {c.text_secondary};")

            filter_chips = {}

            async def set_type_filter(type_val):
                state["type_filter"] = type_val
                state["page"] = 0
                # Update chip styles
                for tv, chip in filter_chips.items():
                    if tv == type_val:
                        chip.classes(add="active")
                    else:
                        chip.classes(remove="active")
                await load_words()

            # "All" chip
            all_chip = ui.element("span").classes("filter-chip active")
            all_chip.on("click", lambda: asyncio.create_task(set_type_filter(None)))
            with all_chip:
                ui.label(_t("all"))
            filter_chips[None] = all_chip

            # Type chips
            for type_val, type_names in WORD_TYPES.items():
                if type_val == 0:
                    continue  # Skip "Other"
                chip = ui.element("span").classes("filter-chip")
                chip.on("click", lambda tv=type_val: asyncio.create_task(set_type_filter(tv)))
                with chip:
                    ui.label(type_names[lang_key])
                filter_chips[type_val] = chip

        # Sort options
        with ui.row().classes("w-full items-center gap-4 mb-4"):
            ui.label(_t("sort_by") + ":").style(f"color: {c.text_secondary};")

            sort_select = ui.select(
                options={
                    "frq_asc": _t("most_common"),
                    "frq_desc": _t("least_common"),
                    "alpha": _t("alphabetical"),
                },
                value="frq_asc",
            ).props("outlined dense").classes("min-w-[140px]")

            async def on_sort_change(e):
                new_val = str(getattr(e, "value", "") or "") or str(sort_select.value or "")
                if new_val and new_val != state["sort_by"]:
                    state["sort_by"] = new_val
                    state["page"] = 0
                    await load_words()

            sort_select.on("update:model-value", lambda e: asyncio.create_task(on_sort_change(e)))

        # Results container
        results_container = ui.column().classes("w-full gap-2 words-results-container")

        # Pagination
        with ui.row().classes("w-full items-center justify-between mt-4"):
            page_label = ui.label("").style(f"color: {c.text_secondary};")

            with ui.row().classes("gap-2"):
                prev_btn = ui.button(
                    icon="chevron_left", on_click=lambda: asyncio.create_task(go_page(-1))
                ).props("flat round")
                next_btn = ui.button(
                    icon="chevron_right", on_click=lambda: asyncio.create_task(go_page(1))
                ).props("flat round")

    async def go_page(delta: int):
        new_page = state["page"] + delta
        max_page = (state["total"] - 1) // state["page_size"]
        if 0 <= new_page <= max_page:
            state["page"] = new_page
            await load_words()

    async def load_words():
        """Load words from lexicon database."""
        import sqlite3

        # Build query
        conditions = []
        params = []

        if state["search"]:
            conditions.append("word LIKE ?")
            params.append(f"%{state['search']}%")

        if state["type_filter"] is not None:
            conditions.append("type = ?")
            params.append(state["type_filter"])

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Sort
        if state["sort_by"] == "frq_asc":
            order_clause = "COALESCE(frq, 999999) ASC"
        elif state["sort_by"] == "frq_desc":
            order_clause = "COALESCE(frq, 0) DESC"
        else:
            order_clause = "word ASC"

        offset = state["page"] * state["page_size"]

        # Query
        conn = sqlite3.connect(str(lexicon_path))
        conn.row_factory = sqlite3.Row

        try:
            # Count total
            count_row = conn.execute(
                f"SELECT COUNT(*) as cnt FROM words WHERE {where_clause}",
                params,
            ).fetchone()
            state["total"] = int(count_row["cnt"]) if count_row else 0

            # Get page
            rows = conn.execute(
                f"""
                SELECT word, tran, type, frq, exchange
                FROM words
                WHERE {where_clause}
                ORDER BY {order_clause}
                LIMIT ? OFFSET ?
                """,
                (*params, state["page_size"], offset),
            ).fetchall()

            state["words"] = [dict(r) for r in rows]
        finally:
            conn.close()

        # Update UI
        await render_words()

    async def render_words():
        results_container.clear()

        with results_container:
            if not state["words"]:
                ui.label(_t("no_words_found")).style(f"color: {c.text_secondary};")
            else:
                for w in state["words"]:
                    word = w["word"]
                    tran = w.get("tran") or ""
                    word_type = w.get("type")
                    frq = w.get("frq")

                    type_name = ""
                    if word_type is not None and word_type in WORD_TYPES:
                        type_name = WORD_TYPES[word_type][lang_key]

                    with ui.element("div").classes("word-card").on(
                        "click", lambda wd=word: ui.navigate.to(f"/word/{wd}{query}")
                    ):
                        with ui.row().classes("w-full items-center justify-between"):
                            with ui.column().classes("gap-0 flex-1 min-w-0"):
                                ui.label(word).classes("text-lg font-medium").style(
                                    f"color: {c.text_primary};"
                                )
                                # Show first line of translation
                                if tran:
                                    first_line = tran.split("\n")[0][:80]
                                    if len(first_line) < len(tran.split("\n")[0]):
                                        first_line += "..."
                                    ui.label(first_line).classes("text-sm truncate").style(
                                        f"color: {c.text_secondary};"
                                    )

                            with ui.row().classes("items-center gap-3 flex-shrink-0"):
                                if type_name:
                                    ui.label(type_name).classes("text-xs px-2 py-1 rounded").style(
                                        f"background: {c.bg_primary}; color: {c.text_secondary};"
                                    )
                                if frq is not None:
                                    freq_label = _t("freq_rank").format(rank=frq) if frq else ""
                                    ui.label(freq_label).classes("text-xs").style(
                                        f"color: {c.text_secondary};"
                                    )
                                ui.icon("chevron_right", color=c.text_secondary)

        # Update pagination
        total_pages = (state["total"] + state["page_size"] - 1) // state["page_size"]
        page_label.text = f"{state['page'] + 1} / {total_pages} ({state['total']} {_t('words')})"
        prev_btn.set_enabled(state["page"] > 0)
        next_btn.set_enabled(state["page"] < total_pages - 1)

    # Initial load
    await load_words()


def _add_words_styles(c) -> None:
    """Add CSS styles for words page."""
    ui.add_head_html(f"""
    <style>
        .words-container {{
            width: 100%;
            padding: 1.5rem;
            box-sizing: border-box;
        }}
        .words-results-container {{
            width: 100%;
        }}
        .word-card {{
            width: 100%;
            box-sizing: border-box;
            background: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 8px;
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition: all 0.2s;
        }}
        .word-card:hover {{
            border-color: {c.primary};
            transform: translateX(4px);
        }}
        .filter-chip {{
            padding: 0.25rem 0.75rem;
            border-radius: 16px;
            font-size: 0.85rem;
            cursor: pointer;
            border: 1px solid {c.border};
            background: {c.bg_secondary};
            transition: all 0.2s;
        }}
        .filter-chip:hover {{
            border-color: {c.primary};
        }}
        .filter-chip.active {{
            background: {c.primary};
            color: white;
            border-color: {c.primary};
        }}
    </style>
    """)


def _fallback_text(key: str, lang: str) -> str:
    """Fallback translations for words page."""
    translations = {
        "zh": {
            "word_list": "单词列表",
            "search_word": "搜索单词...",
            "filter_by_type": "按等级筛选",
            "all": "全部",
            "sort_by": "排序",
            "most_common": "最常见",
            "least_common": "最少见",
            "alphabetical": "字母顺序",
            "no_words_found": "未找到单词",
            "words": "个单词",
            "freq_rank": "频率 #{rank}",
        },
        "en": {
            "word_list": "Word List",
            "search_word": "Search word...",
            "filter_by_type": "Filter by level",
            "all": "All",
            "sort_by": "Sort by",
            "most_common": "Most Common",
            "least_common": "Least Common",
            "alphabetical": "Alphabetical",
            "no_words_found": "No words found",
            "words": "words",
            "freq_rank": "Freq #{rank}",
        },
    }
    lang_key = "zh" if lang.startswith("zh") else "en"
    return translations.get(lang_key, translations["en"]).get(key, key)
