from __future__ import annotations

import asyncio
from pathlib import Path
from typing import TYPE_CHECKING, Any, Awaitable, Callable, Optional

from nicegui import app, ui

from i18n import i18n

if TYPE_CHECKING:
    from course.models import Course


_STATIC_ROUTES: set[str] = set()


def _mount_static(route: str, directory: str) -> None:
    if route in _STATIC_ROUTES:
        return
    try:
        app.add_static_files(route, directory)
    except Exception:
        pass
    _STATIC_ROUTES.add(route)


def narration_audio_path(*, base_dir: Path, course_id: str, kind: str, input_hash: str) -> Path:
    safe_kind = "".join(ch for ch in str(kind or "narration") if ch.isalnum() or ch in {"_", "-"})
    safe_hash = "".join(ch for ch in str(input_hash or "") if ch.isalnum())
    return Path(base_dir) / "tts" / str(course_id) / f"{safe_kind}_{safe_hash}.wav"


async def render_narration_card(
    *,
    course: "Course",
    theme: Any,
    lang: str,
    title: str,
    meta: str,
    cached_text: str,
    cached_audio_path: Optional[str],
    video_enabled: bool = False,
    video_strategy: str = "freeze",
    on_video_strategy_change: Optional[Callable[[str], None]] = None,
    auto_continue: bool = False,
    on_generate: Callable[[], Awaitable[tuple[str, Optional[str], Optional[Path]]]],
    on_continue: Callable[[], None],
    on_skip: Callable[[], None],
) -> None:
    c = theme.colors
    client = ui.context.client

    def _t(key: str) -> str:
        return i18n.t(key, lang)

    container = ui.element("div").classes("v2-card w-full")
    with container:
        with ui.row().classes("w-full items-start justify-between gap-3"):
            with ui.column().classes("gap-1"):
                ui.label(title).classes("font-semibold text-lg").style(f"color:{c.text_primary};")
                ui.label(meta).style(f"color:{c.text_secondary}; font-size: 0.85rem;")
            status_label = ui.label("").style(f"color:{c.text_secondary}; font-size: 0.85rem;")

        content_md = ui.markdown(cached_text or "").classes("w-full")
        error_label = ui.label("").style("color: #ef4444; font-size: 0.9rem;").classes("w-full")
        error_label.set_visibility(False)

        audio_area = ui.element("div").classes("w-full")

        if bool(video_enabled):
            strategy_options = (
                {"follow_muted": "跟随画面（静音）", "freeze": "冻结画面", "none": "不联动"}
                if str(lang).startswith("zh")
                else {"follow_muted": "Follow (muted)", "freeze": "Freeze frame", "none": "No linkage"}
            )
            with ui.row().classes("w-full items-center justify-between gap-3 mt-2"):
                video_strategy_select = (
                    ui.select(strategy_options, value=str(video_strategy or "freeze"))
                    .props("dense")
                    .classes("w-[240px]")
                )
                with ui.row().classes("items-center gap-2"):
                    ui.button(
                        "原片预览（可跳过）" if str(lang).startswith("zh") else "Preview clip (skippable)",
                        on_click=lambda: ui.run_javascript(
                            """
                            (function () {
                              const vc = window.echoflowVideoController;
                              const panel = document.getElementById('echoflow-video-panel');
                              if (panel) panel.style.display = '';
                              if (vc) {
                                try {
                                  const a = document.getElementById('echoflow-narration-audio');
                                  if (a && a.pause) a.pause();
                                } catch (e) {}
                                try { vc.setMuted(false); } catch (e) {}
                                try {
                                  const token = String(Date.now()) + ':' + String(Math.random());
                                  window._echoflowPreviewToken = token;
                                  window.addEventListener('echoflowVideoClipEnded', function () {
                                    if (window._echoflowPreviewToken !== token) return;
                                    try {
                                      const a = document.getElementById('echoflow-narration-audio');
                                      if (a && a.play) {
                                        const p = a.play();
                                        if (p && p.catch) p.catch(function () {});
                                      }
                                    } catch (e) {}
                                  }, { once: true });
                                } catch (e) {}
                                try { vc.playOnce(); } catch (e) {}
                              }
                            })();
                            """
                        ),
                    ).props("outline dense")
                    ui.button(
                        "跳过" if str(lang).startswith("zh") else "Skip",
                        on_click=lambda: ui.run_javascript(
                            """
                            (function () {
                              const vc = window.echoflowVideoController;
                              if (vc) { try { vc.stop(); } catch (e) {} }
                              try {
                                const a = document.getElementById('echoflow-narration-audio');
                                if (a && a.play) {
                                  const p = a.play();
                                  if (p && p.catch) p.catch(function () {});
                                }
                              } catch (e) {}
                            })();
                            """
                        ),
                    ).props("outline dense")
                    ui.button(
                        "回看原片（有声）" if str(lang).startswith("zh") else "Play original (audio)",
                        on_click=lambda: ui.run_javascript(
                            """
                            (function () {
                              const vc = window.echoflowVideoController;
                              const panel = document.getElementById('echoflow-video-panel');
                              if (panel) panel.style.display = '';
                              if (vc) {
                                try {
                                  const a = document.getElementById('echoflow-narration-audio');
                                  if (a && a.pause) a.pause();
                                } catch (e) {}
                                try { vc.setMuted(false); } catch (e) {}
                                try { vc.playOnce(); } catch (e) {}
                              }
                            })();
                            """
                        ),
                    ).props("dense")

            def _apply_video_strategy(value: str) -> None:
                s = str(value or "freeze").strip() or "freeze"
                try:
                    if on_video_strategy_change is not None:
                        on_video_strategy_change(s)
                except Exception:
                    pass
                ui.run_javascript(
                    f"""
                    (function () {{
                      const mode = {repr(s)};
                      window.echoflowVideoLinkStrategy = mode;
                      const panel = document.getElementById('echoflow-video-panel');
                      const vc = window.echoflowVideoController;
                      if (mode === 'none') {{
                        if (panel) panel.style.display = 'none';
                        if (vc) {{ try {{ vc.stop(); }} catch (e) {{}} }}
                        return;
                      }}
                      if (panel) panel.style.display = '';
                      if (vc) {{
                        try {{ vc.setMuted(mode === 'follow_muted'); }} catch (e) {{}}
                        try {{ vc.freezeAt(); }} catch (e) {{}}
                      }}
                    }})();
                    """
                )

            video_strategy_select.on("update:model-value", lambda e: _apply_video_strategy(str(getattr(e, "value", "") or "")))
            _apply_video_strategy(str(video_strategy or "freeze"))

        with ui.row().classes("w-full justify-end gap-2"):
            retry_btn = ui.button(_t("retry") if _t("retry") != "retry" else "重试").props("outline")
            retry_btn.set_visibility(False)
            skip_btn = ui.button(_t("skip") if _t("skip") != "skip" else "跳过").props("outline")
            continue_btn = ui.button(_t("continue") if _t("continue") != "continue" else "继续").props(
                "color=primary id=echoflow-narration-continue"
            )

    def _render_audio(src_path: Optional[str]) -> None:
        audio_area.clear()
        if not src_path:
            return
        try:
            p = Path(str(src_path))
            if not p.exists():
                return
            route = f"/echoflow-tts/{course.id}"
            _mount_static(route, str(p.parent))
            url = f"{route}/{p.name}"
        except Exception:
            return
        with audio_area:
            ui.html(
                f"""
                <audio id="echoflow-narration-audio" controls preload="none" style="width:100%;">
                  <source src="{url}" type="audio/wav" />
                </audio>
                """,
                sanitize=False,
            )

        async def _bind_audio_pause() -> None:
            try:
                await client.run_javascript(
                    """
                    (function () {
                      const a = document.getElementById('echoflow-narration-audio');
                      if (!a || a._echoflowBound) return;
                      a._echoflowBound = true;
                      function suspendAutoContinue() {
                        try { window.echoflowAutoContinueSuspended = true; } catch (e) {}
                        try { localStorage.setItem('echoflow_auto_continue_suspended', '1'); } catch (e) {}
                      }
                      function safePause(id) {
                        try {
                          const el = document.getElementById(id);
                          if (el && el.pause) el.pause();
                        } catch (e) {}
                      }
                      function safeSetVideoMode(mode) {
                        try { window.echoflowVideoLinkStrategy = String(mode || 'freeze'); } catch (e) {}
                      }
                      a.addEventListener('play', function () {
                        safePause('reference-audio');
                        const mode = String(window.echoflowVideoLinkStrategy || 'freeze');
                        const vc = window.echoflowVideoController;
                        if (mode === 'follow_muted') {
                          if (vc) {
                            try { vc.setMuted(true); } catch (e) {}
                            try { vc.playOnce(); } catch (e) {}
                          }
                        } else if (mode === 'none') {
                          if (vc) { try { vc.stop(); } catch (e) {} }
                        } else {
                          safeSetVideoMode('freeze');
                          if (vc) {
                            try { vc.freezeAt(); } catch (e) {}
                          } else {
                            safePause('echoflow-video');
                          }
                        }
                      });
                      a.addEventListener('pause', function () {
                        suspendAutoContinue();
                        const mode = String(window.echoflowVideoLinkStrategy || 'freeze');
                        const vc = window.echoflowVideoController;
                        if (mode === 'follow_muted' || mode === 'none') {
                          if (vc) { try { vc.stop(); } catch (e) {} }
                        }
                      });
                      a.addEventListener('seeking', function () { suspendAutoContinue(); });
                      a.addEventListener('seeked', function () { suspendAutoContinue(); });
                      a.addEventListener('ended', function () {
                        const mode = String(window.echoflowVideoLinkStrategy || 'freeze');
                        const vc = window.echoflowVideoController;
                        if (mode === 'follow_muted' || mode === 'none') {
                          if (vc) { try { vc.stop(); } catch (e) {} }
                        }
                      });
                    })();
                    """,
                    timeout=5.0,
                )
            except Exception:
                pass

        asyncio.create_task(_bind_audio_pause())

        async def _bind_audio_auto_continue() -> None:
            if not bool(auto_continue):
                return
            try:
                await client.run_javascript(
                    """
                    (function () {
                      const a = document.getElementById('echoflow-narration-audio');
                      if (!a || a._echoflowAutoContinueBound) return;
                      a._echoflowAutoContinueBound = true;
                      a.addEventListener('ended', function () {
                        try {
                          const suspended = (window.echoflowAutoContinueSuspended === true) ||
                            (String(localStorage.getItem('echoflow_auto_continue_suspended') || '') === '1');
                          if (suspended) return;
                        } catch (e) {}
                        try {
                          const btn = document.getElementById('echoflow-narration-continue');
                          if (btn && btn.click) btn.click();
                        } catch (e) {}
                      });
                    })();
                    """,
                    timeout=5.0,
                )
            except Exception:
                pass

        asyncio.create_task(_bind_audio_auto_continue())

    def _set_status(text: str) -> None:
        status_label.text = text
        status_label.update()

    def _set_error(text: str) -> None:
        error_label.text = text
        error_label.set_visibility(bool(text))
        error_label.update()

    async def _generate() -> None:
        _set_error("")
        retry_btn.set_visibility(False)
        retry_btn.update()
        _set_status(_t("generating") if _t("generating") != "generating" else "生成中…")
        try:
            content_text, _, audio_path = await on_generate()
            content_md.content = str(content_text or "")
            content_md.update()
            _render_audio(str(audio_path) if audio_path else None)
            _set_status(_t("cached") if _t("cached") != "cached" else "已缓存")
        except Exception as e:
            _set_status(_t("failed") if _t("failed") != "failed" else "生成失败")
            _set_error(str(e))
            retry_btn.set_visibility(True)
            retry_btn.update()

    retry_btn.on("click", lambda: asyncio.create_task(_generate()))
    skip_btn.on("click", on_skip)
    continue_btn.on("click", on_continue)

    if cached_text:
        _set_status(_t("cached") if _t("cached") != "cached" else "已缓存")
    else:
        asyncio.create_task(_generate())

    _render_audio(cached_audio_path)
