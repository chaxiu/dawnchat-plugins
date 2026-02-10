"""
Dashboard UI - 任务看板

显示历史任务列表，提供任务入口。
"""

from nicegui import ui

from i18n import i18n
from storage.cache import TaskCache, TaskStatus


async def render_dashboard(task_cache: TaskCache, theme, lang: str = 'zh'):
    """
    渲染任务看板页面
    
    Args:
        task_cache: 任务缓存管理器
        theme: UI 主题
        lang: 语言代码
    """
    c = theme.colors
    
    def _t(key):
        return i18n.t(key, lang)
    
    # 主容器
    with ui.column().classes('w-full min-h-screen p-8').style(f'background-color: {c.bg_primary};'):
        # 头部
        with ui.row().classes('w-full items-center justify-between mb-8'):
            with ui.row().classes('items-center gap-4'):
                ui.label('📹').classes('text-4xl')
                with ui.column().classes('gap-0'):
                    ui.label(_t('title')).classes('text-2xl font-bold').style(f'color: {c.text_primary};')
                    ui.label(_t('subtitle')).classes('text-sm').style(f'color: {c.text_secondary};')
        
        # 任务列表容器
        tasks_container = ui.element('div').classes('w-full')
        
        async def refresh_tasks():
            """刷新任务列表"""
            tasks_container.clear()
            
            tasks = task_cache.list_all()
            
            if not tasks:
                # 空状态
                with tasks_container:
                    with ui.column().classes('w-full items-center justify-center py-16'):
                        ui.label('🎬').classes('text-6xl mb-4')
                        ui.label(_t('empty_title')).classes('text-lg').style(f'color: {c.text_secondary};')
                        ui.label(_t('empty_subtitle')).classes('text-sm mt-2').style(f'color: {c.text_disabled};')
            else:
                # 任务卡片网格
                with tasks_container:
                    with ui.row().classes('w-full flex-wrap gap-4'):
                        for task in tasks:
                            await render_task_card(task, theme, refresh_tasks, _t, lang)
        
        await refresh_tasks()
        
        # 悬浮添加按钮 (FAB)
        def show_import_modal():
            """显示导入弹窗"""
            from ui.import_modal import render_import_modal
            render_import_modal(task_cache, theme, on_complete=refresh_tasks, lang=lang)
        
        ui.button('+', on_click=show_import_modal).classes('fab-button')


async def render_task_card(task, theme, on_refresh, _t, lang):
    """
    渲染任务卡片
    """
    c = theme.colors
    
    # 状态映射
    status_config = {
        TaskStatus.PENDING: {"text": _t("status_pending"), "color": c.text_secondary, "icon": "⏳"},
        TaskStatus.DOWNLOADING: {"text": _t("status_downloading"), "color": c.warning, "icon": "⬇️"},
        TaskStatus.PROCESSING: {"text": _t("status_processing"), "color": c.warning, "icon": "⚙️"},
        TaskStatus.TRANSCRIBING: {"text": _t("status_transcribing"), "color": c.warning, "icon": "🎤"},
        TaskStatus.SUMMARIZING: {"text": _t("status_summarizing"), "color": c.warning, "icon": "✨"},
        TaskStatus.COMPLETED: {"text": _t("status_completed"), "color": c.success, "icon": "✅"},
        TaskStatus.ERROR: {"text": _t("status_error"), "color": c.danger, "icon": "❌"},
    }
    
    status = status_config.get(task.status, status_config[TaskStatus.PENDING])
    
    def go_to_detail():
        """跳转到详情页"""
        if task.status == TaskStatus.COMPLETED:
            # Pass lang and theme to detail page
            # Actually NiceGUI's navigate.to just changes URL
            # We should preserve query params if possible or re-append them
            # Since we are using standard routing, we can append them
            is_dark = 'dark' if theme.is_dark else 'light'
            ui.navigate.to(f'/task/{task.id}?theme={is_dark}&lang={lang}')
    
    with ui.card().classes('task-card w-80').on('click', go_to_detail):
        with ui.row().classes('w-full items-start gap-3'):
            # 缩略图或默认图标
            if task.thumbnail:
                ui.image(task.thumbnail).classes('w-20 h-14 rounded object-cover')
            else:
                with ui.element('div').classes('w-20 h-14 rounded flex items-center justify-center').style(
                    f'background-color: {c.bg_primary};'
                ):
                    ui.label('🎬' if task.source_type == 'online' else '📁').classes('text-2xl')
            
            # 内容区
            with ui.column().classes('flex-1 gap-1'):
                # 标题
                title = task.title or _t("untitled")
                if len(title) > 30:
                    title = title[:30] + "..."
                ui.label(title).classes('font-semibold text-sm').style(f'color: {c.text_primary};')
                
                # 时长
                if task.duration:
                    minutes = int(task.duration // 60)
                    seconds = int(task.duration % 60)
                    duration_text = f"{minutes}:{seconds:02d}"
                else:
                    duration_text = "--:--"
                
                with ui.row().classes('items-center gap-2'):
                    ui.label(duration_text).classes('text-xs').style(f'color: {c.text_secondary};')
                    ui.label('•').style(f'color: {c.text_disabled};')
                    ui.label(task.source_type).classes('text-xs').style(f'color: {c.text_secondary};')
        
        # 状态栏
        with ui.row().classes('w-full items-center justify-between mt-3 pt-2').style(
            f'border-top: 1px solid {c.border};'
        ):
            with ui.row().classes('items-center gap-1'):
                ui.label(status["icon"]).classes('text-sm')
                ui.label(status["text"]).classes('text-xs').style(f'color: {status["color"]};')
            
            # 错误提示
            if task.status == TaskStatus.ERROR and task.error:
                error_text = task.error[:20] + "..." if len(task.error) > 20 else task.error
                ui.label(error_text).classes('text-xs').style(f'color: {c.danger};')

