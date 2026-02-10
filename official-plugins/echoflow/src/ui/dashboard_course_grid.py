"""
Dashboard Course Grid - Course card rendering with cover loading and actions.
"""

from __future__ import annotations

import asyncio
import json
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Callable, List, Optional
from urllib.parse import urlparse

from nicegui import ui, app

from dawnchat_sdk import host

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase
    from course.models import Course

# Global caches
_STATIC_ROUTES: set[str] = set()
_COVER_SRC_CACHE: dict[str, str] = {}
_COVER_FETCH_INFLIGHT: set[str] = set()
_COVER_FAILURE_CACHE: dict[str, float] = {}


def mount_static(route: str, directory: str) -> None:
    """Mount a static file route if not already mounted."""
    if route in _STATIC_ROUTES:
        return
    try:
        app.add_static_files(route, directory)
    except Exception:
        pass
    _STATIC_ROUTES.add(route)


def get_cover_src_for_course(course) -> Optional[str]:
    """Get cover source URL for a course if available locally."""
    cover_path_str = getattr(course, "cover_path", None)
    if not cover_path_str:
        return None
    try:
        cover_path = Path(str(cover_path_str))
        if not cover_path.exists():
            return None
        cover_route = f"/echoflow-cover/{course.id}"
        mount_static(cover_route, str(cover_path.parent))
        return f"{cover_route}/{cover_path.name}"
    except Exception:
        return None


def is_audio_only_course(course) -> bool:
    """Check if course is audio-only (no video, no source URL)."""
    try:
        return (
            bool(getattr(course, "audio_path", None))
            and not bool(getattr(course, "source_url", None))
            and not bool(getattr(course, "video_path", None))
        )
    except Exception:
        return False


async def ensure_local_video_cover(course, course_db: "CourseDatabase") -> Optional[str]:
    """Extract and save cover from local video file."""
    cover_src = get_cover_src_for_course(course)
    if cover_src:
        return cover_src
    if getattr(course, "source_url", None):
        return None
    video_path_str = str(getattr(course, "video_path", None) or "").strip()
    if not video_path_str:
        return None
    try:
        vp = Path(video_path_str)
    except Exception:
        return None
    if not vp.exists() or not vp.is_file():
        return None

    plugin_dir = Path(course_db.db_path).parent
    cover_dir = plugin_dir / "covers"
    cover_dir.mkdir(parents=True, exist_ok=True)
    cover_path = cover_dir / f"{course.id}.jpg"

    if cover_path.exists() and cover_path.stat().st_size > 0:
        course.cover_path = str(cover_path)
        course_db.save(course)
        cover_route = f"/echoflow-cover/{course.id}"
        mount_static(cover_route, str(cover_path.parent))
        return f"{cover_route}/{cover_path.name}"

    duration_s = None
    try:
        info = await host.tools.call("dawnchat.media.get_info", arguments={"media_path": str(vp)})
        if isinstance(info, dict) and int(info.get("code") or 0) == 200:
            duration_s = (info.get("data") or {}).get("duration")
    except Exception:
        duration_s = None
    try:
        d = float(duration_s) if duration_s is not None else 0.0
    except Exception:
        d = 0.0
    ts = 0.1 if d <= 0 else max(0.1, min(1.0, d * 0.1))

    for t in (ts, 0.0):
        try:
            res = await host.tools.call(
                "dawnchat.media.extract_frame_at",
                arguments={
                    "video_path": str(vp),
                    "output_path": str(cover_path),
                    "timestamp": float(t),
                    "quality": 2,
                },
            )
            if isinstance(res, dict) and int(res.get("code") or 0) == 200:
                if cover_path.exists() and cover_path.stat().st_size > 0:
                    course.cover_path = str(cover_path)
                    course_db.save(course)
                    cover_route = f"/echoflow-cover/{course.id}"
                    mount_static(cover_route, str(cover_path.parent))
                    return f"{cover_route}/{cover_path.name}"
        except Exception:
            continue
    return None


async def fetch_cover_src(course, course_db: "CourseDatabase") -> Optional[str]:
    """Fetch cover from remote URL (bilibili/YouTube thumbnails)."""
    if not getattr(course, "source_url", None):
        return None

    cached = _COVER_SRC_CACHE.get(course.source_url)
    if cached:
        return cached

    last_fail = _COVER_FAILURE_CACHE.get(course.source_url)
    if last_fail is not None and (time.monotonic() - last_fail) < 300:
        return None

    if course.source_url in _COVER_FETCH_INFLIGHT:
        return None

    async def _ensure_local_cover(thumbnail_url: str) -> Optional[str]:
        try:
            plugin_dir = Path(course_db.db_path).parent
            cover_dir = plugin_dir / "covers"
            cover_dir.mkdir(parents=True, exist_ok=True)
            cover_path = cover_dir / f"{course.id}.jpg"

            if cover_path.exists() and cover_path.stat().st_size > 0:
                course.cover_path = str(cover_path)
                course_db.save(course)
                cover_route = f"/echoflow-cover/{course.id}"
                mount_static(cover_route, str(cover_path.parent))
                return f"{cover_route}/{cover_path.name}"

            referer = None
            try:
                parsed = urlparse(course.source_url)
                host_name = (parsed.netloc or "").lower()
                if "bilibili.com" in host_name:
                    referer = "https://www.bilibili.com/"
            except Exception:
                referer = None

            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
            if referer:
                headers["Referer"] = referer

            req = urllib.request.Request(thumbnail_url, headers=headers)

            def do_fetch() -> None:
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = resp.read()
                cover_path.write_bytes(data)

            await asyncio.to_thread(do_fetch)

            if cover_path.exists() and cover_path.stat().st_size > 0:
                course.cover_path = str(cover_path)
                course_db.save(course)
                cover_route = f"/echoflow-cover/{course.id}"
                mount_static(cover_route, str(cover_path.parent))
                return f"{cover_route}/{cover_path.name}"
            return None
        except Exception:
            return None

    _COVER_FETCH_INFLIGHT.add(course.source_url)
    try:
        cookies_path = None
        cookie_info = await host.browser.get_cookie_info()
        if cookie_info.get("code") == 200 and cookie_info.get("data", {}).get("exists"):
            cookies_path = cookie_info["data"]["path"]

        try:
            info_result = await asyncio.wait_for(
                host.tools.call(
                    "dawnchat.media.get_video_info",
                    arguments={"url": course.source_url, "cookies_path": cookies_path},
                ),
                timeout=12.0,
            )
        except asyncio.TimeoutError:
            _COVER_FAILURE_CACHE[course.source_url] = time.monotonic()
            return None
        except Exception:
            _COVER_FAILURE_CACHE[course.source_url] = time.monotonic()
            return None
        if info_result.get("code") == 200:
            thumbnail_url = (info_result.get("data") or {}).get("thumbnail")
            if thumbnail_url:
                local_src = await _ensure_local_cover(thumbnail_url)
                if local_src:
                    _COVER_SRC_CACHE[course.source_url] = local_src
                    return local_src
                _COVER_SRC_CACHE[course.source_url] = thumbnail_url
                return thumbnail_url

        _COVER_FAILURE_CACHE[course.source_url] = time.monotonic()
        return None
    finally:
        _COVER_FETCH_INFLIGHT.discard(course.source_url)


async def render_course_grid(
    container,
    courses: List["Course"],
    course_db: "CourseDatabase",
    theme,
    lang: str,
    title: str = "",
):
    """
    Render the course grid with given courses.
    
    Args:
        container: Parent container element
        courses: List of courses to render
        course_db: Course database instance
        theme: UI theme object
        lang: Language code
        title: Optional title to display above the grid
    """
    c = theme.colors
    is_zh = lang.startswith("zh")
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    query = f"?theme={theme_mode}&lang={lang}"

    def _fallback(key: str) -> str:
        fallbacks = {
            "no_courses": "暂无课程" if is_zh else "No courses yet",
            "confirm_delete": "确认删除该课程？" if is_zh else "Delete this course?",
            "cancel": "取消" if is_zh else "Cancel",
            "delete": "删除" if is_zh else "Delete",
            "reimport": "重新导入" if is_zh else "Reimport",
            "continue_practice": "继续练习" if is_zh else "Continue",
            "start_practice": "开始练习" if is_zh else "Start",
            "sentences": "句" if is_zh else "sentences",
        }
        return fallbacks.get(key, key)

    # Delete dialog state
    _delete_state = {"course": None}

    with ui.dialog() as _delete_dialog, ui.card().classes("w-[420px]"):
        _delete_title = ui.label("").classes("text-base font-semibold").style(f"color:{c.text_primary};")
        ui.label(_fallback("confirm_delete")).style(f"color:{c.text_secondary};")
        with ui.row().classes("w-full justify-end gap-2 mt-4"):
            ui.button(_fallback("cancel"), on_click=_delete_dialog.close).props("flat")

            async def _do_delete() -> None:
                course = _delete_state.get("course")
                if course is None:
                    _delete_dialog.close()
                    return
                try:
                    audio_path = getattr(course, "audio_path", None)
                    subtitle_path = getattr(course, "subtitle_path", None)
                    cover_path = getattr(course, "cover_path", None)
                    course_db.delete(course.id)
                    for p in [audio_path, subtitle_path, cover_path]:
                        if p:
                            try:
                                Path(p).unlink(missing_ok=True)
                            except Exception:
                                pass
                    await ui.run_javascript("setTimeout(() => location.reload(), 100);")
                finally:
                    _delete_dialog.close()

            ui.button(_fallback("delete"), on_click=_do_delete).props("color=negative")

    def _open_delete_dialog(course) -> None:
        _delete_state["course"] = course
        _delete_title.text = f"{_fallback('delete')}: {course.title}"
        _delete_title.update()
        _delete_dialog.open()

    async def _reimport_course(course) -> None:
        url = getattr(course, "source_url", None)
        if not url:
            ui.notify("缺少原始链接" if is_zh else "Missing source URL", type="warning")
            return

        from ui.import_modal import render_import_modal

        async def on_imported(new_course) -> None:
            new_course.id = course.id
            new_course.pass_threshold = getattr(course, "pass_threshold", new_course.pass_threshold)
            new_course.current_segment_index = 0
            new_course.created_at = getattr(course, "created_at", new_course.created_at)
            new_course.updated_at = datetime.now().isoformat()
            course_db.save(new_course)
            await asyncio.sleep(0.05)
            await ui.run_javascript("setTimeout(() => location.reload(), 200);")

        await render_import_modal(
            course_db,
            theme,
            lang=lang,
            preset_url=url,
            preset_download_video=bool(getattr(course, "video_path", None)),
            preset_difficulty="medium",
            title_text=_fallback("reimport"),
            primary_button_text=_fallback("reimport"),
            reuse_course=course,
            on_imported=on_imported,
        )

    # Render content
    container.clear()
    with container:
        # Title
        if title:
            ui.label(title).classes("text-lg font-semibold mb-4").style(f"color: {c.text_primary};")

        if not courses:
            with ui.column().classes("w-full items-center py-12"):
                ui.label("📚").classes("text-6xl mb-4")
                ui.label(_fallback("no_courses")).style(f"color: {c.text_secondary};")
        else:
            with ui.element("div").classes("course-grid"):
                for course in courses:
                    cover_src = get_cover_src_for_course(course)
                    with ui.element("div").classes("course-card"):
                        with ui.element("div").classes("course-cover"):
                            img_id = f"echoflow-card-cover-{course.id}"
                            if cover_src:
                                ui.html(f'<img id="{img_id}" src="{cover_src}" />', sanitize=False)
                            else:
                                ui.html(
                                    f'<img id="{img_id}" style="display:none;" />',
                                    sanitize=False,
                                )
                                ui.element("div").classes("absolute inset-0").style(
                                    f"background: linear-gradient(135deg, {c.bg_secondary}, {c.bg_primary});"
                                )
                                if is_audio_only_course(course):
                                    ui.html(
                                        f"""
                                        <div class="absolute inset-0 flex items-center justify-center" style="color:{c.text_secondary};">
                                          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <path d="M11 5 6 9H3v6h3l5 4V5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                                            <path d="M15 9.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                                            <path d="M17 7a7 7 0 0 1 0 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                                          </svg>
                                        </div>
                                        """,
                                        sanitize=False,
                                    )
                                elif getattr(course, "source_url", None):

                                    async def _load_cover_for_card(c=course, el_id=img_id):
                                        try:
                                            src = await fetch_cover_src(c, course_db)
                                        except Exception:
                                            return
                                        if not src:
                                            return
                                        try:
                                            await ui.context.client.run_javascript(
                                                f"""
                                                (function() {{
                                                    const img = document.getElementById({json.dumps(el_id)});
                                                    if (!img) return;
                                                    img.src = {json.dumps(src)};
                                                    img.style.display = 'block';
                                                }})();
                                                """,
                                                timeout=5.0,
                                            )
                                        except Exception:
                                            pass

                                    asyncio.create_task(_load_cover_for_card())
                                else:

                                    async def _load_local_cover_for_card(c=course, el_id=img_id):
                                        try:
                                            src = await ensure_local_video_cover(c, course_db)
                                        except Exception:
                                            return
                                        if not src:
                                            return
                                        try:
                                            await ui.context.client.run_javascript(
                                                f"""
                                                (function() {{
                                                    const img = document.getElementById({json.dumps(el_id)});
                                                    if (!img) return;
                                                    img.src = {json.dumps(src)};
                                                    img.style.display = 'block';
                                                }})();
                                                """,
                                                timeout=5.0,
                                            )
                                        except Exception:
                                            pass

                                    if getattr(course, "video_path", None):
                                        asyncio.create_task(_load_local_cover_for_card())
                        with ui.element("div").classes("course-body"):
                            with ui.row().classes("w-full items-start justify-between gap-2"):
                                ui.label(course.title).classes("course-title")

                                with ui.button(icon="more_vert").props("flat round dense"):
                                    with ui.menu() as _more_menu:

                                        async def _on_delete(c=course, m=_more_menu) -> None:
                                            try:
                                                m.close()
                                            except Exception:
                                                pass
                                            await asyncio.sleep(0.05)
                                            _open_delete_dialog(c)

                                        ui.menu_item(_fallback("delete"), on_click=_on_delete)

                                        async def _on_reimport(c=course, m=_more_menu) -> None:
                                            try:
                                                m.close()
                                            except Exception:
                                                pass
                                            await asyncio.sleep(0.05)
                                            await _reimport_course(c)

                                        ui.menu_item(_fallback("reimport"), on_click=_on_reimport)

                            with ui.element("div").classes("course-meta"):
                                ui.label(f"{course.passed_segments}/{course.total_segments} {_fallback('sentences')}")
                                if course.progress_percent > 0:
                                    ui.label(f"⭐ {course.average_score:.0f}").style(f"color:{c.warning};")
                                else:
                                    ui.label("")

                            with ui.element("div").classes("progress-bar"):
                                ui.element("div").classes("progress-fill").style(
                                    f"width: {course.progress_percent}%;"
                                )

                            with ui.row().classes("w-full items-center justify-between"):
                                btn_text = (
                                    _fallback("continue_practice")
                                    if course.progress_percent > 0
                                    else _fallback("start_practice")
                                )
                                course_id = course.id
                                ui.button(
                                    btn_text,
                                    on_click=lambda _=None, cid=course_id: ui.navigate.to(f"/practice/{cid}{query}"),
                                ).props("color=primary")
                                ui.button(
                                    "Smart Player",
                                    on_click=lambda _=None, cid=course_id: ui.navigate.to(f"/v2/player/{cid}{query}"),
                                ).props("outline color=secondary")
