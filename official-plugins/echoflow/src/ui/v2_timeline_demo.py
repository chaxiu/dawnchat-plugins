from __future__ import annotations

import json
from typing import Optional

from nicegui import ui

from v2.mock import mock_report


def _region_color(theme, kind: str, severity: Optional[str]) -> str:
    c = theme.colors
    if kind == "pause":
        if severity == "warning":
            return c.warning
        return c.border
    if severity == "error":
        return c.danger
    if severity == "warning":
        return c.warning
    return c.success


async def render_v2_timeline_demo(theme, lang: str = "zh"):
    c = theme.colors
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    query = f"?theme={theme_mode}&lang={lang}"

    ui.add_head_html(
        f"""
        <style>
        body {{
            background-color: {c.bg_primary} !important;
        }}
        .v2-card {{
            background-color: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 12px;
            padding: 1rem;
        }}
        .timeline {{
            position: relative;
            width: 100%;
            height: 52px;
            background: {c.bg_primary};
            border: 1px solid {c.border};
            border-radius: 10px;
            overflow: hidden;
        }}
        .lane {{
            position: relative;
            width: 100%;
            height: 26px;
            border-bottom: 1px solid {c.border};
        }}
        .lane:last-child {{
            border-bottom: none;
        }}
        .region {{
            position: absolute;
            top: 3px;
            height: 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 6px;
            font-size: 12px;
            color: {c.text_primary};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        .legend-chip {{
            border: 1px solid {c.border};
            border-radius: 999px;
            padding: 2px 10px;
            font-size: 12px;
            color: {c.text_secondary};
        }}
        </style>
        """
    )

    report = mock_report()
    duration = float(report.audio.duration_s) if report.audio and report.audio.duration_s else 3.2
    duration = max(duration, 0.001)

    with ui.row().classes("w-full items-center justify-between p-4").style(
        f"background-color: {c.bg_secondary}; border-bottom: 1px solid {c.border};"
    ):
        ui.button("←", on_click=lambda: ui.navigate.to(f"/{query}")).props("flat").style(
            f"color: {c.text_primary};"
        )
        ui.label("v2 timeline demo").classes("text-lg font-semibold").style(
            f"color: {c.text_primary};"
        )
        ui.element("div").classes("w-10")

    with ui.column().classes("w-full max-w-3xl mx-auto p-4 gap-4"):
        with ui.element("div").classes("v2-card"):
            ui.label(f"schema={report.schema_version} ir={report.ir_version}").style(
                f"color: {c.text_secondary};"
            )
            ui.label(
                f"overall={report.scores.overall} content={report.scores.content} fluency={report.scores.fluency}"
            ).style(f"color: {c.text_primary};")

        with ui.element("div").classes("v2-card"):
            with ui.row().classes("w-full items-center justify-between mb-3"):
                ui.label("Timeline").classes("font-semibold").style(f"color: {c.text_primary};")
                with ui.row().classes("gap-2"):
                    ui.label("word").classes("legend-chip")
                    ui.label("pause").classes("legend-chip")

            timeline = ui.element("div").classes("timeline")
            with timeline:
                word_lane = ui.element("div").classes("lane")
                pause_lane = ui.element("div").classes("lane")

            for r in report.timeline_layers.word_regions:
                left = max(0.0, min(100.0, (float(r.time_span.start_s) / duration) * 100.0))
                width = max(
                    0.5,
                    min(100.0 - left, (float(r.time_span.duration_s()) / duration) * 100.0),
                )
                color = _region_color(theme, "word", r.severity.value if r.severity else None)
                with word_lane:
                    ui.html(
                        f'<div class="region" style="left:{left:.3f}%;width:{width:.3f}%;background:{color};">{json.dumps(r.label)[1:-1]}</div>',
                        sanitize=False,
                    )

            for r in report.timeline_layers.pause_regions:
                left = max(0.0, min(100.0, (float(r.time_span.start_s) / duration) * 100.0))
                width = max(
                    0.5,
                    min(100.0 - left, (float(r.time_span.duration_s()) / duration) * 100.0),
                )
                color = _region_color(theme, "pause", r.severity.value if r.severity else None)
                with pause_lane:
                    ui.html(
                        f'<div class="region" style="left:{left:.3f}%;width:{width:.3f}%;background:{color};">{json.dumps(r.label)[1:-1]}</div>',
                        sanitize=False,
                    )

        with ui.element("div").classes("v2-card"):
            ui.label("Explanations").classes("font-semibold").style(f"color: {c.text_primary};")
            for e in report.explanations:
                ui.label(f"[{e.severity}] {e.message}").style(f"color: {c.text_primary};")

        with ui.expansion("Raw JSON").classes("v2-card"):
            ui.code(json.dumps(report.model_dump() if hasattr(report, "model_dump") else report.dict(), ensure_ascii=False, indent=2)).classes(
                "w-full"
            )
