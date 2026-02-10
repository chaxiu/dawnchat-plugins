"""
Detail View UI - 详情分屏页

左侧媒体播放器 + 右侧智能笔记区。
支持时间戳点击跳转。
"""

from pathlib import Path
from nicegui import ui, app

from i18n import i18n
from storage.cache import CacheEntry

# 全局音频播放器引用，用于时间戳跳转
_audio_player = None


async def render_detail_view(task: CacheEntry, theme, lang: str = 'zh'):
    """
    渲染详情分屏页面
    
    Args:
        task: 任务缓存条目
        theme: UI 主题
        lang: 语言代码
    """
    c = theme.colors
    
    def _t(key):
        return i18n.t(key, lang)
    
    # 添加自定义样式
    ui.add_head_html(f"""
    <style>
        body {{
            background-color: {c.bg_primary} !important;
        }}
        .split-container {{
            display: flex;
            height: calc(100vh - 60px);
        }}
        .media-panel {{
            width: 50%;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            background-color: {c.bg_secondary};
        }}
        .notes-panel {{
            width: 50%;
            padding: 1.5rem;
            overflow-y: auto;
            background-color: {c.bg_primary};
        }}
        .timestamp-chip {{
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.5rem;
            background-color: {c.primary};
            color: white;
            border-radius: 4px;
            font-size: 0.75rem;
            font-family: monospace;
            cursor: pointer;
            margin-right: 0.5rem;
            transition: all 0.2s;
        }}
        .timestamp-chip:hover {{
            opacity: 0.8;
            transform: scale(1.05);
        }}
        .key-point {{
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            background-color: {c.bg_secondary};
            border-left: 3px solid {c.primary};
        }}
        .transcript-segment {{
            padding: 0.5rem;
            border-radius: 4px;
            margin-bottom: 0.25rem;
            transition: background-color 0.2s;
        }}
        .transcript-segment:hover {{
            background-color: {c.bg_secondary};
        }}
        .transcript-segment.active {{
            background-color: rgba(99, 102, 241, 0.1);
            border-left: 2px solid {c.primary};
        }}
        audio, video {{
            width: 100%;
            max-height: 300px;
            border-radius: 8px;
        }}
    </style>
    """)
    
    # 顶部导航栏
    with ui.row().classes('w-full items-center justify-between p-4').style(
        f'background-color: {c.bg_secondary}; border-bottom: 1px solid {c.border};'
    ):
        ui.button(_t('back'), on_click=lambda: ui.navigate.to('/')).props('flat').style(f'color: {c.text_primary};')
        
        ui.label(task.title or _t('untitled')).classes('text-lg font-semibold').style(f'color: {c.text_primary};')
        
        # 占位
        ui.element('div').classes('w-20')
    
    # 主体分屏区域
    with ui.element('div').classes('split-container'):
        
        # ===== 左侧：媒体面板 =====
        with ui.element('div').classes('media-panel'):
            global _audio_player
            
            # 媒体播放器
            if task.audio_path:
                audio_path = Path(task.audio_path)
                
                if audio_path.exists():
                    # 使用静态文件服务暴露音频文件
                    # 为每个任务创建唯一的静态路由
                    static_route = f'/audio/{task.id}'
                    audio_dir = str(audio_path.parent)
                    
                    # 注册静态文件路由（NiceGUI会自动处理重复注册）
                    app.add_static_files(static_route, audio_dir)
                    
                    # 构建可访问的URL
                    audio_url = f'{static_route}/{audio_path.name}'
                    
                    # 使用NiceGUI的audio组件，设置id用于JavaScript控制
                    _audio_player = ui.audio(audio_url)
                    _audio_player.props('controls id="main-audio-player"').classes('w-full')
                    _audio_player.style('border-radius: 8px;')
                else:
                    ui.label(f"{_t('no_media')}: {audio_path}").style(f'color: {c.danger};')
            else:
                ui.label(_t('no_media_file')).style(f'color: {c.text_secondary};')
            
            # 元信息
            with ui.column().classes('mt-4 gap-2'):
                if task.duration:
                    minutes = int(task.duration // 60)
                    seconds = int(task.duration % 60)
                    ui.label(f"⏱️ {_t('duration')}: {minutes}{_t('minutes')}{seconds}{_t('seconds')}").classes('text-sm').style(f'color: {c.text_secondary};')
                
                if task.language:
                    ui.label(f"🌐 {_t('language')}: {task.language}").classes('text-sm').style(f'color: {c.text_secondary};')
                
                if task.speakers:
                    ui.label(f"👥 {_t('speakers')}: {len(task.speakers)}").classes('text-sm').style(f'color: {c.text_secondary};')
                
                if task.model:
                    ui.label(f"🤖 {_t('model')}: {task.model}").classes('text-sm').style(f'color: {c.text_secondary};')
        
        # ===== 右侧：笔记面板 =====
        with ui.element('div').classes('notes-panel'):
            # Tab 选择
            selected_tab = {'value': 'summary'}
            
            with ui.row().classes('w-full mb-4 gap-2'):
                def switch_tab(tab):
                    selected_tab['value'] = tab
                    summary_content.set_visibility(tab == 'summary')
                    transcript_content.set_visibility(tab == 'transcript')
                
                ui.button(_t('smart_summary'), on_click=lambda: switch_tab('summary')).props('flat')
                ui.button(_t('transcript'), on_click=lambda: switch_tab('transcript')).props('flat')
            
            # ===== 智能摘要 Tab =====
            with ui.column().classes('w-full gap-4') as summary_content:
                
                # 一句话总结
                if task.summary:
                    with ui.element('div').style(
                        f'padding: 1rem; '
                        f'background: linear-gradient(135deg, {c.primary}22, {c.primary}11); '
                        f'border-radius: 8px; '
                        f'border-left: 4px solid {c.primary};'
                    ):
                        ui.label(_t('core_points')).classes('text-sm font-semibold mb-2').style(f'color: {c.primary};')
                        ui.label(task.summary).style(f'color: {c.text_primary}; line-height: 1.6;')
                
                # 关键点列表
                if task.key_points:
                    ui.label(_t('key_moments')).classes('text-lg font-semibold mt-4').style(f'color: {c.text_primary};')
                    
                    for kp in task.key_points:
                        with ui.element('div').classes('key-point'):
                            with ui.row().classes('items-start gap-2'):
                                # 时间戳按钮
                                timestamp = kp.timestamp
                                minutes = int(timestamp // 60)
                                seconds = int(timestamp % 60)
                                time_str = f'{minutes}:{seconds:02d}'
                                
                                # 点击跳转播放器
                                def seek_to(t=timestamp):
                                    ui.run_javascript(f'''
                                        const player = document.getElementById('main-audio-player');
                                        if (player) {{
                                            player.currentTime = {t};
                                            player.play().catch(e => console.log('Play prevented:', e));
                                        }}
                                    ''')
                                
                                ui.button(time_str, on_click=seek_to).classes('timestamp-chip').props('flat dense')
                                
                                # 内容
                                with ui.column().classes('gap-1'):
                                    if kp.speaker:
                                        ui.label(f'[{kp.speaker}]').classes('text-xs').style(f'color: {c.primary};')
                                    ui.label(kp.content).style(f'color: {c.text_primary};')
                
                # 完整摘要
                if task.full_summary:
                    with ui.expansion(_t('full_summary'), icon='expand_more').classes('w-full mt-4'):
                        ui.markdown(task.full_summary).style(f'color: {c.text_primary};')
            
            # ===== 原始逐字稿 Tab =====
            # 注意：set_visibility() 返回 None，不能链式调用
            transcript_content = ui.column().classes('w-full gap-2')
            transcript_content.set_visibility(False)
            with transcript_content:
                if task.segments:
                    for seg in task.segments:
                        with ui.element('div').classes('transcript-segment'):
                            with ui.row().classes('items-start gap-2'):
                                # 时间戳
                                timestamp = seg.start
                                minutes = int(timestamp // 60)
                                seconds = int(timestamp % 60)
                                time_str = f'{minutes}:{seconds:02d}'
                                
                                def seek_to_seg(t=timestamp):
                                    ui.run_javascript(f'''
                                        const player = document.getElementById('main-audio-player');
                                        if (player) {{
                                            player.currentTime = {t};
                                            player.play().catch(e => console.log('Play prevented:', e));
                                        }}
                                    ''')
                                
                                ui.button(time_str, on_click=seek_to_seg).classes('timestamp-chip').props('flat dense')
                                
                                with ui.column().classes('gap-0'):
                                    if seg.speaker:
                                        ui.label(f'[{seg.speaker}]').classes('text-xs').style(f'color: {c.primary};')
                                    ui.label(seg.text).style(f'color: {c.text_primary};')
                else:
                    ui.label(_t('no_transcript')).style(f'color: {c.text_secondary};')
            
            # 底部工具栏
            with ui.row().classes('w-full justify-end gap-2 mt-8 pt-4').style(f'border-top: 1px solid {c.border};'):
                async def copy_all():
                    """复制全部内容"""
                    content = []
                    if task.summary:
                        content.append(f"# {task.title}\n\n## {_t('core_points')}\n{task.summary}")
                    if task.full_summary:
                        content.append(f"\n## {_t('full_summary')}\n{task.full_summary}")
                    if task.text:
                        content.append(f"\n## {_t('transcript')}\n{task.text}")
                    
                    text = "\n".join(content)
                    ui.run_javascript(f'navigator.clipboard.writeText({repr(text)})')
                    ui.notify(_t('copied'), type='positive')
                
                ui.button(_t('copy_all'), on_click=copy_all).props('flat')
                
                async def export_markdown():
                    """导出 Markdown"""
                    content = []
                    content.append(f"# {task.title}")
                    
                    if task.summary:
                        content.append(f"\n## {_t('core_points')}\n\n{task.summary}")
                    
                    if task.key_points:
                        content.append(f"\n## {_t('key_moments')}\n")
                        for kp in task.key_points:
                            minutes = int(kp.timestamp // 60)
                            seconds = int(kp.timestamp % 60)
                            time_str = f'{minutes}:{seconds:02d}'
                            speaker = f"[{kp.speaker}] " if kp.speaker else ""
                            content.append(f"- **{time_str}** {speaker}{kp.content}")
                    
                    if task.full_summary:
                        content.append(f"\n## {_t('full_summary')}\n\n{task.full_summary}")
                    
                    text = "\n".join(content)
                    ui.run_javascript(f'navigator.clipboard.writeText({repr(text)})')
                    ui.notify(_t('md_copied'), type='positive')
                
                ui.button(_t('export_md'), on_click=export_markdown).props('flat')

