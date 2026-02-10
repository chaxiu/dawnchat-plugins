from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from nicegui import ui


@dataclass
class ScorePanel:
    root: Any
    status_label: Any
    details: Any
    recognition: Any
    score_label: Any
    accuracy_label: Any
    completeness_label: Any
    fluency_label: Any


def build_score_panel(*, colors: Any, lang: str, t: Callable[[str], str]) -> ScorePanel:
    with ui.element("div").classes("panel-card score-panel") as root:
        ui.label("分数" if lang.startswith("zh") else "Score").classes("font-semibold").style(
            f"color:{colors.text_primary};"
        )

        status_label = ui.label("").classes("score-status").style(f"color:{colors.text_secondary};")

        details = ui.column().classes("score-details w-full items-center")
        details.set_visibility(False)
        with details:
            score_label = ui.label("--").classes("score-display").style(f"color: {colors.primary};")
            with ui.row().classes("gap-4 mt-2"):
                accuracy_label = ui.label(f"{t('accuracy')}: --")
                completeness_label = ui.label(f"{t('completeness')}: --")
                fluency_label = ui.label(f"{t('fluency')}: --")

            recognition = ui.element("div").classes("score-recognition").props("id=echoflow-score-recognition")

    return ScorePanel(
        root=root,
        status_label=status_label,
        details=details,
        recognition=recognition,
        score_label=score_label,
        accuracy_label=accuracy_label,
        completeness_label=completeness_label,
        fluency_label=fluency_label,
    )


def sync_score_panel(
    panel: ScorePanel,
    *,
    lang: str,
    is_recording: bool,
    is_analyzing: bool,
    current_score: Any,
) -> None:
    if is_analyzing:
        panel.details.set_visibility(False)
        panel.status_label.set_visibility(True)
        panel.status_label.text = "分析中..." if lang.startswith("zh") else "Analyzing..."
        return

    if is_recording:
        panel.details.set_visibility(False)
        panel.status_label.set_visibility(False)
        panel.status_label.text = ""
        return

    if current_score is None:
        panel.details.set_visibility(False)
        panel.status_label.set_visibility(True)
        panel.status_label.text = "点击录音按钮开始跟读" if lang.startswith("zh") else "Click the record button to start"
        return

    panel.status_label.set_visibility(False)
    panel.status_label.text = ""
    panel.details.set_visibility(True)
