"""
Library Import Modal - Standalone modal for batch importing media library folders.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING, Awaitable, Callable, Optional

from nicegui import ui

from i18n import i18n

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase

logger = logging.getLogger("echoflow.library_import_modal")


async def render_library_import_modal(
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
    *,
    on_complete: Optional[Callable[[str], Awaitable[None] | None]] = None,
):
    """
    Render an independent modal for media library folder import.
    
    Features:
    - Select folder using Tauri file dialog
    - Scan directory for media files with subtitles
    - Display scan progress and results
    - Batch import with progress display
    - On completion, optionally navigate to the library view
    
    Args:
        course_db: Course database instance
        theme: UI theme object
        lang: Language code
        on_complete: Optional callback with library_id when import completes
    """
    from storage.library_repo import LibraryRepo
    from storage.sqlite import SqliteDatabase

    c = theme.colors
    is_zh = lang.startswith("zh")
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"

    def _t(key: str) -> str:
        val = i18n.t(key, lang)
        return val if val != key else _fallback_text(key, is_zh)

    # Initialize repos
    db = SqliteDatabase(str(course_db.db_path))
    library_repo = LibraryRepo(db)

    # State
    state = {
        "step": "select",  # select / scanning / results / importing / done
        "folder_path": "",
        "library_name": "",
        "library_id": None,
        "scan_result": None,
        "import_progress": None,
        "import_result": None,
        "cancelled": False,
    }

    # Create dialog
    with ui.dialog() as dialog, ui.card().classes("w-[700px] max-h-[85vh]"):
        # Header
        with ui.row().classes("w-full items-center justify-between mb-4"):
            ui.label(_t("import_library")).classes("text-lg font-semibold").style(
                f"color: {c.text_primary};"
            )
            ui.button(icon="close", on_click=dialog.close).props("flat round dense").style(
                f"color: {c.text_secondary};"
            )

        # Step 1: Select folder
        with ui.column().classes("w-full gap-3") as step_select:
            ui.label(_t("select_folder_hint")).classes("text-sm").style(
                f"color: {c.text_secondary};"
            )

            folder_input = ui.input(
                label=_t("folder_path"),
                placeholder="/path/to/media/folder",
            ).classes("w-full").props("readonly")

            name_input = ui.input(
                label=_t("library_name"),
                placeholder=_t("optional"),
            ).classes("w-full")

            # Tauri file picker button
            with ui.row().classes("w-full justify-end gap-2"):
                browse_btn = ui.button(
                    _t("browse"),
                    on_click=lambda: asyncio.create_task(pick_folder()),
                ).props("outline")
                scan_btn = ui.button(
                    _t("start_scan"),
                    on_click=lambda: asyncio.create_task(start_scan()),
                ).props("color=primary")
                scan_btn.set_enabled(False)

            error_label = ui.label("").classes("text-sm").style("color: red;")
            error_label.set_visibility(False)

        # Step 2: Scanning progress
        with ui.column().classes("w-full gap-3") as step_scanning:
            with ui.row().classes("items-center gap-3"):
                ui.spinner(size="md")
                scan_status_label = ui.label(_t("scanning_folder")).style(
                    f"color: {c.text_secondary};"
                )
            scan_progress_bar = ui.linear_progress(value=0).classes("w-full")
        step_scanning.set_visibility(False)

        # Step 3: Scan results
        with ui.column().classes("w-full gap-3") as step_results:
            results_summary = ui.label("").classes("text-sm font-medium").style(
                f"color: {c.text_primary};"
            )

            with ui.scroll_area().classes("w-full").style("max-height: 300px;"):
                results_container = ui.column().classes("w-full gap-1")

            with ui.row().classes("w-full justify-end gap-2"):
                ui.button(
                    _t("cancel"),
                    on_click=dialog.close,
                ).props("flat")
                import_btn = ui.button(
                    _t("start_import"),
                    on_click=lambda: asyncio.create_task(start_import()),
                ).props("color=primary")
        step_results.set_visibility(False)

        # Step 4: Importing progress
        with ui.column().classes("w-full gap-3") as step_importing:
            import_status_label = ui.label("").style(f"color: {c.text_secondary};")
            import_progress_bar = ui.linear_progress(value=0).classes("w-full")

            with ui.row().classes("w-full justify-end"):
                cancel_import_btn = ui.button(
                    _t("cancel"),
                    on_click=lambda: cancel_import(),
                ).props("outline")
        step_importing.set_visibility(False)

        # Step 5: Done
        with ui.column().classes("w-full gap-3 items-center py-6") as step_done:
            done_icon = ui.icon("check_circle", size="4rem").style(
                f"color: {c.success};"
            )
            done_label = ui.label("").classes("text-lg font-medium").style(
                f"color: {c.text_primary};"
            )
            done_details = ui.label("").classes("text-sm").style(
                f"color: {c.text_secondary};"
            )

            with ui.row().classes("gap-3 mt-4"):
                ui.button(
                    _t("close"),
                    on_click=dialog.close,
                ).props("flat")
                view_library_btn = ui.button(
                    _t("view_library"),
                    on_click=lambda: goto_library(),
                ).props("color=primary")
        step_done.set_visibility(False)

    # --- Helpers ---

    def show_step(step: str) -> None:
        state["step"] = step
        step_select.set_visibility(step == "select")
        step_scanning.set_visibility(step == "scanning")
        step_results.set_visibility(step == "results")
        step_importing.set_visibility(step == "importing")
        step_done.set_visibility(step == "done")

    def show_error(msg: str) -> None:
        error_label.text = msg
        error_label.set_visibility(True)

    def hide_error() -> None:
        error_label.set_visibility(False)

    async def check_tauri_available() -> bool:
        try:
            ok = await ui.run_javascript(
                "!!(window.__TAURI_INTERNALS__ || window.__TAURI__)",
                timeout=2.0,
            )
            return bool(ok)
        except Exception:
            return False

    async def pick_folder() -> None:
        ok = await check_tauri_available()
        if not ok:
            show_error(_t("tauri_required"))
            return

        js = """
        (async () => {
            const options = { multiple: false, directory: true };
            try {
                if (window.__TAURI__ && window.__TAURI__.dialog && window.__TAURI__.dialog.open) {
                    return await window.__TAURI__.dialog.open(options);
                }
            } catch (e) {}
            try {
                const mod = await import('@tauri-apps/plugin-dialog');
                return await mod.open(options);
            } catch (e) {}
            return null;
        })()
        """
        try:
            selected = await ui.run_javascript(js, timeout=120.0)
        except Exception:
            selected = None

        if selected:
            folder_input.value = str(selected)
            folder_input.update()
            scan_btn.set_enabled(True)
            # Auto-fill name from folder
            if not name_input.value.strip():
                name_input.value = Path(str(selected)).name
                name_input.update()

    async def start_scan() -> None:
        folder = folder_input.value.strip()
        if not folder:
            show_error(_t("folder_required"))
            return

        path = Path(folder)
        if not path.exists() or not path.is_dir():
            show_error(_t("folder_not_found"))
            return

        # Check if library already exists
        existing = library_repo.get_by_path(folder)
        if existing:
            show_error(_t("library_exists"))
            return

        hide_error()
        state["folder_path"] = folder
        state["library_name"] = name_input.value.strip() or path.name

        show_step("scanning")

        from services.library_service import LibraryService

        lib_service = LibraryService(library_repo, course_db)

        def on_progress(msg: str) -> None:
            scan_status_label.text = msg

        try:
            result = await lib_service.scan_directory(folder, progress_callback=on_progress)
            state["scan_result"] = result

            # Render results
            render_scan_results(result)
            show_step("results")
        except Exception as e:
            logger.error(f"Scan failed: {e}", exc_info=True)
            show_error(f"{_t('scan_failed')}: {e}")
            show_step("select")

    def render_scan_results(result) -> None:
        results_container.clear()

        results_summary.text = _t("scan_summary").format(
            total=result.total_media,
            with_sub=result.with_subtitle,
            without_sub=result.without_subtitle,
        )

        import_btn.set_enabled(result.with_subtitle > 0)

        with results_container:
            # Show items with subtitles first
            items_with = [it for it in result.items if it.subtitle_path]
            items_without = [it for it in result.items if not it.subtitle_path]

            for item in items_with[:50]:  # Limit display
                with ui.row().classes("w-full items-center gap-2 py-1").style(
                    f"background: rgba(76, 175, 80, 0.1); border-radius: 4px; padding: 0.5rem;"
                ):
                    ui.icon("check_circle", size="sm").style("color: green;")
                    with ui.column().classes("flex-1 gap-0"):
                        ui.label(item.title).classes("text-sm font-medium").style(
                            f"color: {c.text_primary};"
                        )
                        ui.label(item.relative_path).classes("text-xs").style(
                            f"color: {c.text_secondary};"
                        )

            for item in items_without[:20]:
                with ui.row().classes("w-full items-center gap-2 py-1").style(
                    f"background: rgba(255, 152, 0, 0.1); border-radius: 4px; padding: 0.5rem;"
                ):
                    ui.icon("warning", size="sm").style("color: orange;")
                    with ui.column().classes("flex-1 gap-0"):
                        ui.label(item.title).classes("text-sm").style(
                            f"color: {c.text_secondary};"
                        )

            remaining = len(result.items) - 50 - 20
            if remaining > 0:
                ui.label(_t("and_more").format(count=remaining)).classes("text-sm mt-2").style(
                    f"color: {c.text_secondary};"
                )

    async def start_import() -> None:
        if not state["scan_result"]:
            return

        items = [
            item for item in state["scan_result"].items
            if item.subtitle_path and item.status == "pending"
        ]

        if not items:
            return

        show_step("importing")
        state["cancelled"] = False

        # Create library first
        library = library_repo.create(
            name=state["library_name"],
            root_path=state["folder_path"],
            status="importing",
        )
        state["library_id"] = library.id

        from services.library_service import ImportProgress, LibraryService

        lib_service = LibraryService(library_repo, course_db)

        def on_progress(p: ImportProgress) -> None:
            if state["cancelled"]:
                return
            import_status_label.text = _t("importing_progress").format(
                current=p.completed,
                total=p.total,
                item=p.current_item or "",
            )
            if p.total > 0:
                import_progress_bar.value = p.completed / p.total

        try:
            result = await lib_service.batch_import(
                state["library_id"],
                items,
                progress_callback=on_progress,
            )
            state["import_result"] = result

            # Show done step
            done_label.text = _t("import_complete")
            done_details.text = _t("import_stats").format(
                imported=result.imported,
                failed=result.failed,
            )

            if result.failed > 0:
                done_icon.props("color=warning")
            else:
                done_icon.props("color=success")

            show_step("done")

            if on_complete and state["library_id"]:
                cb_result = on_complete(state["library_id"])
                if asyncio.iscoroutine(cb_result):
                    await cb_result

        except asyncio.CancelledError:
            import_status_label.text = _t("import_cancelled")
        except Exception as e:
            logger.error(f"Import failed: {e}", exc_info=True)
            import_status_label.text = f"{_t('import_failed')}: {e}"

    def cancel_import() -> None:
        state["cancelled"] = True
        import_status_label.text = _t("cancelling")

    def goto_library() -> None:
        dialog.close()
        library_id = state.get("library_id")
        if library_id:
            ui.navigate.to(f"/?view=library&id={library_id}&theme={theme_mode}&lang={lang}")
        else:
            ui.navigate.to(f"/?theme={theme_mode}&lang={lang}")

    # Open dialog
    dialog.open()


def _fallback_text(key: str, is_zh: bool) -> str:
    """Fallback translations for library import modal."""
    translations = {
        True: {  # Chinese
            "import_library": "导入媒体库",
            "select_folder_hint": "选择包含视频/音频及字幕的文件夹，将自动扫描并批量导入。",
            "folder_path": "文件夹路径",
            "library_name": "媒体库名称",
            "optional": "可选",
            "browse": "浏览...",
            "start_scan": "开始扫描",
            "folder_required": "请输入或选择文件夹路径",
            "folder_not_found": "文件夹不存在",
            "library_exists": "该文件夹已添加为媒体库",
            "tauri_required": "本地媒体库导入仅支持桌面端应用",
            "scanning_folder": "正在扫描文件夹...",
            "scan_failed": "扫描失败",
            "scan_summary": "扫描完成：共 {total} 个媒体文件，{with_sub} 个有字幕，{without_sub} 个无字幕",
            "cancel": "取消",
            "start_import": "开始导入",
            "importing_progress": "正在导入: {current}/{total} - {item}",
            "cancelling": "正在取消...",
            "import_cancelled": "导入已取消",
            "import_failed": "导入失败",
            "import_complete": "导入完成！",
            "import_stats": "成功 {imported} 个，失败 {failed} 个",
            "close": "关闭",
            "view_library": "查看媒体库",
            "and_more": "还有 {count} 个...",
        },
        False: {  # English
            "import_library": "Import Media Library",
            "select_folder_hint": "Select a folder containing videos/audio with subtitles for batch import.",
            "folder_path": "Folder Path",
            "library_name": "Library Name",
            "optional": "Optional",
            "browse": "Browse...",
            "start_scan": "Start Scan",
            "folder_required": "Please enter or select a folder path",
            "folder_not_found": "Folder not found",
            "library_exists": "This folder is already added as a library",
            "tauri_required": "Local library import requires the desktop app",
            "scanning_folder": "Scanning folder...",
            "scan_failed": "Scan failed",
            "scan_summary": "Scan complete: {total} media files, {with_sub} with subtitles, {without_sub} without",
            "cancel": "Cancel",
            "start_import": "Start Import",
            "importing_progress": "Importing: {current}/{total} - {item}",
            "cancelling": "Cancelling...",
            "import_cancelled": "Import cancelled",
            "import_failed": "Import failed",
            "import_complete": "Import Complete!",
            "import_stats": "{imported} imported, {failed} failed",
            "close": "Close",
            "view_library": "View Library",
            "and_more": "and {count} more...",
        },
    }
    return translations.get(is_zh, translations[False]).get(key, key)
