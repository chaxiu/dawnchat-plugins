import argparse
import asyncio
import json
import logging
import sys
from hashlib import md5
from pathlib import Path
from typing import Any, Dict, List, Optional

from nicegui import app, ui

from dawnchat_sdk import host, setup_plugin_logging
from dawnchat_sdk.ui import (
    Card,
    Header,
    MutedText,
    setup_dawnchat_ui,
    get_theme,
)
from i18n import i18n


logger = setup_plugin_logging("hello-tts", level=logging.INFO)

SRC_DIR = Path(__file__).parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args, _ = parser.parse_known_args()

    @ui.page("/")
    async def index(theme: str = "dark", lang: str = "zh"):
        is_dark = str(theme).lower() == "dark"
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()
        c = theme_obj.colors

        def _t(key: str) -> str:
            return i18n.t(key, lang)

        ui.add_head_html(
            f"""
            <style>
                body {{
                    background-color: {c.bg_primary} !important;
                }}
                .nicegui-content {{
                    background-color: {c.bg_primary} !important;
                }}
                .tts-card {{
                    background-color: {c.bg_secondary};
                    border: 1px solid {c.border};
                    border-radius: 12px;
                    padding: 1.25rem;
                }}
            </style>
            """
        )

        engine_options = {"vibevoice": "VibeVoice", "cosyvoice": "CosyVoice"}
        quality_options = {"fast": "fast", "standard": "standard", "high": "high"}
        mode_options = {"sft": "sft", "zero_shot": "zero_shot", "instruct2": "instruct2"}
        state: Dict[str, Any] = {
            "models": [],
            "voices": {},
        }

        def _engine_value() -> str:
            return str(engine_select.value or "vibevoice").strip().lower()

        def _model_value() -> str:
            return str(model_select.value or "").strip()

        def _quality_value() -> str:
            return str(quality_select.value or "fast").strip().lower()

        async def _call_tool(name: str, arguments: Optional[dict] = None) -> Dict[str, Any]:
            result = await host.tools.call(name, arguments=arguments or {})
            if isinstance(result, dict) and "code" in result:
                return result
            return {"code": 200, "message": "success", "data": result}

        def _build_model_options(models: List[Dict[str, Any]]) -> Dict[str, str]:
            options: Dict[str, str] = {}
            for m in models:
                mid = str(m.get("model_id") or m.get("id") or m.get("size") or "").strip()
                if not mid:
                    continue
                name = str(m.get("name") or mid).strip()
                installed = bool(m.get("installed"))
                suffix = "✅" if installed else "⏳"
                label = f"{name} {suffix}"
                options[mid] = label
            return options

        def _apply_select_options(select, options: Dict[str, str], fallback: str) -> None:
            if not options:
                options = {"": fallback}
            current = str(select.value or "").strip()
            select.options = options
            if current not in options:
                select.value = next(iter(options.keys()))
            select.update()

        def _valid_model_id(model_id: Optional[str]) -> Optional[str]:
            candidate = str(model_id or "").strip()
            if not candidate:
                return None
            valid_ids = set()
            for model in state.get("models", []):
                if not isinstance(model, dict):
                    continue
                for key in ("model_id", "id", "size"):
                    value = str(model.get(key) or "").strip()
                    if value:
                        valid_ids.add(value)
            return candidate if candidate in valid_ids else None

        async def refresh_models() -> None:
            engine = _engine_value()
            state["models"] = []
            model_select.options = {"": _t("loading")}
            model_select.value = ""
            model_select.update()
            if engine != "cosyvoice":
                _apply_select_options(model_select, {"": _t("empty_models")}, _t("empty_models"))
                await refresh_voices()
                return
            try:
                resp = await _call_tool("dawnchat.tts.list_models", {"engine": engine})
                models = resp.get("data", {}).get("models", []) if resp.get("code") == 200 else []
                if not isinstance(models, list):
                    models = []
                state["models"] = models
                options = _build_model_options(models)
                _apply_select_options(model_select, options, _t("empty_models"))
                await refresh_voices()
            except Exception as exc:
                logger.warning("list_models failed: %s", exc)
                state["models"] = []
                _apply_select_options(model_select, {"": _t("empty_models")}, _t("empty_models"))

        def _extract_vibevoice_voices(payload: Dict[str, Any]) -> List[str]:
            by_quality = payload.get("by_quality")
            if isinstance(by_quality, dict):
                candidates = by_quality.get(_quality_value())
                if isinstance(candidates, list):
                    return [str(v).strip() for v in candidates if str(v).strip()]
            raw = payload.get("voices")
            if isinstance(raw, list):
                return [str(v).strip() for v in raw if str(v).strip()]
            return []

        async def refresh_voices() -> None:
            engine = _engine_value()
            speaker_select.options = {"": _t("loading")}
            speaker_select.value = ""
            speaker_select.update()
            try:
                if engine == "cosyvoice":
                    model_id = _valid_model_id(_model_value())
                    if not model_id:
                        _apply_select_options(speaker_select, {}, _t("empty_speakers"))
                        return
                    resp = await _call_tool(
                        "dawnchat.tts.list_speakers",
                        {"engine": "cosyvoice", "model_id": model_id},
                    )
                    speakers = resp.get("data", {}).get("speakers", []) if resp.get("code") == 200 else []
                    candidates = [str(v).strip() for v in speakers if str(v).strip()]
                    options = {v: v for v in candidates}
                    _apply_select_options(speaker_select, options, _t("empty_speakers"))
                    return

                resp = await _call_tool("dawnchat.tts.list_voices", {"engine": "vibevoice"})
                payload = resp.get("data", {}) if resp.get("code") == 200 else {}
                state["voices"] = payload if isinstance(payload, dict) else {}
                candidates = _extract_vibevoice_voices(state["voices"])
                options = {v: v for v in candidates}
                _apply_select_options(speaker_select, options, _t("empty_voices"))
            except Exception as exc:
                logger.warning("list_voices failed: %s", exc)
                _apply_select_options(speaker_select, {}, _t("empty_voices"))

        def _audio_url(path: str) -> Optional[str]:
            if not path:
                return None
            p = Path(path)
            if not p.exists():
                return None
            token = md5(str(p).encode("utf-8")).hexdigest()[:10]
            route = f"/hello-tts-audio/{token}"
            app.add_static_files(route, str(p.parent))
            return f"{route}/{p.name}"

        def _render_audio(url: Optional[str]) -> None:
            audio_container.clear()
            if not url:
                play_button.set_enabled(False)
                pause_button.set_enabled(False)
                return
            with audio_container:
                ui.audio(url).props('controls id="hello-tts-player"').classes("w-full")
            play_button.set_enabled(True)
            pause_button.set_enabled(True)

        def _render_result(payload: Dict[str, Any]) -> None:
            result_container.clear()
            pretty = json.dumps(payload, ensure_ascii=False, indent=2)
            with result_container:
                ui.code(pretty).classes("w-full")

        def _render_output_info(payload: Dict[str, Any]) -> None:
            output_container.clear()
            data = payload.get("data") if isinstance(payload, dict) else {}
            if not isinstance(data, dict):
                return
            output_path = str(data.get("output_path") or "").strip()
            if not output_path:
                return
            with output_container:
                ui.label(output_path).classes("text-xs").style(f"color:{c.text_secondary};")

        async def synthesize() -> None:
            text = str(text_input.value or "").strip()
            if not text:
                ui.notify(_t("text_placeholder"), type="warning")
                return

            result_container.clear()
            output_container.clear()

            engine = _engine_value()
            speaker = str(speaker_select.value or "").strip()
            quality = _quality_value()
            model_id = _valid_model_id(_model_value()) if engine == "cosyvoice" else None

            args: Dict[str, Any] = {"text": text, "engine": engine}

            if engine == "cosyvoice":
                if speaker:
                    args["speaker"] = speaker
                if model_id:
                    args["model_id"] = model_id
                args["mode"] = str(mode_select.value or "instruct2").strip().lower() or "instruct2"
            else:
                args["speaker"] = speaker or "Emma"
                args["quality"] = quality

            try:
                resp = await _call_tool("dawnchat.tts.synthesize", args)
            except Exception as exc:
                resp = {"code": 500, "message": str(exc), "data": None}

            _render_result(resp)
            _render_output_info(resp)

            if isinstance(resp, dict) and resp.get("code") == 200:
                data = resp.get("data") or {}
                url = _audio_url(str(data.get("output_path") or ""))
                _render_audio(url)
                ui.notify(_t("success"), type="positive")
            else:
                ui.notify(_t("failed"), type="negative")

        with ui.column().classes("w-full items-center gap-6 p-4"):
            with Card().classes("w-full max-w-4xl text-center"):
                Header(_t("title"))
                MutedText(_t("subtitle"))

            with ui.row().classes("w-full max-w-4xl gap-6 flex-wrap"):
                with ui.column().classes("flex-1 min-w-80"):
                    with ui.element("div").classes("tts-card"):
                        ui.label(_t("engine")).classes("text-sm").style(f"color:{c.text_secondary};")
                        engine_select = ui.select(
                            options=engine_options,
                            value="vibevoice",
                        ).props("outlined dense").classes("w-full")

                        model_container = ui.element("div").classes("w-full")
                        with model_container:
                            ui.label(_t("model")).classes("text-sm mt-3").style(f"color:{c.text_secondary};")

                            def _model_changed() -> None:
                                asyncio.create_task(refresh_voices())

                            model_select = ui.select(
                                options={"": _t("loading")},
                                value="",
                                on_change=lambda e: _model_changed(),
                            ).props("outlined dense").classes("w-full")

                        ui.label(_t("speaker")).classes("text-sm mt-3").style(f"color:{c.text_secondary};")
                        speaker_select = ui.select(
                            options={"": _t("loading")},
                            value="",
                        ).props("outlined dense").classes("w-full")

                        quality_container = ui.element("div").classes("w-full")
                        mode_container = ui.element("div").classes("w-full")

                        with quality_container:
                            ui.label(_t("quality")).classes("text-sm mt-3").style(f"color:{c.text_secondary};")
                            quality_select = ui.select(
                                options=quality_options,
                                value="fast",
                                on_change=lambda e: asyncio.create_task(refresh_voices()),
                            ).props("outlined dense").classes("w-full")

                        with mode_container:
                            ui.label(_t("mode")).classes("text-sm mt-3").style(f"color:{c.text_secondary};")
                            mode_select = ui.select(
                                options=mode_options,
                                value="instruct2",
                            ).props("outlined dense").classes("w-full")

                        def _toggle_engine_fields() -> None:
                            is_vibe = _engine_value() == "vibevoice"
                            quality_container.set_visibility(is_vibe)
                            mode_container.set_visibility(not is_vibe)
                            model_container.set_visibility(not is_vibe)

                        _toggle_engine_fields()

                        def _engine_changed() -> None:
                            _toggle_engine_fields()
                            asyncio.create_task(refresh_models())

                        engine_select.on("change", lambda e: _engine_changed())

                        ui.label(_t("text")).classes("text-sm mt-4").style(f"color:{c.text_secondary};")
                        text_input = ui.textarea(
                            placeholder=_t("text_placeholder"),
                            value="",
                        ).classes("w-full").props("outlined")

                        with ui.row().classes("w-full items-center gap-3 mt-4"):
                            ui.button(_t("refresh"), on_click=refresh_models).props("outline")
                            ui.button(_t("synthesize"), on_click=synthesize).props("color=primary")

                with ui.column().classes("flex-1 min-w-80"):
                    with ui.element("div").classes("tts-card"):
                        ui.label(_t("output")).classes("text-lg font-semibold").style(f"color:{c.text_primary};")
                        result_container = ui.element("div").classes("w-full mt-3")
                        output_container = ui.element("div").classes("w-full mt-4")
                        audio_container = ui.element("div").classes("w-full mt-3")

                        with output_container:
                            with ui.row().classes("w-full items-center gap-3"):
                                play_button = ui.button(
                                    _t("play"),
                                    on_click=lambda: ui.run_javascript("document.getElementById('hello-tts-player')?.play();"),
                                ).props("outline")
                                pause_button = ui.button(
                                    _t("pause"),
                                    on_click=lambda: ui.run_javascript("document.getElementById('hello-tts-player')?.pause();"),
                                ).props("outline")
                                play_button.set_enabled(False)
                                pause_button.set_enabled(False)

        await refresh_models()

    def on_startup():
        print(json.dumps({"status": "ready"}), file=sys.stderr, flush=True)

    app.on_startup(on_startup)

    ui.run(
        host=args.host,
        port=args.port,
        title="Hello TTS",
        favicon="🔊",
        show=False,
        reload=False,
        dark=True,
    )


if __name__ in {"__main__", "__mp_main__"}:
    main()
