"""
Dashboard UI - Finder-style two-column layout with course list and import entry.
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Optional

from nicegui import ui

from i18n import i18n

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase


async def render_dashboard(
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
    view: str = "courses",
    library_id: Optional[str] = None,
    platform: Optional[str] = None,
):
    """
    Render the main dashboard with Finder-style two-column layout.
    
    Args:
        course_db: Course database instance
        theme: UI theme object
        lang: Language code
        view: Current view ("courses", "library", "words", "platform")
        library_id: Optional library ID when view="library"
        platform: Optional platform when view="platform" (youtube, bilibili)
    """
    from storage.library_repo import LibraryRepo
    from storage.sqlite import SqliteDatabase

    c = theme.colors
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"

    def _t(key: str) -> str:
        return i18n.t(key, lang)

    # Initialize repos
    db = SqliteDatabase(str(course_db.db_path))
    library_repo = LibraryRepo(db)

    # Build query string helper
    def _query(v: str = "courses", lib_id: Optional[str] = None, plat: Optional[str] = None) -> str:
        q = f"?theme={theme_mode}&lang={lang}&view={v}"
        if lib_id:
            q += f"&id={lib_id}"
        if plat:
            q += f"&platform={plat}"
        return q

    # Add CSS styles
    _add_dashboard_styles(c)

    # State for library expansion
    sidebar_state = {"libraries_expanded": True}
    
    # Store client reference for background tasks
    client = ui.context.client

    # --- Sidebar Navigation ---
    def nav_to(v: str, lib_id: Optional[str] = None, plat: Optional[str] = None) -> None:
        ui.navigate.to(f"/{_query(v, lib_id, plat)}")

    async def show_import_modal(mode: str = "url") -> None:
        # Use client context to allow UI creation from async task
        with client.content:
            if mode == "library":
                from ui.library_import_modal import render_library_import_modal
                await render_library_import_modal(
                    course_db,
                    theme,
                    lang=lang,
                    on_complete=lambda lib_id: nav_to("library", lib_id),
                )
            else:
                from ui.import_modal import render_import_modal
                await render_import_modal(course_db, theme, lang=lang)

    # Main layout
    with ui.element("div").classes("dashboard-layout"):
        # --- Left Sidebar ---
        with ui.element("div").classes("dashboard-sidebar"):
            # Header with app title
            with ui.row().classes("items-center gap-2 p-4").style(
                f"border-bottom: 1px solid {c.border};"
            ):
                app_title = _t("app_title")
                ui.label(f"🎤 {app_title if app_title != 'app_title' else 'EchoFlow'}").classes(
                    "text-lg font-bold"
                ).style(f"color: {c.text_primary};")

            # Sources section
            with ui.element("div").classes("sidebar-section"):
                ui.label(_t("sources")).classes("sidebar-section-title")

                # All courses
                all_active = view == "courses" and not library_id and not platform
                with ui.element("div").classes(f"nav-item {'active' if all_active else ''}").on(
                    "click", lambda: nav_to("courses")
                ):
                    ui.icon("video_library", size="sm")
                    ui.label(_t("all_courses"))

                # bilibili
                bilibili_active = view == "platform" and platform == "bilibili"
                with ui.element("div").classes(f"nav-item {'active' if bilibili_active else ''}").on(
                    "click", lambda: nav_to("platform", plat="bilibili")
                ):
                    ui.icon("play_circle", size="sm")
                    ui.label(_t("bilibili"))

                # YouTube
                youtube_active = view == "platform" and platform == "youtube"
                with ui.element("div").classes(f"nav-item {'active' if youtube_active else ''}").on(
                    "click", lambda: nav_to("platform", plat="youtube")
                ):
                    ui.icon("smart_display", size="sm")
                    ui.label(_t("youtube"))

                # Local libraries (expandable)
                libraries = library_repo.list_all()

                with ui.element("div").classes("nav-item library-expandable").on(
                    "click", lambda: toggle_libraries()
                ):
                    ui.icon("folder", size="sm")
                    ui.label(_t("local_library"))
                    expand_icon = ui.icon(
                        "expand_more" if sidebar_state["libraries_expanded"] else "chevron_right",
                        size="xs",
                    ).style(f"color: {c.text_disabled};")

                # Library children container
                with ui.element("div").classes("library-children") as lib_container:
                    for lib in libraries:
                        lib_active = view == "library" and library_id == lib.id
                        course_count = library_repo.get_courses_count(lib.id)
                        with ui.element("div").classes(
                            f"nav-item nav-item-nested {'active' if lib_active else ''}"
                        ).on("click", lambda lid=lib.id: nav_to("library", lid)):
                            ui.icon("folder_open", size="xs")
                            ui.label(lib.name).classes("flex-1 truncate")
                            if course_count > 0:
                                ui.label(str(course_count)).classes("nav-badge")

                    # Add library button
                    with ui.element("div").classes("nav-item nav-item-nested").on(
                        "click", lambda: asyncio.create_task(show_import_modal("library"))
                    ):
                        ui.icon("add", size="xs").style(f"color: {c.primary};")
                        ui.label(_t("add_library")).style(f"color: {c.primary};")

                def toggle_libraries() -> None:
                    sidebar_state["libraries_expanded"] = not sidebar_state["libraries_expanded"]
                    expand_icon.name = (
                        "expand_more" if sidebar_state["libraries_expanded"] else "chevron_right"
                    )
                    lib_container.set_visibility(sidebar_state["libraries_expanded"])

                lib_container.set_visibility(sidebar_state["libraries_expanded"])

            # Learning section
            with ui.element("div").classes("sidebar-section"):
                ui.label(_t("learning")).classes("sidebar-section-title")

                words_active = view == "words"
                with ui.element("div").classes(f"nav-item {'active' if words_active else ''}").on(
                    "click", lambda: nav_to("words")
                ):
                    ui.icon("spellcheck", size="sm")
                    ui.label(_t("word_lookup"))

            # Spacer
            ui.element("div").classes("flex-1")

            # Bottom actions area
            with ui.element("div").classes("sidebar-bottom-actions"):
                # Import button with custom dropdown
                with ui.element("div").classes("import-button-wrapper"):
                    import_btn = ui.button(
                        _t("import"), icon="add"
                    ).props("color=primary unelevated").classes("w-full import-btn")
                    
                    # Custom dropdown menu that appears above the button
                    dropdown = ui.element("div").classes("import-dropdown")
                    dropdown.visible = False
                    
                    with dropdown:
                        with ui.element("div").classes("import-dropdown-item").on(
                            "click", lambda: (setattr(dropdown, 'visible', False), asyncio.create_task(show_import_modal("url")))
                        ):
                            ui.icon("link", size="sm")
                            ui.label(_t("import_url"))
                        
                        with ui.element("div").classes("import-dropdown-item").on(
                            "click", lambda: (setattr(dropdown, 'visible', False), asyncio.create_task(show_import_modal("local")))
                        ):
                            ui.icon("insert_drive_file", size="sm")
                            ui.label(_t("import_local"))
                        
                        with ui.element("div").classes("import-dropdown-item").on(
                            "click", lambda: (setattr(dropdown, 'visible', False), asyncio.create_task(show_import_modal("library")))
                        ):
                            ui.icon("folder", size="sm")
                            ui.label(_t("import_library"))
                    
                    def toggle_dropdown():
                        dropdown.visible = not dropdown.visible
                    
                    import_btn.on("click", toggle_dropdown)
                
                # Settings button
                settings_active = view == "settings"
                with ui.element("div").classes(f"nav-item settings-nav {'active' if settings_active else ''}").on(
                    "click", lambda: nav_to("settings")
                ):
                    ui.icon("settings", size="sm")
                    ui.label(_t("settings"))

        # --- Right Content Area ---
        content_container = ui.element("div").classes("dashboard-content")

        with content_container:
            if view == "words":
                from ui.words_page import render_words_content
                await render_words_content(content_container, course_db, theme, lang)
            elif view == "settings":
                from ui.settings_page import render_settings_content
                await render_settings_content(content_container, course_db, theme, lang)
            elif view == "library" and library_id:
                await _render_library_courses(content_container, course_db, library_repo, library_id, theme, lang)
            elif view == "platform" and platform:
                await _render_platform_courses(content_container, course_db, platform, theme, lang, _t)
            else:
                await _render_all_courses(content_container, course_db, theme, lang, _t)


async def _render_all_courses(container, course_db, theme, lang, _t):
    """Render all courses grid."""
    from ui.dashboard_course_grid import render_course_grid
    courses = course_db.list_all()
    await render_course_grid(container, courses, course_db, theme, lang, title=_t("my_courses"))


async def _render_library_courses(container, course_db, library_repo, library_id, theme, lang):
    """Render courses from a specific library."""
    from ui.dashboard_course_grid import render_course_grid
    is_zh = lang.startswith("zh")

    library = library_repo.get(library_id)
    if not library:
        with container:
            c = theme.colors
            ui.label("Library not found" if not is_zh else "媒体库未找到").style(f"color: {c.text_secondary};")
        return

    courses = course_db.list_by_library(library_id)
    await render_course_grid(container, courses, course_db, theme, lang, title=library.name)


async def _render_platform_courses(container, course_db, platform, theme, lang, _t):
    """Render courses from a specific platform (bilibili, youtube)."""
    from ui.dashboard_course_grid import render_course_grid

    courses = course_db.list_by_platform(platform)
    title = _t(platform) if platform in ("bilibili", "youtube") else platform.capitalize()
    if title == platform:
        title = platform.capitalize()
    await render_course_grid(container, courses, course_db, theme, lang, title=title)


def _add_dashboard_styles(c) -> None:
    """Add CSS styles for the dashboard layout."""
    ui.add_head_html(f"""
    <style>
        body {{
            background-color: {c.bg_primary} !important;
        }}
        .nicegui-content {{
            max-width: none !important;
            width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
        }}
        .q-page {{
            padding: 0 !important;
        }}
        .dashboard-layout {{
            display: flex;
            height: 100vh;
            overflow: hidden;
            width: 100vw;
        }}
        .dashboard-sidebar {{
            width: 240px;
            flex-shrink: 0;
            background: {c.bg_secondary};
            border-right: 1px solid {c.border};
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }}
        .dashboard-content {{
            flex: 1;
            min-width: 0;
            overflow-y: auto;
            padding: 1.5rem;
            box-sizing: border-box;
        }}
        .sidebar-section {{
            padding: 0.75rem 1rem;
        }}
        .sidebar-section-title {{
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: {c.text_disabled};
            margin-bottom: 0.5rem;
        }}
        .nav-item {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            cursor: pointer;
            color: {c.text_secondary};
            transition: all 0.15s;
        }}
        .nav-item:hover {{
            background: {c.bg_primary};
            color: {c.text_primary};
        }}
        .nav-item.active {{
            background: {c.primary}22;
            color: {c.primary};
        }}
        .nav-item-nested {{
            padding-left: 1.5rem;
        }}
        .nav-badge {{
            font-size: 0.7rem;
            padding: 0.1rem 0.4rem;
            border-radius: 10px;
            background: {c.bg_primary};
            color: {c.text_secondary};
        }}
        
        /* Bottom actions area */
        .sidebar-bottom-actions {{
            padding: 0.75rem 1rem;
            border-top: 1px solid {c.border};
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }}
        .import-button-wrapper {{
            position: relative;
        }}
        .import-btn {{
            justify-content: center;
        }}
        .import-dropdown {{
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            margin-bottom: 4px;
            background: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 8px;
            box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            z-index: 100;
        }}
        .import-dropdown-item {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            cursor: pointer;
            color: {c.text_secondary};
            transition: all 0.15s;
        }}
        .import-dropdown-item:hover {{
            background: {c.bg_primary};
            color: {c.text_primary};
        }}
        .import-dropdown-item:not(:last-child) {{
            border-bottom: 1px solid {c.border};
        }}
        .settings-nav {{
            margin-top: 0.25rem;
        }}
        
        .course-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1rem;
        }}
        .course-card {{
            background-color: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 12px;
            transition: all 0.2s;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }}
        .course-card:hover {{
            border-color: {c.primary};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }}
        .course-cover {{
            width: 100%;
            aspect-ratio: 16 / 9;
            background: {c.bg_primary};
            border-bottom: 1px solid {c.border};
            overflow: hidden;
            position: relative;
        }}
        .course-cover img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }}
        .course-body {{
            padding: 0.9rem 0.9rem 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
        }}
        .course-title {{
            font-weight: 700;
            font-size: 1rem;
            line-height: 1.3;
            color: {c.text_primary};
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 2.6em;
        }}
        .course-meta {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            color: {c.text_secondary};
            font-size: 0.85rem;
        }}
        .progress-bar {{
            height: 6px;
            background-color: {c.border};
            border-radius: 3px;
            overflow: hidden;
        }}
        .progress-fill {{
            height: 100%;
            background-color: {c.success};
            transition: width 0.3s;
        }}
        .library-expandable {{
            cursor: pointer;
        }}
        .library-children {{
            overflow: hidden;
            transition: max-height 0.2s ease-out;
        }}
    </style>
    """)
