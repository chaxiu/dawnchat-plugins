"""
Learning report view.
"""

from nicegui import ui, app
from typing import TYPE_CHECKING
from pathlib import Path

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


async def render_report_view(course: "Course", theme, lang: str = 'zh'):
    """
    Render the learning report for a course.
    """
    c = theme.colors
    theme_mode = 'dark' if getattr(theme, 'is_dark', True) else 'light'
    query = f'?theme={theme_mode}&lang={lang}'
    
    def _t(key):
        return i18n.t(key, lang)
    
    # Styles
    ui.add_head_html(f"""
    <style>
        body {{
            background-color: {c.bg_primary} !important;
        }}
        .report-container {{
            width: min(1200px, calc(100vw - 64px));
            margin: 0 auto;
            padding: 1.25rem 1.25rem 2.5rem;
            box-sizing: border-box;
        }}
        .report-grid {{
            display: grid;
            grid-template-columns: 420px 1fr;
            gap: 1rem;
            align-items: start;
        }}
        .report-card {{
            background-color: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 12px;
            padding: 1rem;
            box-sizing: border-box;
        }}
        .stat-number {{
            font-size: 2.5rem;
            font-weight: bold;
        }}
        .cover-box {{
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid {c.border};
            background: {c.bg_primary};
        }}
        .cover-box img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }}
        .segment-list {{
            max-height: calc(100vh - 240px);
            overflow: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }}
        .segment-row {{
            border: 1px solid {c.border};
            border-radius: 12px;
            padding: 10px 12px;
            display: grid;
            grid-template-columns: 44px 1fr 80px;
            gap: 10px;
            align-items: start;
        }}
        .segment-text {{
            color: {c.text_primary};
            font-size: 0.95rem;
            line-height: 1.45;
        }}
        .segment-score {{
            text-align: right;
            color: {c.warning};
            font-variant-numeric: tabular-nums;
        }}
        @media (max-width: 980px) {{
            .report-container {{
                width: calc(100vw - 32px);
            }}
            .report-grid {{
                grid-template-columns: 1fr;
            }}
            .segment-list {{
                max-height: none;
            }}
        }}
    </style>
    """)
    
    # Header
    with ui.row().classes('w-full items-center justify-between p-4').style(
        f'background-color: {c.bg_secondary}; border-bottom: 1px solid {c.border};'
    ):
        ui.button("←", on_click=lambda: ui.navigate.to(f'/{query}')).props('flat').style(f'color: {c.text_primary};')
        ui.label(_t('learning_report')).classes('text-lg font-semibold').style(f'color: {c.text_primary};')
        ui.element('div').classes('w-10')
    
    cover_src = None
    try:
        if getattr(course, "cover_path", None):
            cover_path = Path(course.cover_path)
            if cover_path.exists():
                cover_route = f"/echoflow-report-cover/{course.id}"
                _mount_static(cover_route, str(cover_path.parent))
                cover_src = f"{cover_route}/{cover_path.name}"
    except Exception:
        cover_src = None

    with ui.element("div").classes("report-container"):
        ui.label(f"🎉 {_t('session_complete')}").classes('text-2xl font-bold mb-6').style(f'color: {c.text_primary};')

        with ui.element("div").classes("report-grid"):
            with ui.column().classes("gap-4"):
                with ui.element("div").classes("cover-box"):
                    if cover_src:
                        ui.html(f'<img src="{cover_src}" />', sanitize=False)
                    else:
                        ui.element("div").classes("w-full h-full").style(
                            f"background: linear-gradient(135deg, {c.bg_secondary}, {c.bg_primary});"
                        )

                with ui.element("div").classes("report-card"):
                    with ui.row().classes("w-full gap-4"):
                        with ui.element("div").classes("flex-1 text-center"):
                            ui.label(str(course.total_segments)).classes('stat-number').style(f'color: {c.primary};')
                            ui.label(_t('total_sentences')).style(f'color: {c.text_secondary};')
                        with ui.element("div").classes("flex-1 text-center"):
                            ui.label(str(course.passed_segments)).classes('stat-number').style(f'color: {c.success};')
                            ui.label(_t('passed_sentences')).style(f'color: {c.text_secondary};')
                        with ui.element("div").classes("flex-1 text-center"):
                            ui.label(f"{course.average_score:.0f}").classes('stat-number').style(f'color: {c.warning};')
                            ui.label(_t('average_score')).style(f'color: {c.text_secondary};')

                ui.button(_t('back_to_courses'), on_click=lambda: ui.navigate.to(f'/{query}')).props('color=primary').classes(
                    "w-full"
                )

            with ui.element("div").classes("report-card"):
                ui.label(_t('word_feedback')).classes('text-lg font-semibold mb-3').style(f'color: {c.text_primary};')
                with ui.element("div").classes("segment-list"):
                    for segment in course.segments:
                        status_icon = "✅" if segment.status == "passed" else "⏭" if segment.status == "skipped" else "❌"
                        with ui.element("div").classes("segment-row"):
                            ui.label(status_icon).style(f"color:{c.text_secondary}; font-size: 1.1rem;")
                            ui.label(segment.text).classes("segment-text")
                            score_text = f"{segment.user_best_score:.0f}" if segment.user_best_score > 0 else "--"
                            ui.label(score_text).classes("segment-score")



