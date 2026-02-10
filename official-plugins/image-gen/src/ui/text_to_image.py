import base64
import os
from nicegui import ui
from dawnchat_sdk import host
from i18n import i18n
from .components import render_header, normalize_image_result

async def render_text_to_image(on_back):
    render_header(i18n.t('dashboard.text_to_image'), on_back=on_back)
    
    # Model State
    models = []
    selected_model = {'value': None}
    model_map = {}

    async def load_models():
        try:
            # Task type 'text_to_image'
            result = await host.image_gen.list_models(task_type='text_to_image', installed_only=True)
            models.clear()
            model_map.clear()
            options = {}
            default_model = None
            
            for m in result:
                options[m['filename']] = m['name']
                model_map[m['filename']] = m
                if not default_model:
                    default_model = m['filename']
            
            model_select.options = options
            model_select.value = default_model
            selected_model['value'] = default_model
            model_select.update()
            
        except Exception as e:
            ui.notify(f"Failed to load models: {e}", type='negative')

    # UI Elements
    model_select = ui.select({}, label=i18n.t('common.model')).classes('w-full').bind_value(selected_model, 'value')
    prompt = ui.textarea(label=i18n.t('common.prompt')).classes('w-full').props('autogrow outlined')
    negative_prompt = ui.textarea(label=i18n.t('common.negative_prompt')).classes('w-full').props('autogrow outlined')
    
    with ui.row().classes('w-full gap-4'):
        width = ui.number(label=i18n.t('common.width'), value=1024, min=256, max=2048, step=64).classes('w-32')
        height = ui.number(label=i18n.t('common.height'), value=1024, min=256, max=2048, step=64).classes('w-32')
        steps = ui.number(label=i18n.t('common.steps'), value=20, min=1, max=50).classes('w-32')
        cfg = ui.number(label=i18n.t('common.cfg'), value=7.0, min=1.0, max=20.0, step=0.5).classes('w-32')
        
    async def generate():
        if not prompt.value:
            ui.notify(i18n.t('common.error') + ": Prompt required", type='warning')
            return
            
        with result_container:
            result_container.clear()
            progress_bar = ui.linear_progress(value=0).classes('w-full')
            status_label = ui.label(i18n.t('common.processing')).classes('dc-text-secondary text-sm')
            
        def on_progress(p, msg):
            progress_bar.value = p
            status_label.text = f"{msg} ({int(p*100)}%)"

        try:
            # Determine workflow_id
            workflow_id = "sdxl_t2i_basic"
            if selected_model['value'] in model_map:
                m = model_map[selected_model['value']]
                if m.get('recommended_workflows'):
                    workflow_id = m['recommended_workflows'][0]

            result = await host.image_gen.text_to_image(
                prompt=prompt.value,
                negative_prompt=negative_prompt.value,
                width=int(width.value),
                height=int(height.value),
                steps=int(steps.value),
                cfg_scale=float(cfg.value),
                model_name=selected_model['value'],
                workflow_id=workflow_id,
                on_progress=on_progress
            )
            
            result_container.clear()
            
            is_success, data = normalize_image_result(result)
            
            with result_container:
                if is_success:
                    images = data.get('images', [])
                    if images:
                        for img in images:
                            if os.path.exists(img):
                                ui.image(img).classes('w-full max-w-2xl rounded-lg shadow-lg')
                                ui.label(f"Saved to: {img}").classes('text-sm dc-text-secondary')
                            else:
                                ui.image(f'data:image/png;base64,{img}').classes('w-full max-w-2xl rounded-lg shadow-lg')
                    
                    elif 'image_path' in data:
                        img_path = data['image_path']
                        if os.path.exists(img_path):
                            ui.image(img_path).classes('w-full max-w-2xl rounded-lg shadow-lg')
                            ui.label(f"Saved to: {img_path}").classes('text-sm dc-text-secondary')
                else:
                    msg = data.get('message') or result.get('message') or 'Unknown error'
                    ui.notify(f"{i18n.t('common.error')}: {msg}", type='negative')
                    ui.label(f"Error: {msg}").classes('text-red-500')
                
        except Exception as e:
            result_container.clear()
            ui.notify(f"{i18n.t('common.error')}: {str(e)}", type='negative')
            with result_container:
                ui.label(f"Error: {str(e)}").classes('text-red-500')

    ui.button(i18n.t('common.generate'), on_click=generate).classes('w-full mt-4 dc-btn-primary')
    
    # Place result container
    result_container = ui.column().classes('w-full items-center mt-4')

    # Load models
    await load_models()
