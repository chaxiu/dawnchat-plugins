from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Optional

from nicegui import app, ui

from dawnchat_sdk import host
from i18n import i18n
from services import narrator
from services.coach_engine import node_is_narration, node_is_practice, node_segment_idx
from services.planner import parse_strategy_config
from ui.practice import render_practice_component
from ui.practice_page_head import build_practice_head_html

from .narrations import (
    render_grammar_view,
    render_plot_view,
    render_skip_summary_view,
    render_translation_view,
    render_vocab_view,
)
from .report_view import render_coach_report_view

if TYPE_CHECKING:
    from course.models import Course
    from storage.course_db import CourseDatabase


_STATIC_ROUTES: set[str] = set()


def _mount_static(route: str, directory: str) -> None:
    if route in _STATIC_ROUTES:
        return
    try:
        app.add_static_files(route, directory)
    except Exception:
        pass
    _STATIC_ROUTES.add(route)


def _coach_query(*, theme_mode: str, lang: str, view: str | None = None) -> str:
    base = f"?theme={theme_mode}&lang={lang}"
    if view:
        return f"{base}&view={view}"
    return base


def _find_next_practice_node(nodes: list[dict[str, Any]], start_idx: int) -> Optional[dict[str, Any]]:
    for i in range(max(0, int(start_idx)), len(nodes)):
        if node_is_practice(nodes[i]):
            return nodes[i]
    return None


def _view_for_node(node: Optional[dict[str, Any]]) -> str:
    if not node:
        return "report"
    if node_is_narration(node):
        return "narration"
    if node_is_practice(node):
        return "practice"
    return "report"


def _node_label(node: Optional[dict[str, Any]], lang: str) -> str:
    if not node:
        return "报告" if str(lang).startswith("zh") else "Report"
    if node_is_practice(node):
        return "跟读" if str(lang).startswith("zh") else "Practice"
    kind = str(node.get("narration_kind") or "")
    if kind == "skip_summary":
        return "解说" if str(lang).startswith("zh") else "Narration"
    return "解说" if str(lang).startswith("zh") else "Narration"


async def render_coach_view(
    course: "Course",
    course_db: "CourseDatabase",
    theme: Any,
    lang: str = "zh",
    *,
    view: str = "",
) -> None:
    c = theme.colors
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    next_mode = "light" if theme_mode == "dark" else "dark"
    query = f"?theme={theme_mode}&lang={lang}"
    client = ui.context.client

    def _t(key: str) -> str:
        return i18n.t(key, lang)

    assets_dir = Path(__file__).resolve().parents[1] / "assets"
    _mount_static("/echoflow-assets", str(assets_dir))
    ui.add_head_html(build_practice_head_html(colors=c))

    plan_id = course_db.ensure_coach_plan(course, ui_lang=str(lang or "zh"))
    plan = course_db.get_coach_plan(str(course.id)) or {}
    nodes = course_db.list_plan_nodes(plan_id)
    has_practice_nodes = any(node_is_practice(n) for n in nodes)
    current_node_index = int(plan.get("current_node_index") or 0)
    if current_node_index < 0:
        current_node_index = 0
    if current_node_index > len(nodes):
        current_node_index = len(nodes)
        course_db.set_plan_current_node_index(plan_id=plan_id, current_node_index=current_node_index)

    current_node = nodes[current_node_index] if 0 <= current_node_index < len(nodes) else None
    requested_view = str(view or "").strip().lower()
    effective_view = requested_view if requested_view in {"narration", "practice", "report"} else ""
    if not effective_view:
        effective_view = _view_for_node(current_node)
    if effective_view == "practice" and not has_practice_nodes:
        effective_view = _view_for_node(current_node)

    total_nodes = len(nodes)
    progress_text = f"{_node_label(current_node, lang)} {min(current_node_index + 1, total_nodes)}/{max(total_nodes, 1)}"

    def _nav(to_view: str | None = None) -> None:
        q = _coach_query(theme_mode=theme_mode, lang=lang, view=to_view)
        ui.navigate.to(f"/coach/{course.id}{q}")

    async def _suspend_auto_continue() -> None:
        try:
            await client.run_javascript(
                "try{localStorage.setItem('echoflow_auto_continue_suspended','1');}catch(e){}",
                timeout=2.0,
            )
        except Exception:
            pass

    async def _user_nav(to_view: str | None = None) -> None:
        await _suspend_auto_continue()
        _nav(to_view)

    async def _user_action_and_nav(action: Callable[[], None], to_view: str | None = None) -> None:
        action()
        await _user_nav(to_view)

    def _strategy_narration_lang() -> str:
        strategy_id = str(plan.get("strategy_id") or "").strip()
        if not strategy_id:
            return "zh"
        preset = course_db.get_strategy_preset(strategy_id) or {}
        try:
            cfg_obj = json.loads(str(preset.get("config_json") or "{}"))
        except Exception:
            cfg_obj = {}
        cfg = parse_strategy_config(cfg_obj)
        return str(cfg.narration_lang or "zh").strip() or "zh"

    narration_lang = _strategy_narration_lang()
    try:
        preset = course_db.get_strategy_preset(str(plan.get("strategy_id") or "").strip()) or {}
        cfg_obj = json.loads(str(preset.get("config_json") or "{}")) if preset else {}
    except Exception:
        cfg_obj = {}
    strategy_cfg = parse_strategy_config(cfg_obj)

    prefs = course_db.get_app_prefs() or {}
    auto_continue = bool(prefs.get("echoflow_coach_auto_mode") or False)
    video_strategy = str(prefs.get("echoflow_coach_video_link_strategy") or "follow_muted").strip() or "follow_muted"
    pre_understand = bool(prefs.get("echoflow_coach_pre_understand") or False)

    def _set_current(idx: int) -> None:
        i = max(0, min(int(idx), len(nodes)))
        course_db.set_plan_current_node_index(plan_id=plan_id, current_node_index=i)

    def _advance(step: int) -> None:
        _set_current(current_node_index + int(step))
        _nav(None)

    def _mark_node(node: dict[str, Any], state: str) -> None:
        node_id = str(node.get("id") or "")
        if not node_id:
            return
        course_db.set_plan_node_state(node_id=node_id, state=str(state))

    def _handle_jump(*, from_seg: int, to_seg: int) -> None:
        if not has_practice_nodes:
            target = int(to_seg)
            chosen: Optional[int] = None
            last_narration: Optional[int] = None
            for i, n in enumerate(nodes):
                if not node_is_narration(n):
                    continue
                last_narration = int(i)
                try:
                    start_idx = int(n.get("range_start_idx") or 0)
                    end_idx = int(n.get("range_end_idx") or start_idx)
                except Exception:
                    continue
                if end_idx < start_idx:
                    start_idx, end_idx = end_idx, start_idx
                if start_idx <= target <= end_idx:
                    chosen = int(i)
                    break
                if target <= start_idx and chosen is None:
                    chosen = int(i)
                    break
            if chosen is None:
                chosen = last_narration
            if chosen is None:
                return
            course_db.set_plan_current_node_index(plan_id=plan_id, current_node_index=int(chosen))
            _nav(None)
            return
        from_idx = course_db.find_coach_practice_node_index(plan_id=plan_id, segment_idx=int(from_seg))
        to_idx = course_db.find_coach_practice_node_index(plan_id=plan_id, segment_idx=int(to_seg))
        if from_idx is None or to_idx is None:
            return
        if int(to_seg) > int(from_seg) + 1:
            course_db.insert_coach_skip_summary_node_after(
                plan_id=plan_id,
                after_idx=int(from_idx),
                course_id=str(course.id),
                range_start_idx=int(from_seg) + 1,
                range_end_idx=int(to_seg) - 1,
            )
            course_db.set_plan_current_node_index(plan_id=plan_id, current_node_index=int(from_idx) + 1)
            _nav(None)
            return
        course_db.set_plan_current_node_index(plan_id=plan_id, current_node_index=int(to_idx))
        _nav(None)

    def _open_settings_dialog() -> None:
        profiles = course_db.list_profiles()
        presets = course_db.list_strategy_presets()
        profile_options = {str(p.get("id")): str(p.get("name") or p.get("id") or "") for p in profiles}
        preset_options = {str(s.get("id")): str(s.get("name") or s.get("id") or "") for s in presets}

        current_profile = str(plan.get("profile_id") or "").strip()
        current_strategy = str(plan.get("strategy_id") or "").strip()
        prefs = course_db.get_app_prefs() or {}
        current_model = str(prefs.get("llm_model") or "")
        current_tts_voice = str(prefs.get("tts_voice") or "Emma")
        current_tts_quality = str(prefs.get("tts_quality") or "fast")
        current_tts_engine = str(prefs.get("tts_engine") or "vibevoice").strip() or "vibevoice"
        current_tts_model_id = str(prefs.get("tts_model_id") or "").strip()
        current_pre_understand = bool(prefs.get("echoflow_coach_pre_understand") or False)
        current_auto_mode = bool(prefs.get("echoflow_coach_auto_mode") or False)
        current_video_strategy = (
            str(prefs.get("echoflow_coach_video_link_strategy") or "follow_muted").strip() or "follow_muted"
        )

        if current_profile not in profile_options and profile_options:
            current_profile = next(iter(profile_options.keys()))
        if current_strategy not in preset_options and preset_options:
            current_strategy = next(iter(preset_options.keys()))

        with ui.dialog() as dialog, ui.card().classes("w-[560px] max-w-[92vw]"):
            ui.label(_t("coach_settings") if _t("coach_settings") != "coach_settings" else "Coach 设置").classes(
                "font-semibold text-lg"
            )
            with ui.row().classes("w-full gap-4 mt-2"):
                with ui.column().classes("flex-1"):
                    ui.label(_t("profile") if _t("profile") != "profile" else "Profile").classes("text-sm").style(
                        f"color:{c.text_secondary};"
                    )
                    profile_select = ui.select(profile_options, value=current_profile).props("dense").classes("w-full")
                with ui.column().classes("flex-1"):
                    ui.label(
                        _t("strategy_preset") if _t("strategy_preset") != "strategy_preset" else "策略预设"
                    ).classes("text-sm").style(f"color:{c.text_secondary};")
                    strategy_select = ui.select(preset_options, value=current_strategy).props("dense").classes("w-full")

            ui.separator()

            ui.label(
                "体验开关" if str(lang).startswith("zh") else "Experience"
            ).classes("text-sm").style(f"color:{c.text_secondary};")
            with ui.row().classes("w-full gap-4 mt-2"):
                pre_understand_checkbox = ui.checkbox(
                    "先懂再练" if str(lang).startswith("zh") else "Understand before practice",
                    value=bool(current_pre_understand),
                )
                auto_mode_checkbox = ui.checkbox(
                    "自动模式" if str(lang).startswith("zh") else "Auto mode",
                    value=bool(current_auto_mode),
                )

            video_strategy_options = (
                {"freeze": "冻结画面", "follow_muted": "跟随画面（静音）", "none": "不联动"}
                if str(lang).startswith("zh")
                else {"freeze": "Freeze frame", "follow_muted": "Follow video (muted)", "none": "No linkage"}
            )
            ui.label(
                "视频联动策略" if str(lang).startswith("zh") else "Video linkage strategy"
            ).classes("text-sm mt-2").style(f"color:{c.text_secondary};")
            video_strategy_select = (
                ui.select(
                    options=video_strategy_options,
                    value=str(current_video_strategy),
                )
                .props("dense")
                .classes("w-full")
            )

            ui.label(_t("coach_model")).classes("text-sm").style(f"color:{c.text_secondary};")
            coach_model_select = (
                ui.select(
                    options={"": _t("auto")},
                    value=str(current_model or ""),
                )
                .props("dense")
                .classes("w-full")
            )

            engine_options = (
                {"vibevoice": "VibeVoice", "cosyvoice": "CosyVoice"}
                if not str(lang).startswith("zh")
                else {"vibevoice": "VibeVoice", "cosyvoice": "CosyVoice"}
            )
            ui.label("TTS 引擎" if str(lang).startswith("zh") else "TTS engine").classes("text-sm mt-2").style(
                f"color:{c.text_secondary};"
            )
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
                    ui.label("模型" if str(lang).startswith("zh") else "Model").classes("text-sm").style(
                        f"color:{c.text_secondary};"
                    )
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
                if not str(lang).startswith("zh")
                else {"fast": "快速 (0.5B)", "standard": "标准 (1.5B)", "high": "高质量 (7B)"}
            )
            quality_options = {k: v for k, v in quality_label_map.items()}
            with ui.row().classes("w-full gap-4 mt-2"):
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

            voice_state: dict[str, object] = {"all": {}}

            def _selected_engine() -> str:
                return str(tts_engine_select.value or "vibevoice").strip().lower() or "vibevoice"

            def _selected_model_id() -> Optional[str]:
                v = str(tts_model_select.value or "").strip()
                return v or None

            def _sync_tts_visibility() -> None:
                eng = _selected_engine()
                tts_model_col.set_visibility(eng in {"cosyvoice", "cosyvoice3"})
                tts_quality_col.set_visibility(eng in {"vibevoice", ""})

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
                if str(coach_model_select.value or "") not in set(options.keys()):
                    coach_model_select.value = ""
                coach_model_select.update()

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
                    label = name
                    all_items.append((mid, label))
                    if bool(m.get("installed")) and not bool(m.get("is_resource_only")):
                        installed.append((mid, label))

                candidates = installed or all_items
                options: dict[str, str] = {}
                for mid, label in candidates:
                    options[mid] = label
                if not options:
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
                    return
                if not isinstance(resp, dict) or int(resp.get("code") or 0) != 200:
                    return
                data = resp.get("data") or {}
                voice_state["all"] = data
                _apply_tts_voice_options()

            async def _load_tts_quality_options() -> None:
                if _selected_engine() not in {"vibevoice", ""}:
                    tts_quality_select.options = {"fast": quality_label_map.get("fast", "fast")}
                    tts_quality_select.value = "fast"
                    tts_quality_select.update()
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

            asyncio.create_task(_load_llm_models())
            _sync_tts_visibility()
            asyncio.create_task(_load_tts_models())
            asyncio.create_task(_load_tts_voices())
            asyncio.create_task(_load_tts_quality_options())
            def _on_tts_engine_change() -> None:
                _sync_tts_visibility()
                asyncio.create_task(_load_tts_models())
                asyncio.create_task(_load_tts_quality_options())
                asyncio.create_task(_load_tts_voices())

            tts_engine_select.on("update:model-value", lambda _: _on_tts_engine_change())
            tts_model_select.on("update:model-value", lambda _: asyncio.create_task(_load_tts_voices()))
            tts_quality_select.on("update:model-value", lambda _: _apply_tts_voice_options())

            def _apply() -> None:
                engine_value = str(tts_engine_select.value or "vibevoice").strip() or "vibevoice"
                model_id_value = str(tts_model_select.value or "").strip()
                try:
                    course_db.patch_app_prefs(
                        {
                            "llm_model": str(coach_model_select.value or ""),
                            "tts_voice": str(tts_voice_select.value or "").strip() or "Emma",
                            "tts_quality": str(tts_quality_select.value or "").strip() or "fast",
                            "tts_engine": engine_value,
                            "tts_model_id": (model_id_value if engine_value in {"cosyvoice", "cosyvoice3"} else ""),
                            "echoflow_coach_pre_understand": bool(pre_understand_checkbox.value),
                            "echoflow_coach_auto_mode": bool(auto_mode_checkbox.value),
                            "echoflow_coach_video_link_strategy": str(video_strategy_select.value or "freeze"),
                            "echoflow_import_preset": str(strategy_select.value or "").strip() or "preset:balanced_v1",
                        }
                    )
                except Exception:
                    pass
                base_seg = None
                if current_node and node_is_practice(current_node):
                    base_seg = node_segment_idx(current_node)
                elif current_node and node_is_narration(current_node):
                    try:
                        base_seg = int(current_node.get("range_start_idx") or 0)
                    except Exception:
                        base_seg = 0
                if base_seg is None:
                    next_practice = _find_next_practice_node(nodes, current_node_index)
                    base_seg = node_segment_idx(next_practice) if next_practice else 0
                course_db.ensure_coach_plan(
                    course,
                    profile_id=str(profile_select.value or "").strip() or None,
                    strategy_id=str(strategy_select.value or "").strip() or None,
                    regenerate=True,
                    anchor_segment_idx=int(base_seg or 0),
                    ui_lang=str(lang or "zh"),
                )
                dialog.close()
                _nav(None)

            with ui.row().classes("w-full justify-end gap-2 mt-6"):
                ui.button(_t("cancel") if _t("cancel") != "cancel" else "取消", on_click=dialog.close).props("flat")
                ui.button(_t("apply") if _t("apply") != "apply" else "应用", on_click=_apply).props("color=primary")

        dialog.open()

    def _open_jump_dialog() -> None:
        with ui.dialog() as dialog, ui.card().classes("w-96"):
            ui.label(_t("jump_to") if _t("jump_to") != "jump_to" else "跳到第几句").classes("font-semibold")
            current_sentence_no = 1
            if current_node and node_is_practice(current_node):
                current_sentence_no = (node_segment_idx(current_node) or 0) + 1
            elif current_node and node_is_narration(current_node):
                try:
                    current_sentence_no = int(current_node.get("range_start_idx") or 0) + 1
                except Exception:
                    current_sentence_no = 1
            input_box = ui.number(
                label=_t("sentence_number") if _t("sentence_number") != "sentence_number" else "句子编号（从 1 开始）",
                value=int(current_sentence_no),
                min=1,
                max=max(1, course.total_segments),
                step=1,
            ).props("outlined")

            def _go() -> None:
                try:
                    n = int(input_box.value or 1)
                except Exception:
                    n = 1
                target_seg = max(0, min(course.total_segments - 1, n - 1))
                base_seg = None
                if current_node and node_is_practice(current_node):
                    base_seg = node_segment_idx(current_node)
                elif current_node and node_is_narration(current_node):
                    try:
                        base_seg = int(current_node.get("range_start_idx") or 0)
                    except Exception:
                        base_seg = 0
                if base_seg is None:
                    next_practice = _find_next_practice_node(nodes, current_node_index + 1)
                    base_seg = node_segment_idx(next_practice) if next_practice else 0
                _handle_jump(from_seg=int(base_seg), to_seg=int(target_seg))
                dialog.close()

            with ui.row().classes("w-full justify-end gap-2"):
                ui.button(_t("cancel") if _t("cancel") != "cancel" else "取消", on_click=dialog.close).props("flat")
                ui.button(_t("go") if _t("go") != "go" else "跳转", on_click=_go).props("color=primary")

        dialog.open()

    with ui.row().classes("w-full items-center justify-between p-4").style(
        f"background-color: {c.bg_secondary}; border-bottom: 1px solid {c.border};"
    ):
        ui.button("←", on_click=lambda: ui.navigate.to(f"/{query}")).props("flat").style(f"color: {c.text_primary};")
        ui.label(course.title).classes("text-lg font-semibold").style(f"color: {c.text_primary};")
        ui.label(progress_text).style(f"color: {c.text_secondary};")
        with ui.row().classes("items-center gap-2"):
            ui.button(
                _t("narration") if _t("narration") != "narration" else "解说",
                on_click=lambda: asyncio.create_task(_user_nav("narration")),
            ).props("flat").style(f"color: {c.text_primary if effective_view=='narration' else c.text_secondary};")
            ui.button(
                _t("practice") if _t("practice") != "practice" else "跟读",
                on_click=lambda: asyncio.create_task(_user_nav("practice" if has_practice_nodes else "narration")),
            ).props("flat").style(f"color: {c.text_primary if effective_view=='practice' else c.text_secondary};")
            ui.button(
                _t("report") if _t("report") != "report" else "报告",
                on_click=lambda: asyncio.create_task(_user_nav("report")),
            ).props("flat").style(f"color: {c.text_primary if effective_view=='report' else c.text_secondary};")
            ui.button(icon="settings", on_click=_open_settings_dialog).props("flat").style(f"color:{c.text_primary};")
            ui.button("⇄", on_click=_open_jump_dialog).props("flat")

    with ui.element("div").classes("practice-layout"):
        if effective_view == "report" or current_node is None:
            render_coach_report_view(course=course, theme=theme, lang=lang, nodes=nodes, query=query)
        elif effective_view == "narration":
            kind = str(current_node.get("narration_kind") or "")
            video_url: Optional[str] = None
            cover_src: str = ""
            if getattr(course, "cover_path", None):
                try:
                    cover_path = Path(str(course.cover_path))
                    if cover_path.exists():
                        cover_route = f"/cover/{course.id}"
                        _mount_static(cover_route, str(cover_path.parent))
                        cover_src = f"{cover_route}/{cover_path.name}"
                except Exception:
                    cover_src = ""
            if getattr(course, "video_path", None):
                try:
                    video_path = Path(str(course.video_path))
                    if video_path.exists():
                        video_route = f"/video/{course.id}"
                        _mount_static(video_route, str(video_path.parent))
                        video_url = f"{video_route}/{video_path.name}"
                except Exception:
                    video_url = None

            range_start_idx = int(current_node.get("range_start_idx") or 0)
            range_end_idx = int(current_node.get("range_end_idx") or range_start_idx)
            if range_end_idx < range_start_idx:
                range_start_idx, range_end_idx = range_end_idx, range_start_idx
            range_start_idx = max(0, min(range_start_idx, max(0, course.total_segments - 1)))
            range_end_idx = max(0, min(range_end_idx, max(0, course.total_segments - 1)))
            try:
                start_s = float(course.segments[int(range_start_idx)].start_time)
                end_s = float(course.segments[int(range_end_idx)].end_time)
            except Exception:
                start_s = 0.0
                end_s = 0.0
            if end_s < start_s:
                start_s, end_s = end_s, start_s

            if video_url:
                with ui.element("div").classes("practice-top"):
                    poster_attr = f' poster="{cover_src}"' if cover_src else ""
                    ui.html(
                        f"""
                        <div id="echoflow-video-panel" class="cover-container">
                          <video
                            id="echoflow-video"
                            class="cover-video"
                            preload="metadata"
                            playsinline
                            disablepictureinpicture
                            controlslist="nodownload noplaybackrate noremoteplayback"
                            src="{video_url}"
                            {poster_attr}
                          ></video>
                          <div id="echoflow-video-play" class="cover-video-play">
                            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M9 7.5v9l8-4.5-8-4.5z" fill="white"></path>
                            </svg>
                          </div>
                        </div>
                        """,
                        sanitize=False,
                    )
                    try:
                        await client.run_javascript(
                            f"""
                            setTimeout(() => {{
                              try {{
                                const payload = {{
                                  src: {json.dumps(video_url)},
                                  poster: {json.dumps(cover_src or "")},
                                  start: {float(start_s):.3f},
                                  end: {float(end_s):.3f},
                                  mode: {json.dumps(str(video_strategy or "follow_muted"))},
                                }};
                                if (window.echoflowVideoController && document.getElementById('echoflow-video')) {{
                                  window.echoflowVideoController.setSource(payload.src, payload.poster || null);
                                  window.echoflowVideoController.setRange(payload.start, payload.end);
                                  window.echoflowVideoPending = null;
                                  window.echoflowVideoLinkStrategy = payload.mode || 'freeze';
                                  const panel = document.getElementById('echoflow-video-panel');
                                  if (payload.mode === 'none') {{
                                    if (panel) panel.style.display = 'none';
                                    try {{ window.echoflowVideoController.stop(); }} catch (e) {{}}
                                  }} else {{
                                    if (panel) panel.style.display = '';
                                    try {{ window.echoflowVideoController.setMuted(payload.mode === 'follow_muted'); }} catch (e) {{}}
                                    try {{ window.echoflowVideoController.freezeAt(payload.start); }} catch (e) {{}}
                                  }}
                                }} else {{
                                  window.echoflowVideoPending = payload;
                                }}
                              }} catch (e) {{}}
                            }}, 0);
                            """,
                            timeout=5.0,
                        )
                    except Exception:
                        pass

            def _on_video_strategy_change(value: str) -> None:
                s = str(value or "freeze").strip() or "freeze"
                try:
                    course_db.patch_app_prefs({"echoflow_coach_video_link_strategy": s})
                except Exception:
                    pass

            def _skip_node() -> None:
                _mark_node(current_node, "skipped")
                _advance(1)

            def _continue_node() -> None:
                _mark_node(current_node, "done")
                _advance(1)

            if kind == "skip_summary":
                await render_skip_summary_view(
                    course=course,
                    course_db=course_db,
                    theme=theme,
                    lang=lang,
                    plan_id=plan_id,
                    node=current_node,
                    video_enabled=bool(video_url),
                    video_strategy=str(video_strategy or "follow_muted"),
                    on_video_strategy_change=_on_video_strategy_change,
                    auto_continue=bool(auto_continue),
                    on_continue=_continue_node,
                    on_skip=_skip_node,
                )
            elif kind == "plot":
                await render_plot_view(
                    course=course,
                    course_db=course_db,
                    theme=theme,
                    ui_lang=lang,
                    narration_lang=narration_lang,
                    plan_id=plan_id,
                    node=current_node,
                    video_enabled=bool(video_url),
                    video_strategy=str(video_strategy or "follow_muted"),
                    on_video_strategy_change=_on_video_strategy_change,
                    auto_continue=bool(auto_continue),
                    on_continue=_continue_node,
                    on_skip=_skip_node,
                )
            elif kind == "translation":
                await render_translation_view(
                    course=course,
                    course_db=course_db,
                    theme=theme,
                    ui_lang=lang,
                    narration_lang=narration_lang,
                    plan_id=plan_id,
                    node=current_node,
                    video_enabled=bool(video_url),
                    video_strategy=str(video_strategy or "follow_muted"),
                    on_video_strategy_change=_on_video_strategy_change,
                    auto_continue=bool(auto_continue),
                    on_continue=_continue_node,
                    on_skip=_skip_node,
                )
            elif kind == "vocab":
                await render_vocab_view(
                    course=course,
                    course_db=course_db,
                    theme=theme,
                    ui_lang=lang,
                    narration_lang=narration_lang,
                    plan_id=plan_id,
                    node=current_node,
                    video_enabled=bool(video_url),
                    video_strategy=str(video_strategy or "follow_muted"),
                    on_video_strategy_change=_on_video_strategy_change,
                    auto_continue=bool(auto_continue),
                    on_continue=_continue_node,
                    on_skip=_skip_node,
                )
            elif kind == "grammar":
                await render_grammar_view(
                    course=course,
                    course_db=course_db,
                    theme=theme,
                    ui_lang=lang,
                    narration_lang=narration_lang,
                    plan_id=plan_id,
                    node=current_node,
                    video_enabled=bool(video_url),
                    video_strategy=str(video_strategy or "follow_muted"),
                    on_video_strategy_change=_on_video_strategy_change,
                    auto_continue=bool(auto_continue),
                    on_continue=_continue_node,
                    on_skip=_skip_node,
                )
            else:
                ui.label(_t("not_supported") if _t("not_supported") != "not_supported" else "暂不支持的解说类型").style(
                    f"color:{c.text_secondary};"
                )
        elif effective_view == "practice":
            if current_node and node_is_practice(current_node):
                seg_idx = node_segment_idx(current_node)
                practice_node = current_node
            else:
                next_practice = _find_next_practice_node(nodes, current_node_index)
                seg_idx = node_segment_idx(next_practice) if next_practice else 0
                practice_node = next_practice
            seg_idx = max(0, min(int(seg_idx or 0), max(0, course.total_segments - 1)))

            reason_text = str((practice_node or {}).get("reason") or "").strip()
            if reason_text:
                with ui.element("div").classes("v2-card w-full").classes("mb-3"):
                    ui.label("选句原因" if str(lang).startswith("zh") else "Why this sentence").classes("font-semibold").style(
                        f"color:{c.text_primary};"
                    )
                    ui.label(reason_text).style(f"color:{c.text_secondary}; white-space: pre-wrap;")

            async def _on_scored(payload: dict) -> None:
                try:
                    segment_idx = int(payload.get("segment_idx") or 0)
                except Exception:
                    return
                latest_nodes = course_db.list_plan_nodes(plan_id)
                node_idx = course_db.find_coach_practice_node_index(plan_id=plan_id, segment_idx=segment_idx)
                if node_idx is None or node_idx >= len(latest_nodes):
                    return
                _mark_node(latest_nodes[int(node_idx)], "done")
                course_db.set_plan_current_node_index(plan_id=plan_id, current_node_index=int(node_idx) + 1)
                _nav(None)

            async def _on_skipped(payload: dict) -> None:
                try:
                    segment_idx = int(payload.get("segment_idx") or 0)
                except Exception:
                    return
                latest_nodes = course_db.list_plan_nodes(plan_id)
                node_idx = course_db.find_coach_practice_node_index(plan_id=plan_id, segment_idx=segment_idx)
                if node_idx is None or node_idx >= len(latest_nodes):
                    return
                _mark_node(latest_nodes[int(node_idx)], "skipped")
                course_db.set_plan_current_node_index(plan_id=plan_id, current_node_index=int(node_idx) + 1)
                _nav(None)

            def _on_segment_change(new_idx: int) -> None:
                _handle_jump(from_seg=int(seg_idx), to_seg=int(new_idx))

            def _on_report() -> None:
                course_db.set_plan_current_node_index(plan_id=plan_id, current_node_index=len(nodes))
                _nav("report")

            show_hint = bool(pre_understand) and bool(
                bool(strategy_cfg.enable_plot)
                or bool(strategy_cfg.enable_translation)
                or bool(strategy_cfg.enable_vocab)
                or bool(strategy_cfg.enable_grammar)
            )
            if show_hint and practice_node is not None:
                try:
                    seg = course.segments[int(seg_idx)]
                    segs = [{"idx": int(seg.id), "text": str(seg.text or "")}]
                except Exception:
                    segs = []
                if segs:
                    input_hash = narrator.compute_input_hash(
                        {
                            "course_id": str(course.id),
                            "kind": "practice_hint",
                            "lang": str(narration_lang),
                            "prompt_version": "practice_hint_v1",
                            "range_start_idx": int(seg_idx),
                            "range_end_idx": int(seg_idx),
                            "segments": segs,
                        }
                    )
                    cached = course_db.find_cached_narration(
                        course_id=str(course.id),
                        kind="practice_hint",
                        lang=str(narration_lang),
                        input_hash=str(input_hash),
                    )
                    cached_text = str((cached or {}).get("content_text") or "").strip()

                    with ui.element("div").classes("v2-card w-full").classes("mb-3"):
                        ui.label("先懂再练" if str(lang).startswith("zh") else "Understand before practice").classes(
                            "font-semibold"
                        ).style(f"color:{c.text_primary};")
                        hint_status = ui.label("").style(f"color:{c.text_secondary};")
                        hint_md = ui.markdown(cached_text or "").classes("mt-1")

                    def _set_hint_status(text: str) -> None:
                        hint_status.text = str(text or "")
                        hint_status.update()

                    async def _generate_hint() -> None:
                        if cached_text:
                            _set_hint_status(_t("cached") if _t("cached") != "cached" else "已缓存")
                            return
                        _set_hint_status(_t("generating") if _t("generating") != "generating" else "生成中…")
                        try:
                            prefs2 = course_db.get_app_prefs() or {}
                            model = str(prefs2.get("llm_model") or "").strip() or None
                            _, result = await narrator.generate_practice_hint(
                                course_id=str(course.id),
                                lang=str(narration_lang),
                                range_start_idx=int(seg_idx),
                                range_end_idx=int(seg_idx),
                                segments=list(segs),
                                model=model,
                            )
                            course_db.upsert_narration(
                                narration_id=str(result.narration_id),
                                course_id=str(course.id),
                                plan_id=str(plan_id),
                                node_id=str(practice_node.get("id") or ""),
                                kind="practice_hint",
                                lang=str(narration_lang),
                                input_hash=str(result.input_hash),
                                prompt_version=str(result.prompt_version),
                                content_text=str(result.content_text),
                                content_json=result.content_json,
                                range_start_idx=int(seg_idx),
                                range_end_idx=int(seg_idx),
                                segment_id=str(practice_node.get("segment_id") or "") or None,
                                model_id=result.model_id,
                                temperature=result.temperature,
                                tts_audio_path=None,
                                tts_voice=None,
                                tts_model=None,
                            )
                            row = course_db.find_cached_narration(
                                course_id=str(course.id),
                                kind="practice_hint",
                                lang=str(narration_lang),
                                input_hash=str(result.input_hash),
                            )
                            text = str((row or {}).get("content_text") or "").strip()
                            hint_md.content = text
                            hint_md.update()
                            _set_hint_status(_t("cached") if _t("cached") != "cached" else "已缓存")
                        except Exception:
                            _set_hint_status(_t("failed") if _t("failed") != "failed" else "生成失败")

                    asyncio.create_task(_generate_hint())

            await render_practice_component(
                course=course,
                course_db=course_db,
                theme=theme,
                lang=lang,
                embedded=True,
                segment_index=int(seg_idx),
                on_segment_change=_on_segment_change,
                ensure_practice_plan=True,
                update_practice_plan_cursor=False,
                on_back=lambda: ui.navigate.to(f"/{query}"),
                on_refresh=lambda: _nav("practice"),
                on_report=_on_report,
                on_theme_toggle=lambda: ui.navigate.to(f"/coach/{course.id}?theme={next_mode}&lang={lang}&view={effective_view}"),
                on_scored=_on_scored,
                on_skipped=_on_skipped,
            )

    if effective_view != "practice" and current_node is not None:
        with ui.element("div").classes("practice-bottom-bar"):
            with ui.element("div").classes("practice-bottom-bar-inner"):
                with ui.row().classes("w-full items-center justify-between"):
                    ui.button(
                        _t("prev") if _t("prev") != "prev" else "上一个",
                        on_click=lambda: asyncio.create_task(
                            _user_action_and_nav(lambda: _set_current(current_node_index - 1), None)
                        ),
                    ).props("outline")
                    ui.button(
                        _t("skip") if _t("skip") != "skip" else "跳过",
                        on_click=lambda: asyncio.create_task(
                            _user_action_and_nav(
                                lambda: (_mark_node(current_node, "skipped"), _set_current(current_node_index + 1)),
                                None,
                            )
                        ),
                    ).props("outline")
                    ui.button(
                        _t("next") if _t("next") != "next" else "继续",
                        on_click=lambda: asyncio.create_task(
                            _user_action_and_nav(
                                lambda: (_mark_node(current_node, "done"), _set_current(current_node_index + 1)),
                                None,
                            )
                        ),
                    ).props("color=primary")
