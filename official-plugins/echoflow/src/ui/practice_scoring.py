from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, Optional
import json

from nicegui import ui

from course.models import WordScore
from ui.practice_v2_helpers import escape_html, hex_to_rgba, region_color, region_label_html


async def render_basic_score(
    *,
    lang: str,
    t: Callable[[str], str],
    colors: Any,
    course: Any,
    course_db: Any,
    ensure_practice_plan: bool = True,
    update_practice_plan_cursor: bool = True,
    segment: Any,
    state: dict,
    score_container: Any,
    score_status_label: Any,
    score_label: Any,
    accuracy_label: Any,
    completeness_label: Any,
    fluency_label: Any,
    word_feedback_container: Any,
    overall: int,
    accuracy: int,
    completeness: int,
    fluency: int,
    words: Optional[list] = None,
) -> None:
    state["current_score"] = int(overall)
    score_container.set_visibility(True)
    score_status_label.set_visibility(False)
    score_label.text = str(int(overall))
    accuracy_label.text = f"{t('accuracy')}: {accuracy}"
    completeness_label.text = f"{t('completeness')}: {completeness}"
    fluency_label.text = f"{t('fluency')}: {fluency}"

    if words:
        word_feedback_container.clear()
        with word_feedback_container:
            for word_score in words:
                word_class = f"word word-{word_score.status.replace('_', '-')}"
                ui.label(word_score.word).classes(word_class)
    else:
        word_feedback_container.clear()
        with word_feedback_container:
            ui.label(
                "未检测到有效文本，请再试一次" if lang.startswith("zh") else "No valid text detected, try again"
            ).style(f"color:{colors.text_secondary};")

    if segment:
        segment.user_best_score = max(segment.user_best_score, int(overall))
        segment.attempts += 1
        segment.word_scores = words or []

        if int(overall) >= int(course.pass_threshold):
            segment.status = "passed"
            ui.notify(t("pass"), type="positive")
        else:
            ui.notify(t("retry"), type="warning")

        latest = state.get("latest_wav_path")
        if latest and hasattr(course_db, "record_attempt"):
            try:
                wav_path = Path(str(latest))
                if wav_path.exists():
                    course_db.record_attempt(
                        course_id=str(course.id),
                        segment_idx=int(getattr(segment, "id", 0) or 0),
                        wav_path=wav_path,
                        overall=int(overall),
                        scores={
                            "overall": int(overall),
                            "accuracy": int(accuracy),
                            "completeness": int(completeness),
                            "fluency": int(fluency),
                        },
                        report=None,
                    )
            except Exception:
                pass

        course_db.save(
            course,
            ensure_practice_plan=bool(ensure_practice_plan),
            update_practice_plan_cursor=bool(update_practice_plan_cursor),
        )


async def render_score_v2(
    *,
    report: Any,
    wav_path: Path,
    client: Any,
    lang: str,
    t: Callable[[str], str],
    colors: Any,
    course: Any,
    course_db: Any,
    ensure_practice_plan: bool = True,
    update_practice_plan_cursor: bool = True,
    segment: Any,
    state: dict,
    score_container: Any,
    score_status_label: Any,
    score_label: Any,
    accuracy_label: Any,
    completeness_label: Any,
    fluency_label: Any,
    word_feedback_container: Any,
    v2_media_container: Any,
    mount_static: Callable[[str, str], None],
) -> None:
    overall = int(getattr(report.scores, "overall", 0) or 0)
    content = getattr(report.scores, "content", None)

    state["current_score"] = overall
    score_container.set_visibility(True)
    score_status_label.set_visibility(False)
    score_label.text = str(overall)
    accuracy_label.text = f"{t('accuracy')}: {content if content is not None else '--'}"
    completeness_label.text = f"{t('completeness')}: --"
    fluency_label.text = f"{t('fluency')}: --"

    word_feedback_container.set_visibility(True)
    word_feedback_container.clear()

    duration = None
    try:
        duration = float(getattr(report.audio, "duration_s", None) or 0.0)
    except Exception:
        duration = None
    if not duration or duration <= 0.0:
        duration = 3.0

    word_regions = list(getattr(getattr(report, "timeline_layers", None), "word_regions", []) or [])
    insertion_regions = [r for r in word_regions if (getattr(r, "meta", None) or {}).get("status") == "insertion"]

    with word_feedback_container:
        spans = []
        for r in word_regions:
            meta = getattr(r, "meta", None) or {}
            status = meta.get("status") or ""
            label = getattr(r, "label", "") or ""
            minor = meta.get("minor_kind") == "suffix"
            if status == "match":
                cls = "word word-perfect"
            elif status == "substitution" and minor:
                cls = "word word-perfect word-minor"
            elif status == "substitution":
                cls = "word word-good"
            else:
                cls = "word word-needs-work"
            start_s = float(r.time_span.start_s)
            end_s = float(r.time_span.end_s)
            label_html = region_label_html(label, meta)
            spans.append(
                f'<span class="{cls}" onclick="window.echoflowV2.playSpan({start_s:.3f},{end_s:.3f})">{label_html}</span>'
            )
        ui.html(f'<div class="word-line">{"".join(spans)}</div>', sanitize=False)

    try:
        await client.run_javascript(
            "setTimeout(() => window.echoflowFitText && window.echoflowFitText('echoflow-score-recognition', {max: 26, min: 14}), 0);",
            timeout=5.0,
        )
    except Exception:
        pass

    v2_media_container.set_visibility(True)

    tmp_route = "/echoflow-tmp"
    mount_static(tmp_route, str(wav_path.parent))
    audio_url = f"{tmp_route}/{wav_path.name}"

    timeline_regions = []
    for r in word_regions:
        meta = getattr(r, "meta", None) or {}
        status = meta.get("status") or ""
        minor = meta.get("minor_kind") == "suffix"
        timeline_regions.append(
            {
                "kind": "word",
                "status": status,
                "label": r.label,
                "label_html": region_label_html(r.label or "", meta),
                "minor": minor,
                "start_s": float(r.time_span.start_s),
                "end_s": float(r.time_span.end_s),
                "color": region_color(colors, "word", status, minor=minor),
            }
        )

    word_lane_html = ""
    ins_lane_html = ""
    for r in timeline_regions:
        left = max(0.0, min(100.0, (float(r["start_s"]) / duration) * 100.0))
        width = max(0.6, min(100.0 - left, (float(r["end_s"]) - float(r["start_s"])) / duration * 100.0))
        label = r.get("label_html") or escape_html(str(r.get("label") or ""))
        color = r["color"]
        start_s = float(r["start_s"])
        end_s = float(r["end_s"])
        div = (
            f'<div class="v2-region" style="left:{left:.3f}%;width:{width:.3f}%;background:{color};" '
            f'onclick="window.echoflowV2.playSpan({start_s:.3f},{end_s:.3f})">{label}</div>'
        )
        if r["status"] == "insertion":
            ins_lane_html += div
        else:
            word_lane_html += div

    insertions_html = ""
    for r in insertion_regions:
        label = json.dumps(getattr(r, "label", "") or "")[1:-1]
        start_s = float(r.time_span.start_s)
        end_s = float(r.time_span.end_s)
        insertions_html += (
            f'<span class="v2-chip" onclick="window.echoflowV2.playSpan({start_s:.3f},{end_s:.3f})">+ {label}</span>'
        )

    theme_payload = {
        "waveColor": hex_to_rgba(colors.border, 0.55),
        "progressColor": hex_to_rgba(colors.primary, 0.95),
        "cursorColor": hex_to_rgba(colors.text_primary, 0.8),
    }

    await client.run_javascript(
        f"""
        (function() {{
            const wordLane = document.getElementById('echoflow-v2-word-lane');
            const insLane = document.getElementById('echoflow-v2-ins-lane');
            const insertions = document.getElementById('echoflow-v2-insertions');
            const timeline = document.getElementById('echoflow-v2-timeline');
            if (wordLane) wordLane.innerHTML = {json.dumps(word_lane_html)};
            if (insLane) insLane.innerHTML = {json.dumps(ins_lane_html)};
            if (insertions) insertions.innerHTML = {json.dumps(insertions_html)};
            const hasInsertionsLane = {json.dumps(bool(ins_lane_html.strip()))};
            if (insLane) insLane.style.display = hasInsertionsLane ? '' : 'none';
            if (timeline) timeline.style.height = hasInsertionsLane ? '' : '27px';
            if (wordLane) wordLane.style.borderBottom = hasInsertionsLane ? '' : 'none';
            const hasInsertionChips = {json.dumps(bool(insertions_html.strip()))};
            if (insertions) insertions.style.display = hasInsertionChips ? '' : 'none';
            window.echoflowV2.renderWave({json.dumps(audio_url)}, {json.dumps(theme_payload)});
            window.echoflowV2.renderRegions({json.dumps(timeline_regions)});
        }})();
        """,
        timeout=20.0,
    )

    if segment:
        segment.user_best_score = max(segment.user_best_score, overall)
        segment.attempts += 1
        segment.word_scores = []
        for r in word_regions:
            meta = getattr(r, "meta", None) or {}
            status = meta.get("status") or ""
            minor = meta.get("minor_kind") == "suffix"
            if status == "insertion":
                continue
            if status == "match":
                ws_status = "perfect"
                ws_score = 100
            elif status == "substitution" and minor:
                ws_status = "good"
                ws_score = 90
            elif status == "substitution":
                ws_status = "needs_work"
                ws_score = 60
            else:
                ws_status = "missed"
                ws_score = 0
            segment.word_scores.append(WordScore(word=r.label, score=ws_score, phonemes="", status=ws_status))

        if overall >= int(course.pass_threshold):
            segment.status = "passed"
            ui.notify(t("pass"), type="positive")
        else:
            ui.notify(t("retry"), type="warning")

        if hasattr(course_db, "record_attempt"):
            try:
                scores_payload = {}
                try:
                    scores_payload = (
                        report.scores.model_dump() if hasattr(report.scores, "model_dump") else report.scores.dict()
                    )
                except Exception:
                    scores_payload = {"overall": overall}

                report_payload = None
                try:
                    report_payload = report.model_dump() if hasattr(report, "model_dump") else report.dict()
                except Exception:
                    report_payload = None

                course_db.record_attempt(
                    course_id=str(course.id),
                    segment_idx=int(getattr(segment, "id", 0) or 0),
                    wav_path=wav_path,
                    overall=int(overall),
                    scores=scores_payload,
                    report=report_payload,
                    asr_model=(
                        (getattr(report, "debug", None) or {}).get("asr_chosen")
                        if isinstance(getattr(report, "debug", None) or {}, dict)
                        else None
                    ),
                    scoring_model="v2",
                )
            except Exception:
                pass

        course_db.save(
            course,
            ensure_practice_plan=bool(ensure_practice_plan),
            update_practice_plan_cursor=bool(update_practice_plan_cursor),
        )
