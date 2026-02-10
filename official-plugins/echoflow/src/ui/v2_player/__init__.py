"""
v2_player UI module - Smart Player v2 pages and components.
"""

from .player_page import render_v2_player_page
from .chapter_strip import (
    render_chapter_strip,
    build_chapter_strip_html,
    get_chapter_at_time,
    get_chapter_progress,
)
from .overlay import (
    build_explain_card_html,
    build_qa_card_html,
    build_widget_html,
    widget_from_dict,
)

__all__ = [
    "render_v2_player_page",
    "render_chapter_strip",
    "build_chapter_strip_html",
    "get_chapter_at_time",
    "get_chapter_progress",
    "build_explain_card_html",
    "build_qa_card_html",
    "build_widget_html",
    "widget_from_dict",
]

