"""
v2_player chapter_strip - ChapterStrip UI component.

This module provides a reusable ChapterStrip component for video chapter navigation.
The actual rendering is handled by JavaScript in player_page.py, but this module
provides Python-side utilities and alternative rendering options.

Usage:
    from ui.v2_player.chapter_strip import render_chapter_strip
    
    render_chapter_strip(chapters, theme)
"""

from __future__ import annotations

from typing import Any, List, Optional

from nicegui import ui

from storage.v2_player import ChapterInfo


def render_chapter_strip(
    chapters: List[ChapterInfo],
    theme: Any,
    *,
    duration: float = 0.0,
    on_seek: Optional[str] = None,
) -> None:
    """
    Render a ChapterStrip component using NiceGUI.
    
    Note: For best performance and interactivity, the main player uses
    JavaScript-based rendering in player_page.py. This function provides
    a Python-based alternative for static contexts.
    
    Args:
        chapters: List of ChapterInfo objects
        theme: Theme object with colors
        duration: Total video duration in seconds
        on_seek: JavaScript function name to call on chapter click
    """
    if not chapters:
        return
    
    # Calculate total duration from chapters if not provided
    if duration <= 0 and chapters:
        duration = max(ch.end_time for ch in chapters)
    
    if duration <= 0:
        return
    
    with ui.element("div").classes("v2-chapter-strip"):
        for chapter in chapters:
            width = ((chapter.end_time - chapter.start_time) / duration) * 100
            if width <= 0:
                continue
            
            with ui.element("div").classes("v2-chapter-item").style(
                f"flex: {width:.2f};"
            ):
                label_text = chapter.title or f"Chapter {chapter.chapter_id}"
                if on_seek:
                    ui.label(label_text).classes("v2-chapter-label").props(
                        f'onclick="{on_seek}({chapter.chapter_id})"'
                    )
                else:
                    ui.label(label_text).classes("v2-chapter-label")


def build_chapter_strip_html(
    chapters: List[ChapterInfo],
    *,
    duration: float = 0.0,
    controller_name: str = "v2PlayerController",
) -> str:
    """
    Build HTML for a ChapterStrip component.
    
    Args:
        chapters: List of ChapterInfo objects
        duration: Total video duration in seconds
        controller_name: JavaScript controller name for click handling
    
    Returns:
        HTML string for the chapter strip
    """
    if not chapters:
        return '<div class="v2-chapter-strip"></div>'
    
    # Calculate total duration from chapters if not provided
    if duration <= 0 and chapters:
        duration = max(ch.end_time for ch in chapters)
    
    if duration <= 0:
        return '<div class="v2-chapter-strip"></div>'
    
    html_parts = ['<div id="v2-chapter-strip" class="v2-chapter-strip">']
    
    for chapter in chapters:
        width = ((chapter.end_time - chapter.start_time) / duration) * 100
        if width <= 0:
            continue
        
        title = chapter.title or f"Chapter {chapter.chapter_id}"
        # Escape HTML
        title_escaped = (
            title.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
        )
        
        html_parts.append(
            f'<div class="v2-chapter-item" style="flex: {width:.2f};" '
            f'onclick="{controller_name}.seekToChapter({chapter.chapter_id})">'
            f'<span class="v2-chapter-label">{title_escaped}</span>'
            f'</div>'
        )
    
    html_parts.append('</div>')
    
    return "".join(html_parts)


def get_chapter_at_time(chapters: List[ChapterInfo], time: float) -> Optional[ChapterInfo]:
    """
    Get the chapter at a given time.
    
    Args:
        chapters: List of ChapterInfo objects
        time: Current time in seconds
    
    Returns:
        ChapterInfo at the given time, or None if not found
    """
    if not chapters:
        return None
    
    for chapter in reversed(chapters):
        if time >= chapter.start_time:
            return chapter
    
    return chapters[0] if chapters else None


def get_chapter_progress(chapter: ChapterInfo, time: float) -> float:
    """
    Get progress within a chapter (0.0 to 1.0).
    
    Args:
        chapter: ChapterInfo object
        time: Current time in seconds
    
    Returns:
        Progress ratio (0.0 to 1.0)
    """
    if chapter.duration <= 0:
        return 0.0
    
    elapsed = time - chapter.start_time
    return max(0.0, min(1.0, elapsed / chapter.duration))
