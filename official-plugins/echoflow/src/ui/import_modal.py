"""
Import modal UI for adding new courses.
"""

from nicegui import ui
from typing import TYPE_CHECKING, Any, Awaitable, Callable, Optional
import asyncio
import json
import logging
import os
import tempfile
import inspect
from pathlib import Path

from i18n import i18n
from dawnchat_sdk import host

from storage.v2_player import NarrationDirectives
from services.v2_player import DirectionAnalyzer

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase
    from course.models import Course

logger = logging.getLogger("echoflow.ui.import")


async def render_import_modal(
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
    *,
    preset_url: Optional[str] = None,
    preset_download_video: bool = True,
    preset_difficulty: str = "medium",
    title_text: Optional[str] = None,
    primary_button_text: Optional[str] = None,
    reuse_course: Optional["Course"] = None,
    on_imported: Optional[Callable[["Course"], Awaitable[None] | None]] = None,
):
    """
    Render the import modal dialog.
    """
    c = theme.colors
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    
    def _t(key):
        return i18n.t(key, lang)
    
    with ui.dialog() as dialog, ui.card().classes("w-[760px] max-w-[92vw]"):
        with ui.row().classes("w-full items-center justify-between mb-2"):
            ui.label(title_text or _t("import_video")).classes("text-lg font-semibold").style(
                f"color: {c.text_primary};"
            )
            ui.button(icon="close", on_click=dialog.close).props("flat round dense").style(f"color:{c.text_secondary};")

        prefs = course_db.get_app_prefs() or {}
        default_pregen_enabled = bool(prefs.get("echoflow_pregen_enabled") if "echoflow_pregen_enabled" in prefs else True)
        default_pregen_lang = str(prefs.get("echoflow_pregen_lang") or "zh")
        default_v2_audience = str(prefs.get("echoflow_v2_audience") or "adult")
        default_v2_english_level = str(prefs.get("echoflow_v2_english_level") or "intermediate")

        current_model = str(prefs.get("llm_model") or "")
        current_tts_voice = str(prefs.get("tts_voice") or "Emma")
        current_tts_quality = str(prefs.get("tts_quality") or "fast")
        current_tts_engine = str(prefs.get("tts_engine") or "vibevoice").strip() or "vibevoice"
        current_tts_model_id = str(prefs.get("tts_model_id") or "").strip()

        def _normalize_level_pref(level: str) -> tuple[str, str]:
            k = str(level or "").strip().lower()
            if k.startswith("cn:"):
                return ("cn", k)
            if k.startswith("cefr:"):
                return ("global", k)
            mapping = {"beginner": "cefr:a1", "intermediate": "cefr:b1", "advanced": "cefr:c1"}
            return ("global", mapping.get(k, "cefr:b1"))

        def _level_standard_options(is_zh: bool) -> dict[str, str]:
            return {"cn": ("国内" if is_zh else "CN"), "global": ("国外" if is_zh else "Global")}

        def _level_options(standard: str, is_zh: bool) -> dict[str, str]:
            s = str(standard or "global").strip().lower()
            if s == "cn":
                cn: dict[str, str] = {"cn:k0": ("幼儿启蒙" if is_zh else "Kids starter")}
                for i in range(1, 6 + 1):
                    cn[f"cn:primary:{i}"] = (f"小学{i}年级" if is_zh else f"Primary grade {i}")
                for i in range(1, 3 + 1):
                    cn[f"cn:middle:{i}"] = (f"初中{i}年级" if is_zh else f"Middle school grade {i}")
                for i in range(1, 3 + 1):
                    cn[f"cn:high:{i}"] = (f"高中{i}年级" if is_zh else f"High school grade {i}")
                cn["cn:cet4"] = ("大学英语四级" if is_zh else "CET-4")
                cn["cn:cet6"] = ("大学英语六级" if is_zh else "CET-6")
                return cn

            return {
                "cefr:a0": ("CEFR A0 入门" if is_zh else "CEFR A0 (starter)"),
                "cefr:a1": ("CEFR A1 初学" if is_zh else "CEFR A1 (beginner)"),
                "cefr:a2": ("CEFR A2 基础" if is_zh else "CEFR A2 (elementary)"),
                "cefr:b1": ("CEFR B1 中级" if is_zh else "CEFR B1 (intermediate)"),
                "cefr:b2": ("CEFR B2 中高级" if is_zh else "CEFR B2 (upper-intermediate)"),
                "cefr:c1": ("CEFR C1 高级" if is_zh else "CEFR C1 (advanced)"),
                "cefr:c2": ("CEFR C2 精通" if is_zh else "CEFR C2 (proficient)"),
            }

        imported_course_id: dict[str, Optional[str]] = {"course_id": None}
        imported_course_ref: dict[str, Optional["Course"]] = {"course": None}
        imported_v2_args: dict[str, Optional[str]] = {
            "narration_lang": None,
            "audience": None,
            "english_level": None,
            "llm_model": None,
        }
        # Direction suggestions state
        direction_state: dict[str, Any] = {
            "suggestions": None,      # DirectionSuggestions
            "analyzing": False,
            "analyzed": False,
            "checkboxes": {},         # direction_type -> checkbox widget
            "course_type": "general",
        }
        v2_task_ref: dict[str, Any] = {"task": None, "start": None}
        v2_progress: dict[str, object] = {
            "running": False,
            "progress": 0.0,
            "message": "",
            "last_error": "",
            "done": 0,
            "total": 0,
            "failed": 0,
        }

        def _set_status(text: str, color: str) -> None:
            status_label.text = str(text or "")
            status_label.style(f"color: {color};")
            status_label.set_visibility(bool(str(text or "").strip()))

        async def login_bilibili():
            _set_status(
                (
                "正在打开 Bilibili 登录窗口，请在弹出的浏览器中完成登录..."
                if lang.startswith("zh")
                else "Opening Bilibili login in a browser window..."
                ),
                c.warning,
            )

            try:
                result = await host.browser.login(
                    url="https://passport.bilibili.com/login",
                    wait_for_cookie="SESSDATA"
                )

                if result.get("code") == 200 and result.get("data", {}).get("success"):
                    _set_status(
                        (
                        "Bilibili 登录成功！现在可以导入需要登录的视频了。"
                        if lang.startswith("zh")
                        else "Bilibili login successful."
                        ),
                        c.success,
                    )
                else:
                    _set_status(
                        f"{'登录失败' if lang.startswith('zh') else 'Login failed'}: {result.get('message')}",
                        c.danger,
                    )

            except Exception as e:
                logger.error(f"Login failed: {e}")
                _set_status(
                    f"{'启动登录失败' if lang.startswith('zh') else 'Login error'}: {str(e)}",
                    c.danger,
                )

        async def _start_v2(force: bool = False, *, stage: str = "full") -> None:
            """Start v2 preprocessing pipeline."""
            v2_task_ref["start"] = _start_v2

            existing = v2_task_ref.get("task")
            if isinstance(existing, asyncio.Task) and not existing.done():
                if not force:
                    return
                try:
                    existing.cancel()
                except Exception:
                    pass

            course_ref = imported_course_ref.get("course")
            if course_ref is None:
                return

            from services.v2_player import prepare_course_for_v2

            v2_progress["running"] = True
            v2_progress["progress"] = 0.0
            v2_progress["message"] = ""
            v2_progress["last_error"] = ""
            v2_progress["done"] = 0
            v2_progress["total"] = 0
            v2_progress["failed"] = 0

            narration_lang_v = str(v2_lang_select.value or imported_v2_args.get("narration_lang") or "zh").strip() or "zh"
            audience_v = str(v2_audience_select.value or imported_v2_args.get("audience") or "adult").strip() or "adult"
            english_level_v = str(v2_level_select.value or imported_v2_args.get("english_level") or "intermediate").strip() or "intermediate"
            llm_model_v = str(coach_model_select.value or imported_v2_args.get("llm_model") or "").strip() or None

            def _level_to_intensity(level: str) -> str:
                k = str(level or "intermediate").strip().lower()
                if k in {"beginner", "cefr:a0", "cefr:a1", "cefr:a2", "cn:k0"} or k.startswith("cn:k0"):
                    return "high"
                if k in {"advanced", "cefr:c1", "cefr:c2", "cn:cet6"} or k.startswith("cn:cet6"):
                    return "low"
                if k.startswith("cn:primary:") or k.startswith("cn:middle:"):
                    return "high"
                if k.startswith("cn:high:") or k.startswith("cn:cet4"):
                    return "medium"
                if k.startswith("cefr:b1") or k.startswith("cefr:b2"):
                    return "medium"
                return "medium"

            scope_v = "all"
            intensity_v = _level_to_intensity(english_level_v)

            speaker_v = str(tts_voice_select.value or "").strip()
            quality_v = str(tts_quality_select.value or "").strip()
            tts_engine_v = str(tts_engine_select.value or "").strip()
            tts_model_id_v = str(tts_model_select.value or "").strip()
            prefs = course_db.get_app_prefs() or {}
            speaker = speaker_v or str(prefs.get("tts_voice") or "Emma").strip() or "Emma"
            quality = quality_v or str(prefs.get("tts_quality") or "fast").strip() or "fast"
            tts_engine = (
                tts_engine_v or str(prefs.get("tts_engine") or "vibevoice").strip() or "vibevoice"
            )
            tts_model_id = (
                tts_model_id_v or str(prefs.get("tts_model_id") or "").strip()
            )
            if tts_engine not in {"cosyvoice", "cosyvoice3"}:
                tts_model_id = ""

            async def on_progress(frac: float, message: str) -> None:
                v2_progress["progress"] = max(0.0, min(1.0, float(frac)))
                v2_progress["message"] = str(message or "")
                msg = str(message or "")
                if msg.startswith("tts:"):
                    try:
                        _, dt, failed_s = msg.split(":", 2)
                        done_s, total_s = dt.split("/", 1)
                        v2_progress["done"] = int(done_s)
                        v2_progress["total"] = int(total_s)
                        v2_progress["failed"] = int(failed_s)
                    except Exception:
                        pass

            async def _runner() -> None:
                try:
                    res = await prepare_course_for_v2(
                        course=course_ref,
                        course_db=course_db,
                        enable_tts=True,
                        stage=str(stage or "full"),
                        force_regenerate=bool(force),
                        scope=scope_v,
                        intensity=intensity_v,
                        narration_lang=narration_lang_v,
                        audience=audience_v,
                        english_level=english_level_v,
                        script_mode="auto",
                        llm_model=llm_model_v,
                        speaker=speaker,
                        quality=quality,
                        engine=str(tts_engine),
                        model_id=(str(tts_model_id).strip() if tts_model_id else None),
                        on_progress=on_progress,
                    )
                    if not res.success:
                        v2_progress["last_error"] = str(res.error or "failed")
                except asyncio.CancelledError:
                    v2_progress["last_error"] = "cancelled"
                    raise
                except Exception as e:
                    v2_progress["last_error"] = str(e)
                finally:
                    v2_progress["running"] = False

            v2_task_ref["task"] = asyncio.create_task(_runner())

        async def do_import():
            """Called when user clicks 'Import' on direction_tab - starts v2 preprocessing."""
            course = imported_course_ref.get("course")
            if not course:
                _set_status(
                    ("请先完成导入流程" if lang.startswith("zh") else "Please complete import first"),
                    c.danger,
                )
                return
            
            # Save preferences
            try:
                narration_lang = str(v2_lang_select.value or "zh").strip() or "zh"
                v2_audience = str(v2_audience_select.value or "adult").strip() or "adult"
                v2_level = str(v2_level_select.value or "intermediate").strip() or "intermediate"
                tts_engine_value = str(tts_engine_select.value or "vibevoice").strip() or "vibevoice"
                tts_model_value = str(tts_model_select.value or "").strip()
                course_db.patch_app_prefs(
                    {
                        "llm_model": str(coach_model_select.value or ""),
                        "tts_voice": str(tts_voice_select.value or "").strip() or "Emma",
                        "tts_quality": str(tts_quality_select.value or "").strip() or "fast",
                        "tts_engine": tts_engine_value,
                        "tts_model_id": (tts_model_value if tts_engine_value in {"cosyvoice", "cosyvoice3"} else ""),
                        "echoflow_pregen_enabled": True,
                        "echoflow_pregen_lang": str(narration_lang),
                        "echoflow_v2_audience": str(v2_audience),
                        "echoflow_v2_english_level": str(v2_level),
                    }
                )
            except Exception:
                pass

            # Start v2 preprocessing
            _set_status(
                ("正在生成解说脚本..." if lang.startswith("zh") else "Generating narration script..."),
                c.warning,
            )
            await _start_v2(force=False)

            _set_status(_t("import_success"), c.success)
            import_btn.set_visibility(False)
            post_import_actions.set_visibility(True)

        is_zh = bool(lang.startswith("zh"))

        with ui.tabs().classes("w-full") as tabs:
            basic_tab = ui.tab("基础导入" if is_zh else "Import")
            v2_tab = ui.tab("解说设置" if is_zh else "Settings")
            direction_tab = ui.tab("方向确认" if is_zh else "Directions")

        with ui.tab_panels(tabs, value=basic_tab).classes("w-full"):
            with ui.tab_panel(basic_tab):
                with ui.row().classes("w-full gap-4 items-start"):
                    with ui.column().classes("w-full"):
                        import_source: dict[str, str] = {"mode": "url"}
                        local_state: dict[str, Optional[str]] = {"media_path": None, "subtitle_path": None}
                        local_ui: dict[str, Any] = {
                            "path_input": None,
                            "subtitle_input": None,
                            "tauri_available": None,
                        }

                        def _apply_source_styles() -> None:
                            mode = str(import_source.get("mode") or "url").strip().lower()
                            if mode == "local":
                                url_btn.style(f"background-color: transparent; color: {c.text_secondary};")
                                local_btn.style(f"background-color: {c.primary}22; color: {c.primary};")
                                online_content.set_visibility(False)
                                local_content.set_visibility(True)
                            else:
                                url_btn.style(f"background-color: {c.primary}22; color: {c.primary};")
                                local_btn.style(f"background-color: transparent; color: {c.text_secondary};")
                                online_content.set_visibility(True)
                                local_content.set_visibility(False)

                        def _switch_source(mode: str) -> None:
                            import_source["mode"] = str(mode or "url").strip().lower()
                            _apply_source_styles()

                        async def _ensure_tauri_available() -> bool:
                            cached = local_ui.get("tauri_available")
                            if isinstance(cached, bool):
                                return cached
                            try:
                                ok = await ui.run_javascript("!!(window.__TAURI_INTERNALS__ || window.__TAURI__)", timeout=2.0)
                                local_ui["tauri_available"] = bool(ok)
                                return bool(ok)
                            except Exception:
                                local_ui["tauri_available"] = False
                                return False

                        def _dialog_js(filters: list[dict[str, object]]) -> str:
                            payload = json.dumps(filters)
                            return f"""
                            (async () => {{
                              const options = {{
                                multiple: false,
                                directory: false,
                                filters: {payload},
                              }};
                              try {{
                                if (window.__TAURI__ && window.__TAURI__.dialog && window.__TAURI__.dialog.open) {{
                                  const selected = await window.__TAURI__.dialog.open(options);
                                  return selected ?? null;
                                }}
                              }} catch (e) {{}}
                              try {{
                                const mod = await import('@tauri-apps/plugin-dialog');
                                const selected = await mod.open(options);
                                return selected ?? null;
                              }} catch (e) {{}}
                              return null;
                            }})()
                            """

                        async def _auto_match_subtitle(media_path: str) -> Optional[str]:
                            from course.importer import _find_best_subtitle_for_media, _subtitle_file_has_english

                            p = Path(str(media_path or "").strip())
                            if not p.exists() or not p.is_file():
                                return None
                            try:
                                best = await asyncio.to_thread(_find_best_subtitle_for_media, p)
                            except Exception:
                                return None
                            if not best:
                                return None
                            try:
                                ok = await asyncio.to_thread(_subtitle_file_has_english, best)
                            except Exception:
                                ok = False
                            return str(best) if ok else None

                        def _set_subtitle_path(path: Optional[str]) -> None:
                            local_state["subtitle_path"] = str(path or "").strip() or None
                            subtitle_input: Any = local_ui.get("subtitle_input")
                            if subtitle_input is not None:
                                try:
                                    update_fn = getattr(subtitle_input, "update", None)
                                    if callable(update_fn):
                                        setattr(
                                            subtitle_input,
                                            "value",
                                            str(local_state.get("subtitle_path") or ""),
                                        )
                                        update_fn()
                                except Exception:
                                    pass

                        async def _refresh_auto_subtitle() -> None:
                            media_path = str(local_state.get("media_path") or "").strip()
                            if not media_path:
                                return
                            _set_status(
                                ("正在自动匹配字幕/歌词…" if is_zh else "Auto-matching subtitles/lyrics…"),
                                c.warning,
                            )
                            matched = await _auto_match_subtitle(media_path)
                            if matched:
                                _set_subtitle_path(matched)
                                _set_status(
                                    ("已自动匹配字幕/歌词" if is_zh else "Subtitles/lyrics auto-matched"),
                                    c.success,
                                )
                            else:
                                _set_subtitle_path(None)
                                _set_status(
                                    ("未找到可用字幕/歌词文件（需英文）" if is_zh else "No usable subtitles/lyrics found (English required)"),
                                    c.danger,
                                )

                        async def _pick_local_media() -> None:
                            ok = await _ensure_tauri_available()
                            if not ok:
                                _set_status(
                                    ("本地导入仅支持桌面端应用（Tauri）。" if is_zh else "Local import requires the desktop app (Tauri)."),
                                    c.danger,
                                )
                                return

                            js = _dialog_js(
                                [
                                    {
                                        "name": "Media",
                                        "extensions": [
                                            "mp4",
                                            "mkv",
                                            "mov",
                                            "avi",
                                            "webm",
                                            "mp3",
                                            "m4a",
                                            "aac",
                                            "wav",
                                            "flac",
                                            "ogg",
                                            "opus",
                                        ],
                                    }
                                ]
                            )
                            try:
                                selected = await ui.run_javascript(js, timeout=120.0)
                            except Exception:
                                selected = None
                            selected_path = str(selected or "").strip()
                            if not selected_path:
                                return
                            local_state["media_path"] = selected_path
                            _set_subtitle_path(None)
                            path_input: Any = local_ui.get("path_input")
                            if path_input is not None:
                                try:
                                    update_fn = getattr(path_input, "update", None)
                                    if callable(update_fn):
                                        setattr(path_input, "value", selected_path)
                                        update_fn()
                                except Exception:
                                    pass
                            await _refresh_auto_subtitle()

                        async def _pick_local_subtitle() -> None:
                            ok = await _ensure_tauri_available()
                            if not ok:
                                _set_status(
                                    ("本地导入仅支持桌面端应用（Tauri）。" if is_zh else "Local import requires the desktop app (Tauri)."),
                                    c.danger,
                                )
                                return
                            js = _dialog_js(
                                [
                                    {
                                        "name": "Subtitle/Lyrics",
                                        "extensions": ["srt", "vtt", "ass", "ssa", "lrc", "sub"],
                                    }
                                ]
                            )
                            try:
                                selected = await ui.run_javascript(js, timeout=120.0)
                            except Exception:
                                selected = None
                            selected_path = str(selected or "").strip()
                            if not selected_path:
                                return
                            from course.importer import _subtitle_file_has_english

                            try:
                                is_ok = await asyncio.to_thread(_subtitle_file_has_english, Path(selected_path))
                            except Exception:
                                is_ok = False
                            if not is_ok:
                                _set_subtitle_path(None)
                                _set_status(
                                    ("所选字幕/歌词不包含足够英文内容" if is_zh else "Selected subtitles/lyrics does not contain enough English content"),
                                    c.danger,
                                )
                                return

                            _set_subtitle_path(selected_path)
                            _set_status(("已选择字幕/歌词文件" if is_zh else "Subtitles/lyrics selected"), c.success)

                        async def _handle_media_upload(e) -> None:
                            try:
                                name = getattr(e, "name", None)
                                content = getattr(e, "content", None)
                                file_obj = getattr(e, "file", None)
                                if not name and content:
                                    name = getattr(content, "name", None)
                                if not name and file_obj:
                                    name = getattr(file_obj, "name", None)
                                if not name:
                                    name = "uploaded_media.mp4"

                                data = None
                                if content and hasattr(content, "read"):
                                    data = content.read()
                                    if inspect.iscoroutine(data):
                                        data = await data
                                elif file_obj:
                                    if hasattr(file_obj, "read"):
                                        data = file_obj.read()
                                        if inspect.iscoroutine(data):
                                            data = await data
                                    elif hasattr(file_obj, "_data"):
                                        data = file_obj._data
                                if data is None:
                                    raise ValueError("missing upload bytes")

                                suffix = os.path.splitext(str(name))[1].lower().strip() or ".mp4"
                                if suffix.startswith(".") is False:
                                    suffix = f".{suffix}"
                                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
                                    if isinstance(data, (bytes, bytearray)):
                                        f.write(data)
                                    else:
                                        f.write(bytes(data))
                                    tmp_path = f.name

                                local_state["media_path"] = tmp_path
                                _set_subtitle_path(None)
                                path_input: Any = local_ui.get("path_input")
                                if path_input is not None:
                                    try:
                                        update_fn = getattr(path_input, "update", None)
                                        if callable(update_fn):
                                            setattr(path_input, "value", tmp_path)
                                            update_fn()
                                    except Exception:
                                        pass
                                _set_status(("已上传媒体文件" if is_zh else "Media uploaded"), c.success)
                            except Exception as err:
                                _set_status((f"上传失败: {err}" if is_zh else f"Upload failed: {err}"), c.danger)

                        async def _handle_subtitle_upload(e) -> None:
                            try:
                                name = getattr(e, "name", None)
                                content = getattr(e, "content", None)
                                file_obj = getattr(e, "file", None)
                                if not name and content:
                                    name = getattr(content, "name", None)
                                if not name and file_obj:
                                    name = getattr(file_obj, "name", None)
                                if not name:
                                    name = "uploaded_subtitle.srt"

                                data = None
                                if content and hasattr(content, "read"):
                                    data = content.read()
                                    if inspect.iscoroutine(data):
                                        data = await data
                                elif file_obj:
                                    if hasattr(file_obj, "read"):
                                        data = file_obj.read()
                                        if inspect.iscoroutine(data):
                                            data = await data
                                    elif hasattr(file_obj, "_data"):
                                        data = file_obj._data
                                if data is None:
                                    raise ValueError("missing upload bytes")

                                suffix = os.path.splitext(str(name))[1].lower().strip() or ".srt"
                                if suffix.startswith(".") is False:
                                    suffix = f".{suffix}"
                                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
                                    if isinstance(data, (bytes, bytearray)):
                                        f.write(data)
                                    else:
                                        f.write(bytes(data))
                                    tmp_path = f.name

                                from course.importer import _subtitle_file_has_english

                                try:
                                    is_ok = await asyncio.to_thread(_subtitle_file_has_english, Path(tmp_path))
                                except Exception:
                                    is_ok = False
                                if not is_ok:
                                    _set_subtitle_path(None)
                                    _set_status(
                                        ("上传的字幕/歌词不包含足够英文内容" if is_zh else "Uploaded subtitles/lyrics does not contain enough English content"),
                                        c.danger,
                                    )
                                    return

                                _set_subtitle_path(tmp_path)
                                _set_status(("已上传字幕/歌词文件" if is_zh else "Subtitles/lyrics uploaded"), c.success)
                            except Exception as err:
                                _set_status((f"上传失败: {err}" if is_zh else f"Upload failed: {err}"), c.danger)

                        with ui.row().classes("w-full mb-2 gap-2"):
                            url_btn = ui.button(_t("import_url"), on_click=lambda: _switch_source("url")).props("flat dense")
                            local_btn = ui.button(_t("import_local"), on_click=lambda: _switch_source("local")).props(
                                "flat dense"
                            )

                        with ui.column().classes("w-full gap-2") as online_content:
                            url_input = ui.input(
                                label=_t("import_url"),
                                placeholder=_t("url_placeholder"),
                            ).classes("w-full")
                            if preset_url:
                                url_input.value = preset_url
                            with ui.row().classes("w-full items-center justify-between mt-2 gap-3"):
                                download_video_checkbox = ui.checkbox(
                                    "下载视频（用于练习页播放）" if is_zh else "Download video (for playback in practice page)",
                                    value=bool(preset_download_video),
                                )
                                ui.element("div")

                        with ui.column().classes("w-full gap-2") as local_content:
                            local_media_input = ui.input(
                                label=("已选择媒体" if is_zh else "Selected media"),
                                placeholder=("点击右侧按钮选择文件" if is_zh else "Click the button to pick a file"),
                            ).props("readonly").classes("w-full")
                            local_ui["path_input"] = local_media_input
                            local_subtitle_input = ui.input(
                                label=("已匹配字幕/歌词" if is_zh else "Matched subtitles/lyrics"),
                                placeholder=("选择媒体后自动匹配（需英文）" if is_zh else "Auto-matches after selecting media (English required)"),
                            ).props("readonly").classes("w-full")
                            local_ui["subtitle_input"] = local_subtitle_input

                            with ui.column().classes("w-full gap-2") as local_tauri_area:
                                with ui.row().classes("w-full justify-end"):
                                    ui.button(
                                        ("选择媒体文件" if is_zh else "Pick media file"),
                                        on_click=lambda: asyncio.create_task(_pick_local_media()),
                                    ).props("outline")
                                with ui.row().classes("w-full justify-end gap-2"):
                                    ui.button(
                                        ("重新自动匹配" if is_zh else "Re-match"),
                                        on_click=lambda: asyncio.create_task(_refresh_auto_subtitle()),
                                    ).props("outline")
                                    ui.button(
                                        ("选择字幕/歌词（可选）" if is_zh else "Pick subtitles/lyrics (optional)"),
                                        on_click=lambda: asyncio.create_task(_pick_local_subtitle()),
                                    ).props("outline")
                                ui.label(
                                    (
                                        "字幕/歌词：自动匹配同目录的 srt/vtt/ass/ssa/lrc/sub（优先英文）。"
                                        if is_zh
                                        else "Subtitles/Lyrics: auto-match srt/vtt/ass/ssa/lrc/sub from the same folder (English-first)."
                                    )
                                ).classes("text-xs mt-1").style(f"color:{c.text_disabled};")

                            with ui.column().classes("w-full gap-2") as local_upload_area:
                                ui.upload(
                                    label=("上传媒体文件" if is_zh else "Upload media"),
                                    auto_upload=True,
                                    on_upload=_handle_media_upload,
                                ).props(
                                    "accept=.mp4,.mkv,.mov,.avi,.webm,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus"
                                ).classes("w-full")
                                ui.upload(
                                    label=("上传字幕/歌词（必选，需英文）" if is_zh else "Upload subtitles/lyrics (required, English)"),
                                    auto_upload=True,
                                    on_upload=_handle_subtitle_upload,
                                ).props("accept=.srt,.vtt,.ass,.ssa,.lrc,.sub").classes("w-full")
                                ui.label(
                                    (
                                        "开发环境运行在浏览器里拿不到真实本地路径，所以用上传方式。建议仅用小文件做联调。"
                                        if is_zh
                                        else "Dev runs in browser, real local paths are unavailable, so uploads are used. Prefer small files for debugging."
                                    )
                                ).classes("text-xs mt-1").style(f"color:{c.text_disabled};")

                            local_tauri_area.set_visibility(False)
                            local_upload_area.set_visibility(False)

                            async def _sync_local_picker_mode() -> None:
                                ok = await _ensure_tauri_available()
                                try:
                                    local_tauri_area.set_visibility(bool(ok))
                                    local_upload_area.set_visibility(not bool(ok))
                                except Exception:
                                    pass

                            asyncio.create_task(_sync_local_picker_mode())

                        local_content.set_visibility(False)
                        _apply_source_styles()

                    with ui.column().classes("w-[260px] max-w-full"):
                        ui.button(
                            "Bilibili 登录" if is_zh else "Login Bilibili",
                            on_click=login_bilibili,
                        ).props("outline").classes("w-full")
                        ui.label(
                            "用于解决 Bilibili 字幕拿不到/只有中文的问题。"
                            if is_zh
                            else "Helps access Bilibili subtitles when login is required."
                        ).classes("text-xs mt-2").style(f"color:{c.text_disabled};")

            with ui.tab_panel(v2_tab):
                with ui.row().classes("w-full items-center justify-between"):
                    ui.label("解说设置" if is_zh else "Commentary settings").classes("text-base font-semibold").style(
                        f"color:{c.text_primary};"
                    )
                    pregen_checkbox = ui.checkbox(
                        "导入后自动生成" if is_zh else "Auto-generate after import",
                        value=bool(default_pregen_enabled),
                    )

                audience_options = {"adult": "成人", "child": "儿童"} if is_zh else {"adult": "Adult", "child": "Kids"}
                lang_options = {"zh": "中文" if is_zh else "Chinese", "en": "英文" if is_zh else "English"}

                default_level_standard, default_level_key = _normalize_level_pref(default_v2_english_level)
                level_standard_options = _level_standard_options(is_zh)
                initial_level_options = _level_options(default_level_standard, is_zh)
                if str(default_level_key or "") not in set(initial_level_options.keys()):
                    default_level_key = "cn:k0" if default_level_standard == "cn" else "cefr:b1"

                with ui.row().classes("w-full gap-4 mt-3"):
                    with ui.column().classes("flex-1 min-w-[160px]"):
                        ui.label("解说语言" if is_zh else "Language").classes("text-sm").style(f"color:{c.text_secondary};")
                        v2_lang_select = ui.select(lang_options, value=str(default_pregen_lang)).props("dense").classes("w-full")
                    with ui.column().classes("flex-1 min-w-[160px]"):
                        ui.label("受众" if is_zh else "Audience").classes("text-sm").style(f"color:{c.text_secondary};")
                        v2_audience_select = ui.select(audience_options, value=str(default_v2_audience)).props("dense").classes(
                            "w-full"
                        )
                    with ui.column().classes("flex-1 min-w-[180px]"):
                        ui.label("英语水平" if is_zh else "Level").classes("text-sm").style(f"color:{c.text_secondary};")
                        with ui.row().classes("w-full gap-2 items-center"):
                            v2_level_standard_select = (
                                ui.select(level_standard_options, value=str(default_level_standard))
                                .props("dense")
                                .classes("w-[120px]")
                            )
                            v2_level_select = ui.select(initial_level_options, value=str(default_level_key)).props("dense").classes(
                                "flex-1"
                            )

                        def _sync_level_options() -> None:
                            standard = str(v2_level_standard_select.value or "global").strip().lower()
                            options = _level_options(standard, is_zh)
                            current_value = str(v2_level_select.value or "").strip().lower()
                            v2_level_select.options = options
                            if current_value in set(options.keys()):
                                v2_level_select.value = current_value
                            else:
                                v2_level_select.value = "cn:k0" if standard == "cn" else "cefr:b1"
                            v2_level_select.update()

                        v2_level_standard_select.on("update:model-value", lambda _: _sync_level_options())

                ui.label("解说模型" if is_zh else "Narration model").classes("text-sm mt-3").style(
                    f"color:{c.text_secondary};"
                )
                desired_coach_model = str(current_model or "").strip()
                coach_model_select = (
                    ui.select(
                        options={"": _t("auto")},
                        value="",
                    )
                    .props("dense")
                    .classes("w-full")
                )

                engine_options = (
                    {"vibevoice": "VibeVoice", "cosyvoice": "CosyVoice"}
                    if not is_zh
                    else {"vibevoice": "VibeVoice", "cosyvoice": "CosyVoice"}
                )
                ui.label("TTS 引擎" if is_zh else "TTS engine").classes("text-sm mt-3").style(f"color:{c.text_secondary};")
                with ui.row().classes("w-full gap-4 mt-2"):
                    with ui.column().classes("flex-1"):
                        tts_engine_select = (
                            ui.select(
                                options=engine_options,
                                value=str(current_tts_engine),
                            )
                            .props("dense")
                            .classes("w-full")
                        )
                    with ui.column().classes("flex-1") as tts_model_col:
                        ui.label("模型" if is_zh else "Model").classes("text-sm").style(f"color:{c.text_secondary};")
                        initial_model_options = (
                            {current_tts_model_id: current_tts_model_id} if current_tts_model_id else {"": ""}
                        )
                        tts_model_select = (
                            ui.select(
                                options=initial_model_options,
                                value=str(current_tts_model_id),
                            )
                            .props("dense")
                            .classes("w-full")
                        )

                quality_label_map = (
                    {"fast": "Fast (0.5B)", "standard": "Standard (1.5B)", "high": "High (7B)"}
                    if not is_zh
                    else {"fast": "快速 (0.5B)", "standard": "标准 (1.5B)", "high": "高质量 (7B)"}
                )
                quality_options = {k: v for k, v in quality_label_map.items()}
                with ui.row().classes("w-full gap-4 mt-2"):
                    with ui.column().classes("flex-1") as tts_quality_col:
                        ui.label(_t("tts_quality")).classes("text-sm").style(f"color:{c.text_secondary};")
                        tts_quality_select = (
                            ui.select(
                                options=quality_options,
                                value=str(current_tts_quality or "fast"),
                            )
                            .props("dense")
                            .classes("w-full")
                        )
                    with ui.column().classes("flex-1"):
                        ui.label(_t("tts_voice")).classes("text-sm").style(f"color:{c.text_secondary};")
                        initial_voice_options = (
                            {str(current_tts_voice): str(current_tts_voice)} if str(current_tts_voice).strip() else {}
                        )
                        tts_voice_select = (
                            ui.select(
                                options=initial_voice_options,
                                value=str(current_tts_voice or ""),
                            )
                            .props("dense")
                            .classes("w-full")
                        )

            with ui.tab_panel(direction_tab):
                with ui.row().classes("w-full items-center justify-between"):
                    ui.label("解说方向" if is_zh else "Narration Directions").classes("text-base font-semibold").style(
                        f"color:{c.text_primary};"
                    )
                
                direction_hint = ui.label(
                    "正在准备分析内容..." if is_zh 
                    else "Preparing to analyze content..."
                ).classes("text-sm mt-2").style(f"color:{c.text_secondary};")
                
                direction_loading = ui.row().classes("w-full items-center gap-2 mt-3")
                direction_loading.set_visibility(False)
                with direction_loading:
                    ui.spinner(size="sm")
                    ui.label("正在分析内容..." if is_zh else "Analyzing content...").classes("text-sm").style(
                        f"color:{c.text_secondary};"
                    )
                
                # Course type display
                course_type_label = ui.label("").classes("text-sm mt-3").style(f"color:{c.text_primary};")
                course_type_label.set_visibility(False)
                
                # Direction checkboxes container
                direction_list = ui.column().classes("w-full mt-3 gap-2")
                direction_list.set_visibility(False)
                
                async def _analyze_directions() -> None:
                    """Analyze content and suggest directions."""
                    course = imported_course_ref.get("course")
                    if not course:
                        return
                    
                    direction_state["analyzing"] = True
                    direction_hint.set_visibility(False)
                    direction_loading.set_visibility(True)
                    
                    try:
                        from storage.v2_player import V2PlayerPaths, AnalysisBundle
                        
                        paths = V2PlayerPaths.from_db_path(
                            Path(course_db.db_path),
                            str(course.id),
                        )
                        
                        # Try to load existing analysis bundle
                        bundle = None
                        if paths.subtitles_json.exists():
                            try:
                                bundle = AnalysisBundle.from_json(
                                    paths.subtitles_json.read_text(encoding="utf-8")
                                )
                            except Exception:
                                pass
                        
                        if bundle is None:
                            # Need to run analysis first
                            from services.v2_player import Analyzer
                            subtitle_path = Path(course.subtitle_path) if hasattr(course, "subtitle_path") and course.subtitle_path else None
                            video_path = Path(course.video_path) if hasattr(course, "video_path") and course.video_path else None
                            
                            if not subtitle_path or not subtitle_path.exists():
                                direction_hint.text = "无法分析：未找到字幕文件" if is_zh else "Cannot analyze: no subtitle file found"
                                direction_hint.set_visibility(True)
                                direction_loading.set_visibility(False)
                                return
                            
                            analyzer = Analyzer(paths=paths, subtitle_path=subtitle_path, video_path=video_path)
                            bundle = await analyzer.analyze_full(skip_existing=True)
                        
                        # Analyze directions
                        dir_analyzer = DirectionAnalyzer()
                        suggestions = await dir_analyzer.analyze(
                            bundle,
                            title=str(getattr(course, "title", "") or ""),
                            audience=str(v2_audience_select.value or "adult"),
                            english_level=str(v2_level_select.value or "intermediate"),
                            narration_lang=str(v2_lang_select.value or "zh"),
                        )
                        
                        direction_state["suggestions"] = suggestions
                        direction_state["analyzed"] = True
                        direction_state["course_type"] = suggestions.course_type
                        
                        # Update UI
                        course_type_label.text = (
                            f"检测到的内容类型: {suggestions.course_type} ({suggestions.course_type_reason})"
                            if is_zh else
                            f"Detected content type: {suggestions.course_type} ({suggestions.course_type_reason})"
                        )
                        course_type_label.set_visibility(True)
                        
                        # Build checkboxes
                        direction_list.clear()
                        direction_state["checkboxes"] = {}
                        
                        with direction_list:
                            for sug in suggestions.suggestions:
                                with ui.row().classes("w-full items-center gap-2"):
                                    cb = ui.checkbox(
                                        sug.label,
                                        value=sug.selected,
                                    ).classes("flex-1")
                                    direction_state["checkboxes"][sug.direction_type] = cb
                                    
                                    if sug.reason:
                                        ui.label(f"({sug.reason})").classes("text-xs").style(
                                            f"color:{c.text_disabled};"
                                        )
                        
                        direction_list.set_visibility(True)
                        
                    except Exception as e:
                        logger.exception("Direction analysis failed")
                        direction_hint.text = (
                            f"分析失败: {e}" if is_zh else f"Analysis failed: {e}"
                        )
                        direction_hint.set_visibility(True)
                    finally:
                        direction_state["analyzing"] = False
                        direction_loading.set_visibility(False)
                
                def _get_selected_directives() -> Optional[NarrationDirectives]:
                    """Get selected directions as NarrationDirectives."""
                    if not direction_state.get("analyzed"):
                        return None
                    
                    checkboxes = direction_state.get("checkboxes", {})
                    selected = [
                        dtype for dtype, cb in checkboxes.items()
                        if cb.value
                    ]
                    
                    if not selected:
                        return None
                    
                    return NarrationDirectives(
                        directions=selected,
                        focus_level="medium",
                        course_type=str(direction_state.get("course_type", "general")),
                        audience=str(v2_audience_select.value or "adult"),
                        english_level=str(v2_level_select.value or "intermediate"),
                        narration_lang=str(v2_lang_select.value or "zh"),
                    )

        status_label = ui.label("").classes("text-sm mt-2")
        status_label.set_visibility(False)

        async def _load_llm_models() -> None:
            try:
                result = await host.models.list_all()
            except Exception:
                return
            models_data = (result or {}).get("models", {}) or {}
            options: dict[str, str] = {"": _t("auto")}
            for m in models_data.get("local", []) or []:
                if not isinstance(m, dict):
                    continue
                model_key = str(m.get("model_key") or f"local:{m.get('id')}").strip()
                if not model_key:
                    continue
                name = str(m.get("name") or m.get("id") or model_key)
                options[model_key] = f"🖥️ {name}"
            for provider_id, models_list in (models_data.get("cloud", {}) or {}).items():
                for m in models_list or []:
                    if not isinstance(m, dict):
                        continue
                    model_key = str(m.get("model_key") or m.get("id") or "").strip()
                    if not model_key:
                        continue
                    provider_name = str(m.get("provider_name") or provider_id or "cloud")
                    name = str(m.get("name") or model_key)
                    options[model_key] = f"☁️ {provider_name}: {name}"
            coach_model_select.options = options
            current_value = str(coach_model_select.value or "").strip()
            if current_value and current_value in options:
                pass
            elif not current_value and desired_coach_model and desired_coach_model in options:
                coach_model_select.value = desired_coach_model
            else:
                coach_model_select.value = ""
            coach_model_select.update()

        def _selected_engine() -> str:
            return str(tts_engine_select.value or "vibevoice").strip().lower() or "vibevoice"

        def _selected_model_id() -> Optional[str]:
            v = str(tts_model_select.value or "").strip()
            return v or None

        def _sync_tts_visibility() -> None:
            eng = _selected_engine()
            tts_model_col.set_visibility(eng in {"cosyvoice", "cosyvoice3"})
            tts_quality_col.set_visibility(eng in {"vibevoice", ""})

        def _clear_tts_voice_options() -> None:
            tts_voice_select.options = {"": ""}
            tts_voice_select.value = ""
            try:
                tts_voice_select.update()
            except Exception:
                pass

        async def _load_tts_models() -> None:
            engine_value = _selected_engine()
            if engine_value not in {"cosyvoice", "cosyvoice3"}:
                tts_model_select.options = {"": ""}
                tts_model_select.value = ""
                tts_model_select.update()
                return

            try:
                resp = await host.tools.call("dawnchat.tts.list_models", arguments={"engine": engine_value})
            except Exception:
                return
            if not isinstance(resp, dict) or int(resp.get("code") or 0) != 200:
                return
            data = resp.get("data") or {}
            models = data.get("models") or []
            if not isinstance(models, list):
                models = []

            installed: list[tuple[str, str]] = []
            all_items: list[tuple[str, str]] = []
            for m in models:
                if not isinstance(m, dict):
                    continue
                mid = str(m.get("model_id") or m.get("id") or "").strip()
                if not mid:
                    continue
                name = str(m.get("name") or mid).strip() or mid
                all_items.append((mid, name))
                if bool(m.get("installed")) and not bool(m.get("is_resource_only")):
                    installed.append((mid, name))

            candidates = installed or all_items
            options: dict[str, str] = {}
            for mid, label in candidates:
                options[mid] = label
            if not options:
                tts_model_select.options = {"": ""}
                tts_model_select.value = ""
                tts_model_select.update()
                return

            current = str(tts_model_select.value or "").strip()
            tts_model_select.options = options
            if current not in options:
                tts_model_select.value = next(iter(options.keys()))
            tts_model_select.update()

        async def _load_tts_voices() -> None:
            engine_value = _selected_engine()
            args: dict[str, Any] = {"engine": engine_value}
            model_id_value = _selected_model_id()
            if engine_value in {"cosyvoice", "cosyvoice3"} and model_id_value:
                args["model_id"] = model_id_value
            try:
                resp = await host.tools.call("dawnchat.tts.list_voices", arguments=args)
            except Exception:
                voice_state["all"] = {}
                _clear_tts_voice_options()
                return
            if not isinstance(resp, dict) or int(resp.get("code") or 0) != 200:
                voice_state["all"] = {}
                _clear_tts_voice_options()
                return 
            data = resp.get("data") or {}
            voice_state["all"] = data
            _apply_tts_voice_options()

        async def _load_tts_quality_options() -> None:
            if _selected_engine() not in {"vibevoice", ""}:
                tts_quality_select.options = {"fast": quality_label_map.get("fast", "fast")}
                tts_quality_select.value = "fast"
                tts_quality_select.update()
                _apply_tts_voice_options()
                return
            try:
                resp = await host.tools.call("dawnchat.tts.list_models", arguments={"engine": "vibevoice"})
            except Exception:
                return
            if not isinstance(resp, dict) or int(resp.get("code") or 0) != 200:
                return
            data = resp.get("data") or {}
            models = data.get("models") or []
            if not isinstance(models, list):
                models = []

            size_to_quality = {"0.5B": "fast", "1.5B": "standard", "7B": "high"}
            installed_qualities: set[str] = set()
            for m in models:
                if not isinstance(m, dict):
                    continue
                if not bool(m.get("installed")):
                    continue
                size = str(m.get("size") or "").strip()
                q = size_to_quality.get(size)
                if q:
                    installed_qualities.add(q)

            ordered = ["fast", "standard", "high"]
            active = [q for q in ordered if q in installed_qualities]
            if not active:
                active = ordered

            options = {q: quality_label_map.get(q, q) for q in active}
            if not options:
                return

            tts_quality_select.options = options
            if str(tts_quality_select.value or "") not in set(options.keys()):
                tts_quality_select.value = "fast" if "fast" in options else next(iter(options.keys()))
            tts_quality_select.update()
            _apply_tts_voice_options()

        voice_state: dict[str, object] = {"all": {}}

        def _apply_tts_voice_options() -> None:
            payload = voice_state.get("all")
            if not isinstance(payload, dict):
                payload = {}

            selected_quality = str(tts_quality_select.value or "fast").strip() or "fast"

            by_quality = payload.get("by_quality")
            if isinstance(by_quality, dict) and _selected_engine() in {"vibevoice", ""}:
                raw = by_quality.get(selected_quality)
                candidates = raw if isinstance(raw, list) else []
            else:
                raw = payload.get("voices")
                candidates = raw if isinstance(raw, list) else []

            options: dict[str, str] = {}
            for v in candidates:
                s = str(v or "").strip()
                if s:
                    options[s] = s

            if not options:
                return

            current = str(tts_voice_select.value or "").strip()
            tts_voice_select.options = options
            if current not in options:
                tts_voice_select.value = next(iter(options.keys()))
            tts_voice_select.update()

        async def _refresh_tts_for_engine_change() -> None:
            _sync_tts_visibility()
            voice_state["all"] = {}
            _clear_tts_voice_options()
            if _selected_engine() in {"cosyvoice", "cosyvoice3"}:
                await _load_tts_models()
                await _load_tts_voices()
                return
            await _load_tts_quality_options()
            await _load_tts_voices()

        async def _refresh_tts_for_model_change() -> None:
            voice_state["all"] = {}
            _clear_tts_voice_options()
            await _load_tts_voices()

        asyncio.create_task(_load_llm_models())
        _sync_tts_visibility()
        asyncio.create_task(_load_tts_models())
        asyncio.create_task(_load_tts_voices())
        asyncio.create_task(_load_tts_quality_options())
        tts_engine_select.on("update:model-value", lambda _: asyncio.create_task(_refresh_tts_for_engine_change()))
        tts_model_select.on("update:model-value", lambda _: asyncio.create_task(_refresh_tts_for_model_change()))
        tts_quality_select.on("update:model-value", lambda _: _apply_tts_voice_options())

        with ui.row().classes("w-full mt-2"):
            progress_bar = ui.linear_progress(value=0).classes("flex-1")
            progress_bar.set_visibility(False)
            progress_label = ui.label("").classes("text-sm")
            progress_label.set_visibility(False)

        pregen_actions = ui.row().classes("w-full justify-end gap-2 mt-2")
        pregen_actions.set_visibility(False)
        with pregen_actions:
            cancel_pregen_btn = ui.button(
                "取消生成" if lang.startswith("zh") else "Cancel generation",
            ).props("outline dense")
            retry_pregen_btn = ui.button(
                "失败重试" if lang.startswith("zh") else "Retry failed",
            ).props("outline dense")
            retry_pregen_btn.set_visibility(False)

        async def _cancel_pregen() -> None:
            task = v2_task_ref.get("task")
            if isinstance(task, asyncio.Task) and not task.done():
                try:
                    task.cancel()
                except Exception:
                    pass
            status_label.text = "已请求取消预生成" if lang.startswith("zh") else "Cancellation requested"
            status_label.style(f"color: {c.warning};")

        def _retry_pregen() -> None:
            cid = str(imported_course_id.get("course_id") or "").strip()
            course = imported_course_ref.get("course")
            if not cid or not course:
                return
            try:
                narration_lang = str(imported_v2_args.get("narration_lang") or "zh")
                audience = str(imported_v2_args.get("audience") or "adult")
                english_level = str(imported_v2_args.get("english_level") or "intermediate")
                if narration_lang:
                    v2_lang_select.value = narration_lang
                    v2_lang_select.update()
                if audience:
                    v2_audience_select.value = audience
                    v2_audience_select.update()
                if english_level:
                    v2_level_select.value = english_level
                    v2_level_select.update()
            except Exception:
                pass
            try:
                starter = v2_task_ref.get("start")
                if callable(starter):
                    r = starter(False, stage="tts_failed_only")
                    if inspect.isawaitable(r):
                        asyncio.create_task(r)
            except Exception:
                pass
            status_label.text = "已开始重试失败项" if lang.startswith("zh") else "Retrying failed items"
            status_label.style(f"color: {c.warning};")

        cancel_pregen_btn.on("click", lambda: asyncio.create_task(_cancel_pregen()))
        retry_pregen_btn.on("click", _retry_pregen)

        post_import_actions = ui.row().classes("w-full gap-2 mt-4")
        post_import_actions.set_visibility(False)

        def _nav_to(path: str) -> None:
            dialog.close()
            ui.navigate.to(f"{str(path)}?theme={theme_mode}&lang={lang}")

        with post_import_actions:
            ui.button(
                "开始跟读" if lang.startswith("zh") else "Practice",
                on_click=lambda: _nav_to(f"/practice/{imported_course_id['course_id']}"),
            ).props("outline").classes("flex-1")
            ui.button(
                "进入解说" if lang.startswith("zh") else "Smart Player",
                on_click=lambda: _nav_to(f"/v2/player/{imported_course_id['course_id']}"),
            ).props("color=primary").classes("flex-1")

        with ui.row().classes("w-full justify-end gap-2 mt-6"):
            ui.button(
                _t("cancel") if _t("cancel") != "cancel" else ("取消" if lang.startswith("zh") else "Cancel"),
                on_click=dialog.close,
            ).props("flat")
            next_btn = ui.button("下一步" if lang.startswith("zh") else "Next").props("outline")
            import_btn = ui.button(primary_button_text or _t("import_video"), on_click=do_import).props("color=primary")

        def _sync_step_actions() -> None:
            if imported_course_id.get("course_id"):
                import_btn.set_visibility(False)
                next_btn.set_visibility(False)
                return
            # Show import button only on direction_tab (final step)
            active_is_direction = tabs.value == direction_tab
            import_btn.set_visibility(bool(active_is_direction))
            next_btn.set_visibility(not bool(active_is_direction))

        async def _do_import_only() -> bool:
            """Import video/subtitle only, without starting v2 preprocessing."""
            _set_status(
                ("正在导入视频和字幕..." if lang.startswith("zh") else "Importing video and subtitles..."),
                c.warning,
            )
            
            try:
                from course.importer import CourseImporter

                importer = CourseImporter()
                import_mode = str(import_source.get("mode") or "url").strip().lower()
                if import_mode == "local":
                    media_path = str(local_state.get("media_path") or "").strip()
                    subtitle_path = str(local_state.get("subtitle_path") or "").strip() or None
                    
                    result = await importer.import_from_local(
                        media_path,
                        subtitle_path=subtitle_path,
                        difficulty=str(preset_difficulty or "medium"),
                        course_id=(str(getattr(reuse_course, "id")) if reuse_course is not None else None),
                    )
                else:
                    url = str(url_input.value or "").strip()
                    result = await importer.import_from_url(
                        url,
                        download_video=bool(download_video_checkbox.value),
                        difficulty=str(preset_difficulty or "medium"),
                        reuse_course=reuse_course,
                    )

                if result.get("error"):
                    error_msg = result.get("message", _t('import_error'))
                    if "no english subtitle" in str(error_msg).lower():
                        error_msg = _t('no_english_subtitle')
                    _set_status(str(error_msg), c.danger)
                    return False

                course = result.get("course")
                if course:
                    if on_imported is not None:
                        r = on_imported(course)
                        if inspect.isawaitable(r):
                            await r
                    else:
                        course_db.save(course)

                    imported_course_id["course_id"] = str(course.id)
                    imported_course_ref["course"] = course
                    
                    narration_lang = str(v2_lang_select.value or "zh").strip() or "zh"
                    v2_audience = str(v2_audience_select.value or "adult").strip() or "adult"
                    v2_level = str(v2_level_select.value or "intermediate").strip() or "intermediate"
                    selected_llm_model = str(coach_model_select.value or "").strip() or ""
                    
                    imported_v2_args["narration_lang"] = str(narration_lang)
                    imported_v2_args["audience"] = str(v2_audience)
                    imported_v2_args["english_level"] = str(v2_level)
                    imported_v2_args["llm_model"] = str(selected_llm_model)
                    
                    _set_status(
                        ("导入成功，正在分析内容..." if lang.startswith("zh") else "Import successful, analyzing content..."),
                        c.success,
                    )
                    return True
                else:
                    _set_status(_t('import_error'), c.danger)
                    return False

            except Exception as e:
                logger.error(f"Import failed: {e}", exc_info=True)
                err = str(e)
                if "Server disconnected without sending a response" in err:
                    _set_status(
                        ("下载服务意外断开，请重启 DawnChat 后重试。" if lang.startswith("zh") else "Download service disconnected. Please restart DawnChat and retry."),
                        c.danger,
                    )
                else:
                    _set_status(f"{_t('import_error')}: {err}", c.danger)
                return False

        async def _go_next_async() -> None:
            current_tab = tabs.value
            
            if current_tab == basic_tab:
                # Validate basic tab
                import_mode = str(import_source.get("mode") or "url").strip().lower()
                if import_mode == "local":
                    media_path = str(local_state.get("media_path") or "").strip()
                    if not media_path:
                        _set_status(
                            ("请选择本地媒体文件" if lang.startswith("zh") else "Please pick a local media file"),
                            c.danger,
                        )
                        return
                else:
                    url = str(url_input.value or "").strip()
                    if not url:
                        _set_status("请输入视频链接" if lang.startswith("zh") else "Please enter a video URL", c.danger)
                        return
                # Go to settings tab
                tabs.value = v2_tab
                tabs.update()
                _sync_step_actions()
            
            elif current_tab == v2_tab:
                # Go to direction tab - first import, then analyze
                tabs.value = direction_tab
                tabs.update()
                _sync_step_actions()
                
                # If not already imported, do import first
                if not imported_course_ref.get("course"):
                    success = await _do_import_only()
                    if not success:
                        # Go back to basic tab on failure
                        tabs.value = basic_tab
                        tabs.update()
                        _sync_step_actions()
                        return
                
                # Trigger direction analysis
                if not direction_state.get("analyzed") and not direction_state.get("analyzing"):
                    await _analyze_directions()

        def _go_next() -> None:
            asyncio.create_task(_go_next_async())

        next_btn.on("click", _go_next)
        tabs.on("update:model-value", lambda _: _sync_step_actions())
        _sync_step_actions()

        async def _poll_progress() -> None:
            running = bool(v2_progress.get("running", False))
            total = int(v2_progress.get("total", 0) or 0)
            done = int(v2_progress.get("done", 0) or 0)
            failed = int(v2_progress.get("failed", 0) or 0)
            last_error = str(v2_progress.get("last_error", "") or "").strip()
            frac = float(v2_progress.get("progress", 0.0) or 0.0)

            show_retry = (not running) and (bool(failed > 0 and total > 0) or (last_error not in {"", "cancelled"}))
            retry_pregen_btn.set_visibility(bool(show_retry))
            cancel_pregen_btn.set_visibility(bool(running))
            pregen_actions.set_visibility(bool(running) or bool(show_retry))

            if running or frac > 0:
                progress_bar.value = max(0.0, min(1.0, frac))
                progress_bar.set_visibility(True)

            if running:
                if total > 0:
                    progress_label.text = (
                        f"v2 预处理：{done}/{total}（失败 {failed}）"
                        if lang.startswith("zh")
                        else f"v2 preprocessing: {done}/{total} (failed {failed})"
                    )
                else:
                    msg = str(v2_progress.get("message", "") or "").strip()
                    progress_label.text = (f"v2 预处理中：{msg}" if lang.startswith("zh") else f"v2 preprocessing: {msg}")
                progress_label.set_visibility(True)
            else:
                if last_error == "cancelled":
                    progress_label.text = "预生成已取消" if lang.startswith("zh") else "Pre-generation cancelled"
                    progress_label.set_visibility(True)
                elif last_error:
                    progress_label.text = (
                        f"预生成失败：{last_error}" if lang.startswith("zh") else f"Pre-generation failed: {last_error}"
                    )
                    progress_label.set_visibility(True)
                elif frac >= 1.0:
                    progress_label.text = "预生成已完成" if lang.startswith("zh") else "Pre-generation completed"
                    progress_label.set_visibility(True)

            if running and failed > 0:
                status_label.text = (
                    f"导入成功，预生成中（失败 {failed}）"
                    if lang.startswith("zh")
                    else f"Imported. Pre-generating (failed {failed})"
                )
                status_label.style(f"color: {c.warning};")

        ui.timer(0.6, _poll_progress)
    
    dialog.open()
