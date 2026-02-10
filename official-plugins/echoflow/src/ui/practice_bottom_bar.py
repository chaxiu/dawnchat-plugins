from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Optional

from nicegui import ui


@dataclass
class PracticeBottomBar:
    root: Any
    mic_select: Any
    mic_refresh_btn: Any
    asr_select: Any
    asr_refresh_btn: Any
    prev_btn: Any
    play_btn: Any
    record_btn: Any
    next_btn: Any
    settings_btn: Any
    threshold_slider: Any


def build_practice_bottom_bar(
    *,
    mic_label: str,
    asr_label: str,
    on_prev: Callable[[], Any],
    on_play_reference: Callable[[], Any],
    on_toggle_recording: Callable[[], Any],
    on_next: Callable[[], Any],
    threshold_label: str,
    threshold_value: int,
    on_threshold_change: Callable[[int], Any],
    theme_toggle_label: str,
    on_theme_toggle: Callable[[], Any],
    build_settings_extras: Optional[Callable[[], Any]] = None,
) -> PracticeBottomBar:
    with ui.element("div").classes("practice-bottom-bar") as root:
        with ui.element("div").classes("practice-bottom-bar-inner"):
            with ui.element("div").classes("practice-bottom-grid"):
                with ui.element("div").classes("practice-toolbar-selects"):
                    def _select_row(label: str):
                        with ui.row().classes("w-full items-center gap-2 practice-toolbar-row"):
                            ui.label(label).classes("practice-toolbar-label")
                            container = ui.element("div").classes("practice-toolbar-field flex-1")
                            refresh = ui.button(icon="refresh").props("flat round dense size=sm").classes(
                                "practice-toolbar-refresh"
                            )
                        return container, refresh

                    mic_container, mic_refresh_btn = _select_row(f"{mic_label}:")
                    with mic_container:
                        mic_select = ui.select(options={}, value=None).props("dense borderless").classes(
                            "w-full practice-toolbar-select"
                        )

                    asr_container, asr_refresh_btn = _select_row(f"{asr_label}:")
                    with asr_container:
                        asr_select = ui.select(options={}, value=None).props("dense borderless").classes(
                            "w-full practice-toolbar-select"
                        )

                with ui.element("div").classes("practice-toolbar-actions"):
                    with ui.row().classes("w-full justify-center gap-3"):
                        prev_btn = (
                            ui.button("⏮", on_click=on_prev)
                            .classes("control-button")
                            .props("round")
                            .style("background-color: var(--echoflow-bg-secondary);")
                        )
                        play_btn = ui.button(icon="play_arrow", on_click=on_play_reference).classes(
                            "control-button"
                        ).props("round color=primary")
                        record_btn = ui.button("🎤", on_click=on_toggle_recording).classes("control-button").props(
                            "round color=red"
                        )
                        next_btn = (
                            ui.button("⏭", on_click=on_next)
                            .classes("control-button")
                            .props("round")
                            .style("background-color: var(--echoflow-bg-secondary);")
                        )

                with ui.element("div").classes("practice-toolbar-settings"):
                    with ui.button(icon="settings").props("flat round").classes("w-full") as settings_btn:
                        with ui.menu():
                            with ui.element("div").classes("practice-settings-menu"):
                                threshold_value_label = ui.label(
                                    f"{threshold_label}: {int(threshold_value)}"
                                ).classes("practice-settings-title")
                                threshold_slider = (
                                    ui.slider(min=50, max=100, step=5, value=int(threshold_value))
                                    .classes("w-64")
                                    .props("label label-always")
                                )

                                def _on_slider(e) -> None:
                                    value = int(e.value)
                                    threshold_value_label.text = f"{threshold_label}: {value}"
                                    on_threshold_change(value)

                                threshold_slider.on("update:model-value", _on_slider)
                                if build_settings_extras is not None:
                                    ui.separator()
                                    build_settings_extras()
                                ui.separator()
                                ui.menu_item(theme_toggle_label, on_click=on_theme_toggle)

    return PracticeBottomBar(
        root=root,
        mic_select=mic_select,
        mic_refresh_btn=mic_refresh_btn,
        asr_select=asr_select,
        asr_refresh_btn=asr_refresh_btn,
        prev_btn=prev_btn,
        play_btn=play_btn,
        record_btn=record_btn,
        next_btn=next_btn,
        settings_btn=settings_btn,
        threshold_slider=threshold_slider,
    )
