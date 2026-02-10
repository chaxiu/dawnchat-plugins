"""
Settings Page - LLM/TTS configuration and account settings.
"""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING, Any

from nicegui import ui

from dawnchat_sdk import host
from i18n import i18n

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase

logger = logging.getLogger("echoflow.settings_page")


async def render_settings_content(
    container,
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
):
    """
    Render settings page content inside a given container.

    Args:
        container: NiceGUI container element to render into
        course_db: Course database instance
        theme: UI theme object
        lang: Language code
    """
    c = theme.colors

    def _t(key: str) -> str:
        return i18n.t(key, lang)

    # Add styles
    _add_settings_styles(c)

    # Get current preferences
    prefs = course_db.get_app_prefs() or {}
    current_model = str(prefs.get("llm_model") or "")
    current_tts_engine = str(prefs.get("tts_engine") or "vibevoice").strip() or "vibevoice"
    current_tts_model_id = str(prefs.get("tts_model_id") or "").strip()
    current_tts_voice = str(prefs.get("tts_voice") or "Emma")
    current_tts_quality = str(prefs.get("tts_quality") or "fast")

    # Status message container
    status_ref: dict[str, Any] = {"label": None}

    def set_status(msg: str, color: str):
        if status_ref["label"]:
            status_ref["label"].text = msg
            status_ref["label"].style(f"color: {color};")
            status_ref["label"].visible = bool(msg)

    with container:
        # Page title
        ui.label(_t("settings")).classes("text-2xl font-bold mb-6").style(
            f"color: {c.text_primary};"
        )

        # Settings sections
        with ui.element("div").classes("settings-sections"):
            # LLM Settings
            with ui.element("div").classes("settings-card"):
                ui.label(_t("llm_settings")).classes("settings-card-title")

                ui.label(_t("llm_model")).classes("text-sm mt-4 mb-1").style(
                    f"color: {c.text_secondary};"
                )
                llm_model_select = ui.select(
                    options={"": _t("auto")},
                    value="",
                ).props("outlined dense").classes("w-full max-w-md")

            # TTS Settings
            with ui.element("div").classes("settings-card"):
                ui.label(_t("tts_settings")).classes("settings-card-title")

                with ui.row().classes("gap-4 flex-wrap mt-4"):
                    with ui.column().classes("flex-1 min-w-[200px]"):
                        ui.label(_t("tts_engine")).classes("text-sm mb-1").style(
                            f"color: {c.text_secondary};"
                        )
                        tts_engine_select = ui.select(
                            options={"vibevoice": "VibeVoice", "cosyvoice": "CosyVoice"},
                            value=current_tts_engine,
                        ).props("outlined dense").classes("w-full")

                    tts_model_col = ui.column().classes("flex-1 min-w-[200px]")
                    with tts_model_col:
                        ui.label(_t("tts_model")).classes("text-sm mb-1").style(
                            f"color: {c.text_secondary};"
                        )
                        tts_model_select = ui.select(
                            options={current_tts_model_id: current_tts_model_id} if current_tts_model_id else {"": ""},
                            value=current_tts_model_id,
                        ).props("outlined dense").classes("w-full")

                with ui.row().classes("gap-4 flex-wrap mt-4"):
                    tts_quality_col = ui.column().classes("flex-1 min-w-[200px]")
                    with tts_quality_col:
                        ui.label(_t("tts_quality")).classes("text-sm mb-1").style(
                            f"color: {c.text_secondary};"
                        )
                        tts_quality_select = ui.select(
                            options={
                                "fast": _t("quality_fast"),
                                "standard": _t("quality_standard"),
                                "high": _t("quality_high"),
                            },
                            value=current_tts_quality,
                        ).props("outlined dense").classes("w-full")

                    with ui.column().classes("flex-1 min-w-[200px]"):
                        ui.label(_t("tts_voice")).classes("text-sm mb-1").style(
                            f"color: {c.text_secondary};"
                        )
                        tts_voice_select = ui.select(
                            options={current_tts_voice: current_tts_voice} if current_tts_voice else {},
                            value=current_tts_voice,
                        ).props("outlined dense").classes("w-full")

            # Account Settings
            with ui.element("div").classes("settings-card"):
                ui.label(_t("account_settings")).classes("settings-card-title")

                with ui.row().classes("items-center gap-4 mt-4"):
                    with ui.column().classes("flex-1"):
                        ui.label(_t("bilibili_login")).classes("font-medium").style(
                            f"color: {c.text_primary};"
                        )
                        ui.label(_t("bilibili_login_desc")).classes("text-sm").style(
                            f"color: {c.text_secondary};"
                        )

                    bilibili_login_btn = ui.button(
                        _t("login"), icon="login"
                    ).props("outline")

        # Status and save button
        with ui.row().classes("items-center gap-4 mt-6"):
            save_btn = ui.button(_t("save"), icon="save").props("color=primary")
            status_label = ui.label("").classes("text-sm")
            status_label.visible = False
            status_ref["label"] = status_label

    # Event handlers
    async def load_llm_models():
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
        llm_model_select.options = options
        if current_model and current_model in options:
            llm_model_select.value = current_model
        llm_model_select.update()

    async def load_tts_voices():
        engine = str(tts_engine_select.value or "vibevoice").strip()
        args: dict[str, Any] = {"engine": engine}
        model_id = str(tts_model_select.value or "").strip()
        if engine in {"cosyvoice", "cosyvoice3"} and model_id:
            args["model_id"] = model_id
        try:
            resp = await host.tools.call("dawnchat.tts.list_voices", arguments=args)
        except Exception:
            return
        if not isinstance(resp, dict) or int(resp.get("code") or 0) != 200:
            return
        data = resp.get("data") or {}

        # Get voices based on quality for vibevoice
        quality = str(tts_quality_select.value or "fast")
        by_quality = data.get("by_quality")
        if isinstance(by_quality, dict) and engine in {"vibevoice", ""}:
            voices = by_quality.get(quality, [])
        else:
            voices = data.get("voices", [])

        options = {str(v): str(v) for v in voices if v}
        if options:
            tts_voice_select.options = options
            current = str(tts_voice_select.value or "")
            if current not in options:
                tts_voice_select.value = next(iter(options.keys()))
            tts_voice_select.update()

    async def load_tts_models():
        engine = str(tts_engine_select.value or "vibevoice").strip()
        if engine not in {"cosyvoice", "cosyvoice3"}:
            tts_model_col.visible = False
            tts_quality_col.visible = True
            return

        tts_model_col.visible = True
        tts_quality_col.visible = False

        try:
            resp = await host.tools.call("dawnchat.tts.list_models", arguments={"engine": engine})
        except Exception:
            return
        if not isinstance(resp, dict) or int(resp.get("code") or 0) != 200:
            return
        data = resp.get("data") or {}
        models = data.get("models") or []

        installed = [
            (m.get("model_id", m.get("id")), m.get("name", m.get("model_id")))
            for m in models
            if isinstance(m, dict) and m.get("installed") and not m.get("is_resource_only")
        ]
        if not installed:
            installed = [
                (m.get("model_id", m.get("id")), m.get("name", m.get("model_id")))
                for m in models
                if isinstance(m, dict)
            ]

        options = {str(mid): str(name) for mid, name in installed if mid}
        if options:
            tts_model_select.options = options
            current = str(tts_model_select.value or "")
            if current not in options:
                tts_model_select.value = next(iter(options.keys()))
            tts_model_select.update()

    async def on_engine_change(_):
        await load_tts_models()
        await load_tts_voices()

    async def on_quality_change(_):
        await load_tts_voices()

    async def on_model_change(_):
        await load_tts_voices()

    async def save_settings():
        set_status(_t("saving"), c.text_secondary)
        try:
            engine = str(tts_engine_select.value or "vibevoice")
            model_id = str(tts_model_select.value or "")
            course_db.patch_app_prefs({
                "llm_model": str(llm_model_select.value or ""),
                "tts_engine": engine,
                "tts_model_id": model_id if engine in {"cosyvoice", "cosyvoice3"} else "",
                "tts_voice": str(tts_voice_select.value or ""),
                "tts_quality": str(tts_quality_select.value or "fast"),
            })
            set_status(_t("saved"), c.success)
        except Exception as e:
            set_status(str(e), c.danger)

    async def login_bilibili():
        set_status(_t("logging_in"), c.warning)
        try:
            result = await host.browser.login(
                url="https://passport.bilibili.com/login",
                wait_for_cookie="SESSDATA"
            )
            if result.get("code") == 200 and result.get("data", {}).get("success"):
                set_status(_t("login_success"), c.success)
            else:
                set_status(f"{_t('login_failed')}: {result.get('message')}", c.danger)
        except Exception as e:
            set_status(f"{_t('login_failed')}: {e}", c.danger)

    # Wire up events
    tts_engine_select.on("update:model-value", lambda e: asyncio.create_task(on_engine_change(e)))
    tts_quality_select.on("update:model-value", lambda e: asyncio.create_task(on_quality_change(e)))
    tts_model_select.on("update:model-value", lambda e: asyncio.create_task(on_model_change(e)))
    save_btn.on("click", lambda: asyncio.create_task(save_settings()))
    bilibili_login_btn.on("click", lambda: asyncio.create_task(login_bilibili()))

    # Initial load
    asyncio.create_task(load_llm_models())
    await load_tts_models()
    await load_tts_voices()


def _add_settings_styles(c) -> None:
    """Add CSS styles for settings page."""
    ui.add_head_html(f"""
    <style>
        .settings-sections {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
            gap: 1.25rem;
            width: 100%;
        }}
        .settings-card {{
            background: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 12px;
            padding: 1.25rem 1.5rem;
            width: 100%;
            box-sizing: border-box;
        }}
        .settings-card-title {{
            font-size: 1.1rem;
            font-weight: 600;
            color: {c.text_primary};
        }}
    </style>
    """)
