"""
Practice view UI - Main learning interface.
"""

from nicegui import ui, app
from typing import TYPE_CHECKING, Awaitable, Callable, Optional
import logging
import asyncio
import base64
import json
import time
import audioop
import math
import wave
from pathlib import Path
from urllib.parse import urlparse

from dawnchat_sdk import host
from v2.runtime import new_temp_path, safe_unlink
from v2.engine.pipeline import get_pipeline

from i18n import i18n
from course.models import SegmentStatus
from ui.practice_score_panel import build_score_panel, sync_score_panel
from ui.practice_page_head import build_practice_head_html
from ui.practice_bottom_bar import build_practice_bottom_bar
from ui.practice_scoring import render_basic_score, render_score_v2

if TYPE_CHECKING:
    from storage.course_db import CourseDatabase
    from course.models import Course

logger = logging.getLogger("echoflow.ui.practice")

_STATIC_ROUTES: set[str] = set()
_COVER_SRC_CACHE: dict[str, str] = {}
_COVER_FETCH_INFLIGHT: set[str] = set()
_COVER_FAILURE_CACHE: dict[str, float] = {}


def _mount_static(route: str, directory: str) -> None:
    if route in _STATIC_ROUTES:
        return
    try:
        app.add_static_files(route, directory)
    except Exception:
        pass
    _STATIC_ROUTES.add(route)


async def render_practice_component(
    course: "Course",
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
    *,
    embedded: bool = False,
    segment_index: Optional[int] = None,
    on_segment_change: Optional[Callable[[int], None]] = None,
    ensure_practice_plan: bool = True,
    update_practice_plan_cursor: bool = True,
    on_back: Callable[[], None],
    on_refresh: Callable[[], None],
    on_report: Callable[[], None],
    on_theme_toggle: Callable[[], None],
    on_scored: Optional[Callable[[dict], Awaitable[None]]] = None,
    on_skipped: Optional[Callable[[dict], Awaitable[None]]] = None,
):
    """
    Render the practice view for a course.
    """
    c = theme.colors
    client = ui.context.client
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    
    def _t(key):
        return i18n.t(key, lang)

    def _save_course() -> None:
        course_db.save(
            course,
            ensure_practice_plan=bool(ensure_practice_plan),
            update_practice_plan_cursor=bool(update_practice_plan_cursor),
        )
    
    # State
    state = {
        "is_recording": False,
        "is_analyzing": False,
        "current_score": None,
        "audio_chunks": [],
        "cover_ready": False,
    }

    def _is_audio_only_course() -> bool:
        try:
            return bool(getattr(course, "audio_path", None)) and not bool(getattr(course, "source_url", None)) and not bool(
                getattr(course, "video_path", None)
            )
        except Exception:
            return False

    def resolve_cover_src_fast() -> Optional[str]:
        try:
            if getattr(course, "cover_path", None):
                cover_path = Path(course.cover_path)
                if cover_path.exists():
                    cover_route = f"/cover/{course.id}"
                    _mount_static(cover_route, str(cover_path.parent))
                    return f"{cover_route}/{cover_path.name}"

            if not course.source_url:
                return None

            cached = _COVER_SRC_CACHE.get(course.source_url)
            if cached:
                return cached
            return None
        except Exception:
            return None

    async def fetch_cover_src_remote() -> Optional[str]:
        if not course.source_url:
            return None
        if course.source_url in _COVER_SRC_CACHE:
            return _COVER_SRC_CACHE[course.source_url]
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
                    _save_course()
                    cover_route = f"/cover/{course.id}"
                    _mount_static(cover_route, str(cover_path.parent))
                    return f"{cover_route}/{cover_path.name}"

                import urllib.request

                referer = None
                try:
                    parsed = urlparse(str(course.source_url))
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
                    _save_course()
                    cover_route = f"/cover/{course.id}"
                    _mount_static(cover_route, str(cover_path.parent))
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

            info_result = await host.tools.call(
                "dawnchat.media.get_video_info",
                arguments={"url": course.source_url, "cookies_path": cookies_path},
            )
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
    
    assets_dir = Path(__file__).parent / "assets"
    _mount_static("/echoflow-assets", str(assets_dir))

    ui.add_head_html(build_practice_head_html(colors=c))
    
    resolved_index = int(segment_index) if segment_index is not None else int(getattr(course, "current_segment_index", 0) or 0)
    resolved_index = max(0, min(resolved_index, max(0, course.total_segments - 1)))

    if not embedded:
        with ui.row().classes("w-full items-center justify-between p-4").style(
            f"background-color: {c.bg_secondary}; border-bottom: 1px solid {c.border};"
        ):
            ui.button("←", on_click=on_back).props("flat").style(f"color: {c.text_primary};")
            ui.label(course.title).classes("text-lg font-semibold").style(f"color: {c.text_primary};")
            ui.label(f"{resolved_index + 1}/{course.total_segments}").style(f"color: {c.text_secondary};")
    
    # Main content
    with ui.element('div').classes('practice-layout'):
        segment = course.segments[resolved_index] if 0 <= resolved_index < course.total_segments else None
        
        if not segment:
            ui.label(_t('session_complete')).classes('text-2xl text-center my-8')
            ui.button(_t('back_to_courses'), on_click=on_back).classes('mx-auto')
            return

        sentence_ch = max(20, min(140, len(segment.text or "")))
        try:
            await client.run_javascript(
                f"document.documentElement.style.setProperty('--echoflow-sentence-ch', {json.dumps(sentence_ch)});",
                timeout=5.0,
            )
        except Exception:
            pass

        def _set_segment_index(index: int) -> None:
            if state.get("latest_wav_path"):
                safe_unlink(state.get("latest_wav_path"))
                state["latest_wav_path"] = None
            if 0 <= index < course.total_segments:
                if on_segment_change is not None:
                    on_segment_change(int(index))
                    return
                course.current_segment_index = int(index)
                try:
                    s = course.segments[int(index)]
                    if str(getattr(s, "status", "")).lower().endswith("locked"):
                        s.status = SegmentStatus.CURRENT
                except Exception:
                    pass
                _save_course()
                on_refresh()

        def jump_to(index: int) -> None:
            _set_segment_index(int(index))

        with ui.element("div").classes("practice-top"):
            cover_src = resolve_cover_src_fast()
            video_url: Optional[str] = None
            if getattr(course, "video_path", None):
                try:
                    video_path = Path(course.video_path)
                    if video_path.exists():
                        video_route = f"/video/{course.id}"
                        _mount_static(video_route, str(video_path.parent))
                        video_url = f"{video_route}/{video_path.name}"
                except Exception:
                    video_url = None
            should_show_cover = bool(getattr(course, "cover_path", None)) or bool(course.source_url) or _is_audio_only_course()
            if video_url:
                with ui.element('div').classes('cover-container'):
                    poster_attr = f' poster="{cover_src}"' if cover_src else ""
                    ui.html(
                        f"""
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
                                  start: {float(segment.start_time):.3f},
                                  end: {float(segment.end_time):.3f},
                                }};
                                if (window.echoflowVideoController && document.getElementById('echoflow-video')) {{
                                  window.echoflowVideoController.setSource(payload.src, payload.poster || null);
                                  window.echoflowVideoController.setRange(payload.start, payload.end);
                                  window.echoflowVideoPending = null;
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
                    ui.label(segment.text).classes("cover-target")
                state["cover_ready"] = bool(cover_src)
                if (not cover_src) and course.source_url:
                    async def _load_cover_for_video():
                        src = await fetch_cover_src_remote()
                        if not src:
                            return
                        try:
                            await client.run_javascript(
                                f"""
                                (function() {{
                                    const video = document.getElementById('echoflow-video');
                                    if (!video) return;
                                    video.poster = {json.dumps(src)};
                                }})();
                                """
                            )
                            state["cover_ready"] = True
                        except Exception:
                            pass

                    last_fail = _COVER_FAILURE_CACHE.get(course.source_url)
                    if course.source_url not in _COVER_FETCH_INFLIGHT and (
                        last_fail is None or (time.monotonic() - last_fail) >= 300
                    ):
                        asyncio.create_task(_load_cover_for_video())
            elif should_show_cover:
                with ui.element('div').classes('cover-container'):
                    initial_display = "block" if cover_src else "none"
                    src_attr = f' src="{cover_src}"' if cover_src else ""
                    ui.html(
                        f'<img id="echoflow-cover" class="cover-image" style="display:{initial_display};"{src_attr} />',
                        sanitize=False,
                    )
                    if (not cover_src) and _is_audio_only_course():
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
                    ui.label(segment.text).classes("cover-target")

                if cover_src:
                    state["cover_ready"] = True
                elif course.source_url:
                    async def _load_cover():
                        src = await fetch_cover_src_remote()
                        if not src:
                            return
                        try:
                            await client.run_javascript(
                                f"""
                                (function() {{
                                    const img = document.getElementById('echoflow-cover');
                                    const video = document.getElementById('echoflow-video');
                                    if (img) {{
                                        img.src = {json.dumps(src)};
                                        img.style.display = 'block';
                                    }}
                                    if (video) {{
                                        video.poster = {json.dumps(src)};
                                    }}
                                }})();
                                """
                            )
                            state["cover_ready"] = True
                        except Exception:
                            pass

                    last_fail = _COVER_FAILURE_CACHE.get(course.source_url)
                    if course.source_url not in _COVER_FETCH_INFLIGHT and (
                        last_fail is None or (time.monotonic() - last_fail) >= 300
                    ):
                        asyncio.create_task(_load_cover())
            else:
                with ui.element("div").classes("cover-container"):
                    ui.label(segment.text).classes("cover-target")

            score_panel = build_score_panel(colors=c, lang=lang, t=_t)
            score_status_label = score_panel.status_label
            score_container = score_panel.details
            score_label = score_panel.score_label
            accuracy_label = score_panel.accuracy_label
            completeness_label = score_panel.completeness_label
            fluency_label = score_panel.fluency_label
            word_feedback_container = score_panel.recognition
        
        # Audio player for reference (hidden, controlled via JS)
        if course.audio_path:
            audio_route = f'/audio/{course.id}'
            audio_path = Path(course.audio_path)
            if audio_path.exists():
                _mount_static(audio_route, str(audio_path.parent))
                audio_url = f'{audio_route}/{audio_path.name}'
                
                ui.html(f'''
                    <audio id="reference-audio" src="{audio_url}" style="display:none;"></audio>
                ''', sanitize=False)
        
        with ui.element("div").classes("practice-center"):
            v2_media_container = ui.element('div').classes('v2-card w-full')
            v2_media_container.set_visibility(True)
            with v2_media_container:
                ui.label("Timeline & Waveform").classes("font-semibold").style(f'color: {c.text_primary};')
                ui.html(
                    """
                    <div id="echoflow-v2-waveform" class="v2-waveform"></div>
                    <div class="h-3"></div>
                    <div id="echoflow-v2-timeline" class="v2-timeline">
                        <div id="echoflow-v2-word-lane" class="v2-lane"></div>
                        <div id="echoflow-v2-ins-lane" class="v2-lane"></div>
                    </div>
                    <div class="h-3"></div>
                    <div id="echoflow-v2-insertions" class="v2-insertions"></div>
                    """,
                    sanitize=False,
                )

        mic_label = "麦克风" if lang.startswith("zh") else "Microphone"
        asr_model_label = "模型" if lang.startswith("zh") else "Model"
        default_label = "系统默认" if lang.startswith("zh") else "System Default"

        async def play_reference():
            if segment:
                if video_url:
                    ui.run_javascript(
                        f"""
                        (function() {{
                          if (window.echoflowVideoController) {{
                            window.echoflowVideoController.setRange({float(segment.start_time):.3f}, {float(segment.end_time):.3f});
                            window.echoflowVideoController.play();
                          }}
                        }})();
                        """
                    )
                    return

                ui.run_javascript(
                    f"""
                    (function() {{
                      if (window.echoflowVideoController) {{
                        window.echoflowVideoController.stop();
                      }}
                      const audio = document.getElementById('reference-audio');
                      if (!audio) return;
                      try {{
                        if (window.echoflowAudioTimer) {{
                          window.clearTimeout(window.echoflowAudioTimer);
                          window.echoflowAudioTimer = null;
                        }}
                      }} catch (e) {{}}
                      audio.currentTime = {float(segment.start_time):.3f};
                      const p = audio.play();
                      if (p && p.catch) p.catch(function(){{}});
                      window.echoflowAudioTimer = window.setTimeout(function () {{
                        try {{ audio.pause(); }} catch (e) {{}}
                      }}, {max(0.0, float(segment.end_time) - float(segment.start_time)) * 1000:.0f});
                    }})();
                    """
                )

        if lang.startswith("zh"):
            toggle_label = "切换到明亮模式" if theme_mode == "dark" else "切换到黑暗模式"
        else:
            toggle_label = "Switch to Light" if theme_mode == "dark" else "Switch to Dark"

        def _on_threshold_change(value: int) -> None:
            try:
                course.pass_threshold = int(value)
                _save_course()
            except Exception:
                pass

        pass_score_label = "及格分数" if lang.startswith("zh") else "Pass score"

        def go_next():
            if resolved_index < course.total_segments - 1:
                _set_segment_index(resolved_index + 1)
                return
            on_report()

        def go_previous():
            if resolved_index > 0:
                _set_segment_index(resolved_index - 1)
                return
            if not embedded:
                on_refresh()

        def skip_current():
            if state.get("latest_wav_path"):
                safe_unlink(state.get("latest_wav_path"))
                state["latest_wav_path"] = None
            try:
                if segment is not None:
                    segment.status = SegmentStatus.SKIPPED
            except Exception:
                pass
            try:
                _save_course()
            except Exception:
                pass
            if on_skipped is not None:
                try:
                    payload = {
                        "course_id": str(course.id),
                        "segment_idx": int(getattr(segment, "id", 0) or 0),
                    }
                    asyncio.create_task(on_skipped(payload))
                except Exception:
                    pass
            go_next()

        async def _noop_async() -> None:
            return None

        record_toggle_handler: dict[str, Callable[[], Awaitable[None]]] = {"fn": _noop_async}

        async def toggle_recording_proxy() -> None:
            await record_toggle_handler["fn"]()

        build_settings_extras_fn: Optional[Callable[[], None]] = None
        if on_skipped:
            def build_settings_extras_menu() -> None:
                ui.menu_item(_t("skip"), on_click=skip_current)
            build_settings_extras_fn = build_settings_extras_menu

        bottom_bar = build_practice_bottom_bar(
            mic_label=mic_label,
            asr_label=asr_model_label,
            on_prev=lambda: go_previous(),
            on_play_reference=play_reference,
            on_toggle_recording=toggle_recording_proxy,
            on_next=lambda: go_next(),
            threshold_label=pass_score_label,
            threshold_value=course.pass_threshold,
            on_threshold_change=_on_threshold_change,
            theme_toggle_label=toggle_label,
            on_theme_toggle=on_theme_toggle,
            build_settings_extras=build_settings_extras_fn,
        )

        mic_select = bottom_bar.mic_select
        refresh_btn = bottom_bar.mic_refresh_btn
        asr_select = bottom_bar.asr_select
        asr_refresh_btn = bottom_bar.asr_refresh_btn
        record_btn = bottom_bar.record_btn

        async def refresh_audio_inputs(cache_only: bool = False):
            info = await client.run_javascript(
                f'''
                return await (async () => {{
                    try {{
                        const key = 'echoflow_mic_cache_v1';
                        const preferred = window.localStorage.getItem('echoflow_mic_device_id') || 'default';
                        if ({json.dumps(cache_only)}) {{
                            const raw = window.localStorage.getItem(key);
                            if (!raw) return {{ ok: false, reason: 'no_cache' }};
                            const cache = JSON.parse(raw) || {{}};
                            const inputs = cache.inputs || [];
                            return {{ ok: true, cached: true, inputs, preferred }};
                        }}
                        const devices = await navigator.mediaDevices.enumerateDevices();
                        const inputs = devices
                            .filter(d => d.kind === 'audioinput')
                            .map(d => ({{ deviceId: d.deviceId, label: d.label || '', groupId: d.groupId || '' }}));
                        const payload = {{ ts: Date.now(), inputs }};
                        window.localStorage.setItem(key, JSON.stringify(payload));
                        return {{ ok: true, cached: false, inputs, preferred }};
                    }} catch (e) {{
                        return {{ ok: false, error: String(e) }};
                    }}
                }})();
                ''',
                timeout=10.0,
            )
            if not info or not info.get("ok"):
                if cache_only and info and info.get("reason") == "no_cache":
                    await refresh_audio_inputs(False)
                    return
                logger.warning(f"Failed to enumerate audio inputs: {info.get('error') if info else 'no result'}")
                return

            inputs = info.get("inputs") or []
            preferred = info.get("preferred") or "default"
            options = {}
            has_default = False
            for i, d in enumerate(inputs):
                device_id = d.get("deviceId") or ""
                if not device_id:
                    continue
                label = d.get("label") or f"audioinput-{i + 1}"
                if device_id == "default":
                    has_default = True
                    label = default_label
                options[device_id] = label

            if not has_default:
                options["default"] = default_label

            if preferred not in set(options.keys()):
                preferred = "default" if "default" in set(options.keys()) else next(iter(options.keys()), None)

            mic_select.options = options
            mic_select.value = preferred
            mic_select.update()
            selected_label = options.get(preferred) if preferred else None
            logger.info(f"Audio inputs enumerated count={len(inputs)} selected={preferred} label={selected_label}")

        async def persist_audio_input(device_id: str):
            await client.run_javascript(
                f"window.localStorage.setItem('echoflow_mic_device_id', {json.dumps(device_id)}); return true;",
                timeout=5.0,
            )

        async def on_mic_change(e):
            device_id = e.value or "default"
            await persist_audio_input(device_id)
            selected_label = (mic_select.options or {}).get(device_id)
            logger.info(f"Audio input selected device_id={device_id} label={selected_label}")

        mic_select.on('update:model-value', on_mic_change)
        refresh_btn.on("click", lambda: asyncio.create_task(refresh_audio_inputs(False)))
        asyncio.create_task(refresh_audio_inputs(True))

        async def persist_asr_model(model_size: str):
            await client.run_javascript(
                f"window.localStorage.setItem('echoflow_asr_model_size', {json.dumps(model_size)}); return true;",
                timeout=5.0,
            )

        async def refresh_asr_models():
            raw = None
            try:
                raw = await host.asr.list_models()
            except Exception as e:
                logger.warning(f"Failed to list ASR models: {e}")
                return

            if not isinstance(raw, dict) or raw.get("code") != 200:
                msg = raw.get("message") if isinstance(raw, dict) else None
                logger.warning(f"ASR list_models failed: {msg or 'unknown'}")
                return

            data = raw.get("data") or {}
            models = data.get("models") or []
            default_model = data.get("default_model")
            loaded_model = data.get("loaded_model")

            options = {}
            for m in models:
                if not isinstance(m, dict):
                    continue
                model_id = (
                    m.get("id")
                    or m.get("model_size")
                    or m.get("size")
                    or m.get("name")
                    or ""
                )
                model_id = str(model_id).strip()
                if not model_id:
                    continue
                installed = bool(m.get("installed"))
                name = str(m.get("name") or model_id)
                if installed:
                    label = f"{name}"
                else:
                    label = f"{name} (未安装)" if lang.startswith("zh") else f"{name} (not installed)"
                options[model_id] = label

            if not options:
                asr_select.options = {}
                asr_select.update()
                ui.notify("未检测到可用模型" if lang.startswith("zh") else "No models available", type="warning")
                return

            asr_select.options = options
            asr_select.update()

            preferred = ""
            try:
                preferred = await client.run_javascript(
                    "return window.localStorage.getItem('echoflow_asr_model_size') || '';",
                    timeout=5.0,
                )
            except Exception:
                preferred = ""

            chosen = None
            for cand in (preferred, loaded_model, default_model):
                if cand and str(cand) in options:
                    chosen = str(cand)
                    break
            if not chosen:
                chosen = next(iter(options.keys()))

            asr_select.value = chosen
            asr_select.update()
            await persist_asr_model(chosen)

        async def on_asr_change(e):
            model_size = str(e.value or "")
            await persist_asr_model(model_size)
            logger.info(f"ASR model selected model_size={model_size}")

        asr_select.on("update:model-value", on_asr_change)
        asr_refresh_btn.on("click", lambda: asyncio.create_task(refresh_asr_models()))
        asyncio.create_task(refresh_asr_models())

        def sync_score_panel_state() -> None:
            sync_score_panel(
                score_panel,
                lang=lang,
                is_recording=bool(state.get("is_recording")),
                is_analyzing=bool(state.get("is_analyzing")),
                current_score=state.get("current_score"),
            )

        sync_score_panel_state()

        async def do_scoring():
            if not segment:
                return

            wav_path: Optional[Path] = None
            try:
                wav_path = Path(state.get("latest_wav_path") or "")
                if not wav_path.exists():
                    ui.notify("未检测到录音数据", type="warning")
                    logger.warning("No audio file detected for scoring")
                    return

                state["is_analyzing"] = True
                sync_score_panel_state()

                try:
                    with wave.open(str(wav_path), "rb") as wf:
                        frames = wf.readframes(wf.getnframes())
                        sw = int(wf.getsampwidth())
                    peak = float(audioop.max(frames, sw)) / 32768.0 if frames and sw == 2 else 0.0
                    rms = float(audioop.rms(frames, sw)) / 32768.0 if frames and sw == 2 else 0.0
                    rms_dbfs = 20.0 * math.log10(rms + 1e-12) if rms >= 0 else float("-inf")
                    logger.info(f"Audio stats peak={peak:.4f} rms_dbfs={rms_dbfs:.1f}")
                    if peak < 0.005:
                        ui.notify("录音音量过低/无声音，请检查麦克风输入设备", type="warning")
                except Exception:
                    pass

                pipeline = get_pipeline()
                report = await pipeline.score(
                    str(wav_path),
                    segment.text,
                    language="en",
                    context={
                        "course_title": getattr(course, "title", None),
                        "asr_model_size": asr_select.value,
                    },
                )
                await render_score_v2(
                    report=report,
                    wav_path=wav_path,
                    client=client,
                    lang=lang,
                    t=_t,
                    colors=c,
                    course=course,
                    course_db=course_db,
                    ensure_practice_plan=bool(ensure_practice_plan),
                    update_practice_plan_cursor=bool(update_practice_plan_cursor),
                    segment=segment,
                    state=state,
                    score_container=score_container,
                    score_status_label=score_status_label,
                    score_label=score_label,
                    accuracy_label=accuracy_label,
                    completeness_label=completeness_label,
                    fluency_label=fluency_label,
                    word_feedback_container=word_feedback_container,
                    v2_media_container=v2_media_container,
                    mount_static=_mount_static,
                )
                if on_scored is not None:
                    try:
                        payload = {
                            "course_id": str(course.id),
                            "segment_idx": int(getattr(segment, "id", 0) or 0),
                            "overall": int(getattr(getattr(report, "scores", None), "overall", 0) or 0),
                        }
                        await on_scored(payload)
                    except Exception:
                        pass

            except Exception as e:
                logger.error(f"Scoring failed: {e}", exc_info=True)
                await render_basic_score(
                    lang=lang,
                    t=_t,
                    colors=c,
                    course=course,
                    course_db=course_db,
                    ensure_practice_plan=bool(ensure_practice_plan),
                    update_practice_plan_cursor=bool(update_practice_plan_cursor),
                    segment=segment,
                    state=state,
                    score_container=score_container,
                    score_status_label=score_status_label,
                    score_label=score_label,
                    accuracy_label=accuracy_label,
                    completeness_label=completeness_label,
                    fluency_label=fluency_label,
                    word_feedback_container=word_feedback_container,
                    overall=0,
                    accuracy=0,
                    completeness=0,
                    fluency=0,
                    words=[],
                )
                ui.notify(f"评分失败: {str(e)}", type='negative')
            finally:
                state["is_analyzing"] = False
                sync_score_panel_state()

        # Recording functions
        async def start_recording():
            state["is_recording"] = True
            state["is_analyzing"] = False
            state["current_score"] = None
            state["audio_chunks"] = []
            record_btn.props('color=red')
            sync_score_panel_state()
            selected_device_id = mic_select.value or "default"
            if state.get("latest_wav_path"):
                safe_unlink(state.get("latest_wav_path"))
                state["latest_wav_path"] = None
            
            result = await client.run_javascript(
                f"return await window.echoflowRecorder.start({json.dumps(selected_device_id)});",
                timeout=10.0,
            )

            if not result or not result.get("ok"):
                state["is_recording"] = False
                record_btn.props('color=primary')
                ui.notify("无法启动录音，请检查麦克风权限", type='negative')
                logger.warning(f"Failed to start recording: {result.get('error') if result else 'no result'}")
                return

            track_info = result.get("trackInfo") or {}
            preferred_id = result.get("preferredId")
            used_preferred_id = bool(result.get("usedPreferredId"))
            fallback_used = bool(result.get("fallbackUsed"))
            label = track_info.get("label")
            settings = track_info.get("settings") or {}
            logger.info(
                f"Recording started mic_label={label} device_id={settings.get('deviceId')} "
                f"preferred_id={preferred_id} used_preferred_id={used_preferred_id} fallback_used={fallback_used}"
            )
            if fallback_used and used_preferred_id:
                ui.notify("选择的麦克风不可用，已回退到系统默认输入。", type="warning")
            if isinstance(label, str) and "BlackHole" in label:
                ui.notify("检测到当前输入设备为 BlackHole（虚拟设备），可能会录到静音。请在下方切换麦克风输入。", type="warning")
        
        async def stop_recording():
            state["is_recording"] = False
            record_btn.props('color=primary')
            sync_score_panel_state()
            
            try:
                # Stop recording and get audio data
                result = await client.run_javascript(
                    "return await window.echoflowRecorder.stop();",
                    timeout=20.0,
                )
                
                if result and result.get("wav_base64"):
                    wav_path = new_temp_path(".wav", prefix="rec_")
                    with open(wav_path, "wb") as f:
                        f.write(base64.b64decode(result["wav_base64"]))
                    state["latest_wav_path"] = str(wav_path)
                    try:
                        size = wav_path.stat().st_size
                    except Exception:
                        size = -1
                    logger.info(f"Saved recording to {wav_path} size={size}")
                    if result.get("diagnostics") is not None:
                        logger.info(f"Recorder diagnostics: {result['diagnostics']}")
                else:
                    if result and result.get("diagnostics") is not None:
                        logger.info(f"Recorder diagnostics: {result['diagnostics']}")
                    logger.warning("No audio data received from browser")
                    ui.notify("未收到录音数据", type='warning')
            
            except Exception as e:
                logger.error(f"Error getting audio from browser: {e}")
                ui.notify("录音数据传输失败", type='negative')
            
            # Score the recording
            await do_scoring()

        async def toggle_recording() -> None:
            if state["is_recording"]:
                await stop_recording()
            else:
                await start_recording()

        record_toggle_handler["fn"] = toggle_recording
        
async def render_practice_view(
    course: "Course",
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
):
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    next_mode = "light" if theme_mode == "dark" else "dark"
    query = f"?theme={theme_mode}&lang={lang}"

    await render_practice_component(
        course=course,
        course_db=course_db,
        theme=theme,
        lang=lang,
        on_back=lambda: ui.navigate.to(f"/{query}"),
        on_refresh=lambda: ui.navigate.to(f"/practice/{course.id}{query}"),
        on_report=lambda: ui.navigate.to(f"/report/{course.id}{query}"),
        on_theme_toggle=lambda: ui.navigate.to(f"/practice/{course.id}?theme={next_mode}&lang={lang}"),
    )


async def render_coach_view(
    course: "Course",
    course_db: "CourseDatabase",
    theme,
    lang: str = "zh",
    *,
    on_scored: Optional[Callable[[dict], Awaitable[None]]] = None,
    on_skipped: Optional[Callable[[dict], Awaitable[None]]] = None,
):
    from ui.coach.page import render_coach_view as _render

    await _render(course, course_db, theme, lang=lang, view="")
