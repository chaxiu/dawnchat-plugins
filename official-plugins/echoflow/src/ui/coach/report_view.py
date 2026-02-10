from __future__ import annotations

from typing import TYPE_CHECKING, Any

from nicegui import ui

from i18n import i18n

if TYPE_CHECKING:
    from course.models import Course


def render_coach_report_view(*, course: "Course", theme: Any, lang: str, nodes: list[dict[str, Any]], query: str) -> None:
    c = theme.colors

    def _t(key: str) -> str:
        return i18n.t(key, lang)

    done = sum(1 for n in nodes if str(n.get("state") or "").lower() == "done")
    skipped = sum(1 for n in nodes if str(n.get("state") or "").lower() == "skipped")

    with ui.element("div").classes("v2-card w-full"):
        ui.label(_t("coach_report") if _t("coach_report") != "coach_report" else "本次 Coach 报告").classes(
            "font-semibold text-lg"
        ).style(f"color:{c.text_primary};")
        ui.label(f"{done}/{len(nodes)}").style(f"color:{c.text_secondary};")

        with ui.row().classes("w-full gap-3"):
            with ui.element("div").classes("flex-1"):
                ui.label(_t("done_nodes") if _t("done_nodes") != "done_nodes" else "已完成节点").style(
                    f"color:{c.text_secondary};"
                )
                ui.label(str(done)).classes("text-2xl font-semibold").style(f"color:{c.success};")
            with ui.element("div").classes("flex-1"):
                ui.label(_t("skipped_nodes") if _t("skipped_nodes") != "skipped_nodes" else "已跳过节点").style(
                    f"color:{c.text_secondary};"
                )
                ui.label(str(skipped)).classes("text-2xl font-semibold").style(f"color:{c.warning};")

        ui.button(
            _t("open_full_report") if _t("open_full_report") != "open_full_report" else "打开完整报告",
            on_click=lambda: ui.navigate.to(f"/report/{course.id}{query}"),
        ).props("color=primary").classes("mt-2")

