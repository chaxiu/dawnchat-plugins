"""
Import Modal UI - 导入弹窗

支持本地文件和在线链接导入，以及模型选择。
支持实时进度显示（转录进度等）。
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional, Callable

from nicegui import ui
from i18n import i18n

from dawnchat_sdk import host

from storage.cache import TaskCache, TaskStatus

logger = logging.getLogger("video-summarizer.import_modal")


# 流水线阶段权重（用于计算总体进度）
STAGE_WEIGHTS = {
    "ingest": 0.15,      # 采集 0-15%
    "process": 0.05,     # 处理 15-20%
    "transcribe": 0.40,  # 转录 20-60%（最耗时）
    "refine": 0.10,      # 优化 60-70%
    "summarize": 0.30,   # 摘要 70-100%
}


def render_import_modal(task_cache: TaskCache, theme, on_complete=None, lang: str = 'zh'):
    """
    渲染导入弹窗
    
    Args:
        task_cache: 任务缓存管理器
        theme: UI 主题
        on_complete: 完成后的回调函数
        lang: 语言代码
    """
    c = theme.colors
    
    def _t(key):
        return i18n.t(key, lang)
    
    # 状态
    state = {
        'tab': 'online',
        'model': None,
        'processing': False,
    }
    
    # 创建对话框 - 使用固定高度确保按钮可见
    with ui.dialog() as dialog, ui.card().classes('w-[420px] p-6').style(
        f'background-color: {c.bg_secondary};'
    ):
        dialog.open()
        
        # ===== 头部 =====
        with ui.row().classes('w-full items-center justify-between mb-4'):
            with ui.row().classes('items-center gap-2'):
                ui.label('📹').classes('text-xl')
                ui.label(_t('import_title')).classes('text-lg font-semibold').style(f'color: {c.text_primary};')
            ui.button(icon='close', on_click=dialog.close).props('flat dense round').style(f'color: {c.text_secondary};')
        
        # ===== Tab 切换 =====
        with ui.row().classes('w-full mb-4 gap-2'):
            online_btn = ui.button(_t('online_link'), on_click=lambda: switch_tab('online')).props('flat dense').style(
                f'background-color: {c.primary}22; color: {c.primary};'
            )
            local_btn = ui.button(_t('local_file'), on_click=lambda: switch_tab('local')).props('flat dense').style(
                f'color: {c.text_secondary};'
            )
        
        # ===== 在线链接输入 =====
        with ui.column().classes('w-full gap-2') as online_content:
            url_input = ui.input(
                label=_t('link_label'),
                placeholder=_t('link_placeholder')
            ).classes('w-full').props('outlined dense')
            
            ui.label(_t('link_hint')).classes('text-xs').style(f'color: {c.text_disabled};')
        
        # ===== 本地文件选择 =====
        with ui.column().classes('w-full gap-2') as local_content:
            file_path_input = ui.input(
                label=_t('file_label'),
                placeholder=_t('file_placeholder')
            ).classes('w-full').props('outlined dense')
            
            ui.label(_t('file_hint')).classes('text-xs').style(f'color: {c.text_disabled};')
        
        local_content.set_visibility(False)
        
        # ===== 分隔线 =====
        ui.separator().classes('my-3')
        
        # ===== 模型选择 =====
        ui.label(_t('select_model')).classes('text-sm font-medium mb-1').style(f'color: {c.text_primary};')
        
        model_select = ui.select(
            options={None: _t('loading')},  # NiceGUI 格式: {value: label}
            label=_t('summary_model'),
            value=None
        ).classes('w-full').props('outlined dense')
        
        model_status = ui.label('').classes('text-xs mt-1').style(f'color: {c.text_disabled};')
        
        # ===== 进度显示区域 =====
        progress_container = ui.column().classes('w-full mt-3')
        progress_container.set_visibility(False)
        
        # ===== 分隔线 =====
        ui.separator().classes('my-3')
        
        # ===== 操作按钮 - 确保在底部明显显示 =====
        with ui.row().classes('w-full justify-end items-center gap-3'):
            cancel_btn = ui.button(_t('cancel'), on_click=dialog.close).props('flat').style(f'color: {c.text_secondary};')
            start_btn = ui.button(_t('start')).props('color=primary unelevated').classes('px-6')
        
        # ===== 事件处理函数 =====
        
        def switch_tab(tab: str):
            """切换 Tab"""
            state['tab'] = tab
            
            if tab == 'online':
                online_btn.style(f'background-color: {c.primary}22; color: {c.primary};')
                local_btn.style(f'color: {c.text_secondary}; background-color: transparent;')
            else:
                local_btn.style(f'background-color: {c.primary}22; color: {c.primary};')
                online_btn.style(f'color: {c.text_secondary}; background-color: transparent;')
            
            online_content.set_visibility(tab == 'online')
            local_content.set_visibility(tab == 'local')
        
        async def load_models():
            """加载可用模型列表"""
            try:
                model_status.text = _t('loading')
                
                result = await host.models.list_all()
                
                if result.get("status") != "success":
                    model_status.text = f'⚠️ {result.get("message", _t("model_error"))}'
                    model_status.style(f'color: {c.warning};')
                    return
                
                models_data = result.get("models", {})
                # NiceGUI ui.select 使用 {value: label} 字典格式
                options = {}
                first_value = None
                
                # 本地模型
                for model in models_data.get("local", []):
                    # 使用 model_key（包含 provider 前缀）作为实际值
                    model_key = model.get("model_key") or f"local:{model.get('id')}"
                    name = model.get("name", model.get("id"))
                    label = f"🖥️ {name}"
                    options[model_key] = label  # {value: label}
                    if first_value is None:
                        first_value = model_key
                
                # 云端模型 - 返回格式是 {provider_id: [model_dict, ...]}
                cloud_data = models_data.get("cloud", {})
                for provider_id, models_list in cloud_data.items():
                    # models_list 应该是 [{id, model_key, name, provider, provider_name}, ...]
                    if not isinstance(models_list, list):
                        continue
                    
                    for model in models_list:
                        if isinstance(model, dict):
                            # 使用 model_key（包含 provider 前缀）作为实际值
                            model_key = model.get("model_key") or model.get("id")
                            name = model.get("name", model_key)
                            provider_name = model.get("provider_name", provider_id)
                        else:
                            model_key = str(model)
                            name = model_key
                            provider_name = provider_id
                        label = f"☁️ {provider_name}: {name}"
                        options[model_key] = label  # {value: label}
                        if first_value is None:
                            first_value = model_key
                
                if options:
                    model_select.options = options
                    model_select.value = first_value
                    state['model'] = first_value
                    model_status.text = _t('found_models').format(len(options))
                    model_status.style(f'color: {c.success};')
                else:
                    model_select.options = {None: _t('no_models')}  # {value: label}
                    model_status.text = _t('config_ai')
                    model_status.style(f'color: {c.warning};')
                    
            except Exception as e:
                model_select.options = {None: _t('model_error')}  # {value: label}
                model_status.text = f'❌ {e}'
                model_status.style(f'color: {c.danger};')
        
        async def on_start_click():
            """开始处理"""
            if state['processing']:
                ui.notify(_t('processing'), type='warning')
                return
            
            # 获取输入
            if state['tab'] == 'online':
                source = url_input.value.strip() if url_input.value else ''
                if not source:
                    ui.notify(_t('enter_link'), type='warning')
                    return
            else:
                source = file_path_input.value.strip() if file_path_input.value else ''
                if not source:
                    ui.notify(_t('enter_path'), type='warning')
                    return
                if not Path(source).exists():
                    ui.notify(f"{_t('file_not_found')}: {source}", type='negative')
                    return
            
            # 直接从 select 组件读取值，不依赖事件
            model = model_select.value
            logger.debug(f"[ImportModal] Selected model: {model}")
            
            if not model:
                ui.notify(_t('select_ai_model'), type='warning')
                return
            
            # 开始处理
            state['processing'] = True
            start_btn.props('loading disabled')
            cancel_btn.props('disabled')
            progress_container.set_visibility(True)
            
            # 延迟导入
            from pipeline.ingest import ingest_source
            from pipeline.process import process_audio
            from pipeline.transcribe import transcribe_audio
            from pipeline.summarize import generate_summary
            from pipeline.refine import refine_segments
            
            with progress_container:
                progress_container.clear()
                # 阶段标签
                stage_label = ui.label(_t('preparing')).classes('text-sm font-medium').style(f'color: {c.text_primary};')
                # 详细进度标签（显示子任务进度）
                detail_label = ui.label('').classes('text-xs mt-1').style(f'color: {c.text_secondary};')
                # 总体进度条
                progress = ui.linear_progress(value=0, show_value=False).classes('w-full mt-2')
            
            # 进度更新辅助函数
            def update_progress(stage: str, stage_progress: float, message: str = ""):
                """
                更新进度显示
                """
                # 计算总体进度
                base = 0.0
                for s, w in STAGE_WEIGHTS.items():
                    if s == stage:
                        break
                    base += w
                
                weight = STAGE_WEIGHTS.get(stage, 0.1)
                total_progress = base + weight * stage_progress
                
                progress.value = min(total_progress, 0.99)
                if message:
                    detail_label.text = message
            
            task = None  # 初始化，防止 except 中访问未定义变量
            try:
                # 创建任务
                task = task_cache.create(
                    source=source,
                    source_type=state['tab'],
                    title=_t('processing')
                )
                
                # 1. 采集
                stage_label.text = _t('ingesting')
                detail_label.text = _t('ingest_detail')
                update_progress("ingest", 0.0)
                
                audio_dir = task_cache.get_audio_dir(task.id)
                ingest_result = await ingest_source(source, audio_dir)
                
                if not ingest_result.success:
                    raise Exception(ingest_result.error or _t('failed'))
                
                task_cache.update(
                    task.id,
                    status=TaskStatus.PROCESSING,
                    title=ingest_result.title or _t('untitled'),
                    duration=ingest_result.duration,
                    thumbnail=ingest_result.thumbnail,
                    audio_path=ingest_result.audio_path
                )
                update_progress("ingest", 1.0, _t('ingest_done'))
                
                # 2. 处理
                stage_label.text = _t('processing_audio')
                detail_label.text = _t('process_detail')
                update_progress("process", 0.0)
                
                process_result = await process_audio(
                    ingest_result.audio_path,
                    audio_dir,
                    normalize=True
                )
                
                if not process_result.success:
                    raise Exception(process_result.error or _t('failed'))
                
                task_cache.update(task.id, audio_path=process_result.audio_path)
                update_progress("process", 1.0, _t('process_done'))
                
                # 3. 转录
                stage_label.text = _t('transcribing')
                task_cache.update(task.id, status=TaskStatus.TRANSCRIBING)
                
                # 构建 initial_prompt
                initial_prompt = None
                if ingest_result.title:
                    initial_prompt = f"视频标题：{ingest_result.title}"
                
                # 创建进度回调（更新 UI）
                def on_transcribe_progress(prog: float, msg: str):
                    """转录进度回调"""
                    update_progress("transcribe", prog, msg)
                
                transcribe_result = await transcribe_audio(
                    process_result.audio_path,
                    enable_diarization=True,
                    initial_prompt=initial_prompt,
                    on_progress=on_transcribe_progress  # 传递进度回调
                )
                
                if not transcribe_result.success:
                    raise Exception(transcribe_result.error or _t('failed'))
                
                # 保存原始转录结果
                raw_segments = transcribe_result.segments
                update_progress("transcribe", 1.0, _t('transcribe_done').format(len(raw_segments)))
                
                # 4. ASR后处理（修正识别错误）
                stage_label.text = _t('refining')
                detail_label.text = _t('refine_detail')
                update_progress("refine", 0.0)
                
                refined_segments = await refine_segments(
                    raw_segments,
                    model=model
                )
                update_progress("refine", 1.0, _t('refine_done'))
                
                # 更新缓存中的segments
                from storage.cache import Segment as CacheSegment
                cache_segments = [
                    CacheSegment(start=s.start, end=s.end, text=s.text, speaker=s.speaker)
                    for s in refined_segments
                ]
                
                # 重新拼接完整文本
                refined_text = " ".join(s.text for s in refined_segments)
                
                task_cache.update(
                    task.id,
                    text=refined_text,
                    language=transcribe_result.language,
                    segments=cache_segments,
                    speakers=transcribe_result.speakers
                )
                
                # 5. 摘要
                stage_label.text = _t('summarizing')
                task_cache.update(task.id, status=TaskStatus.SUMMARIZING)
                detail_label.text = _t('summarize_detail')
                update_progress("summarize", 0.0)
                
                summary_result = await generate_summary(
                    refined_segments,
                    model=model
                )
                
                if not summary_result.success:
                    raise Exception(summary_result.error or _t('failed'))
                
                update_progress("summarize", 1.0, _t('summarize_done'))
                
                from storage.cache import KeyPoint as CacheKeyPoint
                cache_key_points = [
                    CacheKeyPoint(timestamp=kp.timestamp, content=kp.content, speaker=kp.speaker)
                    for kp in summary_result.key_points
                ]
                
                task_cache.update(
                    task.id,
                    status=TaskStatus.COMPLETED,
                    summary=summary_result.summary,
                    key_points=cache_key_points,
                    full_summary=summary_result.full_summary,
                    model=model
                )
                
                progress.value = 1.0
                stage_label.text = _t('completed')
                stage_label.style(f'color: {c.success};')
                detail_label.text = ''
                
                ui.notify(_t('success'), type='positive')
                
                await asyncio.sleep(1)
                dialog.close()
                
                if on_complete:
                    await on_complete()
                    
            except Exception as e:
                if task is not None:
                    try:
                        task_cache.update(task.id, status=TaskStatus.ERROR, error=str(e))
                    except Exception:
                        pass
                
                stage_label.text = _t('failed')
                stage_label.style(f'color: {c.danger};')
                detail_label.text = str(e)
                detail_label.style(f'color: {c.danger};')
                ui.notify(f"{_t('failed')}: {e}", type='negative')
            
            finally:
                state['processing'] = False
                start_btn.props(remove='loading disabled')
                cancel_btn.props(remove='disabled')
        
        start_btn.on('click', on_start_click)
        
        # 启动时加载模型
        ui.timer(0.1, load_models, once=True)
