"""
Library Page - Media library management UI.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import TYPE_CHECKING, Optional

from nicegui import ui

from i18n import i18n

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase

logger = logging.getLogger("echoflow.library_page")


async def render_library_page(
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
):
    """
    Render the media library management page.

    Allows users to:
    - Add new media library folders
    - Scan folders for media files
    - Batch import media with subtitles
    """
    from storage.library_repo import LibraryRepo
    from storage.sqlite import SqliteDatabase

    c = theme.colors
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    query = f"?theme={theme_mode}&lang={lang}"

    def _t(key: str) -> str:
        val = i18n.t(key, lang)
        return val if val != key else _fallback_text(key, lang)

    # Initialize repos
    db = SqliteDatabase(str(course_db.db_path))
    library_repo = LibraryRepo(db)

    # State
    state = {
        "libraries": library_repo.list_all(),
        "selected_library": None,
        "scan_result": None,
        "importing": False,
        "import_progress": None,
    }

    # Add styles
    ui.add_head_html(f"""
    <style>
        .library-container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem;
        }}
        .library-card {{
            background: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 1rem;
        }}
        .library-card:hover {{
            border-color: {c.primary};
        }}
        .scan-item {{
            padding: 0.75rem;
            border-bottom: 1px solid {c.border};
        }}
        .scan-item:last-child {{
            border-bottom: none;
        }}
        .scan-item.has-subtitle {{
            background: rgba(76, 175, 80, 0.1);
        }}
        .scan-item.no-subtitle {{
            background: rgba(255, 152, 0, 0.1);
        }}
    </style>
    """)

    # Header
    with ui.row().classes("w-full items-center justify-between p-4").style(
        f"background-color: {c.bg_secondary}; border-bottom: 1px solid {c.border};"
    ):
        with ui.row().classes("items-center gap-4"):
            ui.button(icon="arrow_back", on_click=lambda: ui.navigate.to(f"/{query}")).props(
                "flat round"
            )
            ui.label(_t("media_library")).classes("text-xl font-bold").style(
                f"color: {c.text_primary};"
            )

        ui.button(_t("add_library"), on_click=lambda: show_add_dialog()).props("color=primary")

    # Main content
    main_container = ui.element("div").classes("library-container")

    async def refresh_libraries():
        state["libraries"] = library_repo.list_all()
        await render_library_list()

    # Add library dialog
    with ui.dialog() as add_dialog, ui.card().classes("w-[500px]"):
        ui.label(_t("add_media_library")).classes("text-lg font-semibold mb-4").style(
            f"color: {c.text_primary};"
        )

        folder_input = ui.input(
            label=_t("folder_path"),
            placeholder="/path/to/media/folder",
        ).classes("w-full")

        name_input = ui.input(
            label=_t("library_name"),
            placeholder=_t("optional"),
        ).classes("w-full")

        error_label = ui.label("").classes("text-sm mt-2").style("color: red;")

        with ui.row().classes("w-full justify-end gap-2 mt-4"):
            ui.button(_t("cancel"), on_click=add_dialog.close).props("flat")

            async def do_add_library():
                folder = folder_input.value.strip()
                if not folder:
                    error_label.text = _t("folder_required")
                    return

                path = Path(folder)
                if not path.exists() or not path.is_dir():
                    error_label.text = _t("folder_not_found")
                    return

                # Check if already exists
                existing = library_repo.get_by_path(folder)
                if existing:
                    error_label.text = _t("library_exists")
                    return

                name = name_input.value.strip() or path.name
                library_repo.create(name=name, root_path=folder, status="ready")

                add_dialog.close()
                await refresh_libraries()

            ui.button(_t("add"), on_click=do_add_library).props("color=primary")

    def show_add_dialog():
        folder_input.value = ""
        name_input.value = ""
        error_label.text = ""
        add_dialog.open()

    # Scan dialog
    with ui.dialog() as scan_dialog, ui.card().classes("w-[700px] max-h-[80vh]"):
        scan_title = ui.label("").classes("text-lg font-semibold mb-4").style(
            f"color: {c.text_primary};"
        )

        scan_progress = ui.label("").classes("text-sm mb-2").style(f"color: {c.text_secondary};")
        scan_spinner = ui.spinner(size="sm").classes("mb-4")

        scan_results_container = ui.column().classes("w-full")

        with ui.row().classes("w-full justify-end gap-2 mt-4"):
            ui.button(_t("close"), on_click=scan_dialog.close).props("flat")

            async def do_import():
                if not state["scan_result"] or not state["selected_library"]:
                    return

                items = [
                    item for item in state["scan_result"].items
                    if item.subtitle_path and item.status == "pending"
                ]

                if not items:
                    ui.notify(_t("no_items_to_import"), type="warning")
                    return

                state["importing"] = True
                scan_spinner.visible = True
                scan_progress.text = _t("importing")

                from services.library_service import ImportProgress, LibraryService

                lib_service = LibraryService(library_repo, course_db)

                def on_progress(p: ImportProgress):
                    scan_progress.text = f"{_t('importing')}: {p.completed}/{p.total} - {p.current_item or ''}"

                result = await lib_service.batch_import(
                    state["selected_library"].id,
                    items,
                    progress_callback=on_progress,
                )

                state["importing"] = False
                scan_spinner.visible = False
                scan_progress.text = f"{_t('import_complete')}: {result.imported} {_t('success')}, {result.failed} {_t('failed')}"

                await refresh_libraries()

            import_btn = ui.button(_t("start_import"), on_click=do_import).props("color=primary")

    async def show_scan_dialog(library):
        state["selected_library"] = library
        state["scan_result"] = None

        scan_title.text = f"{_t('scanning')}: {library.name}"
        scan_progress.text = _t("scanning_folder")
        scan_spinner.visible = True
        scan_results_container.clear()
        import_btn.disable()

        scan_dialog.open()

        from services.library_service import LibraryService

        lib_service = LibraryService(library_repo, course_db)

        def on_scan_progress(msg: str):
            scan_progress.text = msg

        result = await lib_service.scan_directory(library.root_path, progress_callback=on_scan_progress)
        state["scan_result"] = result

        scan_spinner.visible = False
        scan_progress.text = f"{_t('scan_complete')}: {result.total_media} {_t('media_files')}, {result.with_subtitle} {_t('with_subtitle')}"

        # Render scan results
        scan_results_container.clear()
        with scan_results_container:
            if result.with_subtitle > 0:
                import_btn.enable()

            with ui.scroll_area().classes("w-full").style("max-height: 400px;"):
                for item in result.items[:100]:  # Limit display
                    css_class = "scan-item has-subtitle" if item.subtitle_path else "scan-item no-subtitle"
                    with ui.element("div").classes(css_class):
                        with ui.row().classes("items-center justify-between"):
                            with ui.column().classes("gap-0"):
                                ui.label(item.title).classes("font-medium").style(
                                    f"color: {c.text_primary};"
                                )
                                ui.label(item.relative_path).classes("text-xs").style(
                                    f"color: {c.text_secondary};"
                                )
                            if item.subtitle_path:
                                ui.icon("check_circle", color="green")
                            else:
                                ui.icon("warning", color="orange")

                if len(result.items) > 100:
                    ui.label(f"... {_t('and_more', count=len(result.items) - 100)}").style(
                        f"color: {c.text_secondary};"
                    )

    async def render_library_list():
        main_container.clear()

        with main_container:
            if not state["libraries"]:
                with ui.column().classes("w-full items-center py-12"):
                    ui.icon("folder_open", size="4rem").style(f"color: {c.text_secondary};")
                    ui.label(_t("no_libraries")).classes("text-lg mt-4").style(
                        f"color: {c.text_secondary};"
                    )
                    ui.label(_t("add_library_hint")).classes("text-sm").style(
                        f"color: {c.text_secondary};"
                    )
            else:
                for lib in state["libraries"]:
                    course_count = library_repo.get_courses_count(lib.id)
                    scan_result = lib.scan_result

                    with ui.element("div").classes("library-card"):
                        with ui.row().classes("items-start justify-between"):
                            with ui.column().classes("gap-1"):
                                ui.label(lib.name).classes("text-lg font-semibold").style(
                                    f"color: {c.text_primary};"
                                )
                                ui.label(lib.root_path).classes("text-sm").style(
                                    f"color: {c.text_secondary};"
                                )

                                with ui.row().classes("gap-4 mt-2"):
                                    ui.label(f"📚 {course_count} {_t('courses')}").style(
                                        f"color: {c.text_secondary};"
                                    )
                                    if scan_result:
                                        imported = scan_result.get("imported", 0)
                                        total = scan_result.get("total", 0)
                                        ui.label(f"✓ {imported}/{total} {_t('imported')}").style(
                                            f"color: {c.text_secondary};"
                                        )

                            with ui.row().classes("gap-2"):
                                ui.button(
                                    _t("scan"),
                                    on_click=lambda l=lib: asyncio.create_task(show_scan_dialog(l)),
                                ).props("outline")
                                ui.button(
                                    icon="delete",
                                    on_click=lambda l=lib: asyncio.create_task(delete_library(l)),
                                ).props("flat round color=negative")

    async def delete_library(lib):
        library_repo.delete(lib.id)
        await refresh_libraries()

    # Initial render
    await render_library_list()


def _fallback_text(key: str, lang: str) -> str:
    """Fallback translations for library page."""
    translations = {
        "zh": {
            "media_library": "媒体库",
            "add_library": "添加媒体库",
            "add_media_library": "添加媒体库",
            "folder_path": "文件夹路径",
            "library_name": "库名称",
            "optional": "可选",
            "folder_required": "请输入文件夹路径",
            "folder_not_found": "文件夹不存在",
            "library_exists": "该文件夹已添加",
            "add": "添加",
            "cancel": "取消",
            "close": "关闭",
            "scan": "扫描",
            "scanning": "正在扫描",
            "scanning_folder": "正在扫描文件夹...",
            "scan_complete": "扫描完成",
            "media_files": "个媒体文件",
            "with_subtitle": "个有字幕",
            "no_libraries": "暂无媒体库",
            "add_library_hint": "点击右上角按钮添加媒体库文件夹",
            "courses": "课程",
            "imported": "已导入",
            "start_import": "开始导入",
            "importing": "正在导入",
            "import_complete": "导入完成",
            "success": "成功",
            "failed": "失败",
            "no_items_to_import": "没有可导入的项目",
            "and_more": "还有 {count} 个...",
        },
        "en": {
            "media_library": "Media Library",
            "add_library": "Add Library",
            "add_media_library": "Add Media Library",
            "folder_path": "Folder Path",
            "library_name": "Library Name",
            "optional": "Optional",
            "folder_required": "Please enter folder path",
            "folder_not_found": "Folder not found",
            "library_exists": "This folder is already added",
            "add": "Add",
            "cancel": "Cancel",
            "close": "Close",
            "scan": "Scan",
            "scanning": "Scanning",
            "scanning_folder": "Scanning folder...",
            "scan_complete": "Scan complete",
            "media_files": "media files",
            "with_subtitle": "with subtitles",
            "no_libraries": "No media libraries",
            "add_library_hint": "Click the button above to add a media library folder",
            "courses": "courses",
            "imported": "imported",
            "start_import": "Start Import",
            "importing": "Importing",
            "import_complete": "Import complete",
            "success": "success",
            "failed": "failed",
            "no_items_to_import": "No items to import",
            "and_more": "and {count} more...",
        },
    }
    lang_key = "zh" if lang.startswith("zh") else "en"
    return translations.get(lang_key, translations["en"]).get(key, key)


