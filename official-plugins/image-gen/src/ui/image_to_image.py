import tempfile
import os
import inspect
import io
from nicegui import ui
from dawnchat_sdk import host
from i18n import i18n
from .components import render_header, normalize_image_result
from PIL import Image, ImageOps

async def render_image_to_image(on_back):
    render_header(i18n.t('dashboard.image_to_image'), on_back=on_back)
    
    uploaded_file = {'path': None}
    
    # Model State
    models = []
    selected_model = {'value': None}
    model_map = {}

    async def load_models():
        try:
            # Task type 'image_to_image'
            result = await host.image_gen.list_models(task_type='image_to_image', installed_only=True)
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

    async def handle_upload(e):
        try:
            # Try to get name from various possible locations
            name = getattr(e, 'name', None)
            
            content = getattr(e, 'content', None)
            file_obj = getattr(e, 'file', None)
            
            if not name and content:
                name = getattr(content, 'name', None)
            if not name and file_obj:
                name = getattr(file_obj, 'name', None)
                
            if not name:
                name = "uploaded_image.png"

            # Try to get content from various possible locations
            data = None
            if content and hasattr(content, 'read'):
                data = content.read()
                if inspect.iscoroutine(data):
                    data = await data
            elif file_obj:
                if hasattr(file_obj, 'read'):
                    data = file_obj.read()
                    if inspect.iscoroutine(data):
                        data = await data
                elif hasattr(file_obj, '_data'):  # SmallFileUpload
                    data = file_obj._data
            
            if data is None:
                raise ValueError(f"Could not extract content from event object: {dir(e)}")

            # Re-process image to ensure it is standard and contiguous
            try:
                img = Image.open(io.BytesIO(data))
                img = ImageOps.exif_transpose(img)  # Handle EXIF rotation
                img = img.convert('RGB')  # Ensure 3 channels
                
                # Ensure even dimensions for model compatibility
                w, h = img.size
                new_w = w if w % 2 == 0 else w - 1
                new_h = h if h % 2 == 0 else h - 1
                if new_w != w or new_h != h:
                    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                suffix = ".png"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
                    img.save(f, format="PNG")
                    uploaded_file['path'] = f.name
            except Exception as img_err:
                print(f"PIL processing failed, falling back to raw write: {img_err}")
                suffix = os.path.splitext(name)[1]
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
                    f.write(data)
                    uploaded_file['path'] = f.name

            ui.notify(i18n.t('common.success'))
        except Exception as err:
            ui.notify(f"Upload failed: {err}", type='negative')
        
    ui.upload(label=i18n.t('common.upload'), on_upload=handle_upload, auto_upload=True).classes('w-full max-w-md')
    
    # Model Selection
    model_select = ui.select({}, label=i18n.t('common.model')).classes('w-full').bind_value(selected_model, 'value')
    
    prompt = ui.textarea(label=i18n.t('common.prompt')).classes('w-full').props('autogrow outlined')
    negative_prompt = ui.textarea(label=i18n.t('common.negative_prompt')).classes('w-full').props('autogrow outlined')
    
    with ui.row().classes('w-full gap-4'):
        steps = ui.number(label=i18n.t('common.steps'), value=20, min=1, max=50).classes('w-32')
        strength = ui.number(label=i18n.t('common.strength'), value=0.75, min=0.0, max=1.0, step=0.05).classes('w-32')
    
    async def generate():
        if not uploaded_file['path']:
            ui.notify("Please upload an image", type='warning')
            return
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
            # Determine workflow_id - must find an i2i workflow, not just take the first one
            workflow_id = "sdxl_i2i_basic"
            if selected_model['value'] in model_map:
                m = model_map[selected_model['value']]
                if m.get('recommended_workflows'):
                    # Find a workflow that contains 'i2i' in its name
                    for wf in m['recommended_workflows']:
                        if 'i2i' in wf:
                            workflow_id = wf
                            break
                    # If no i2i workflow found, keep default (don't use t2i workflow!)

            result = await host.image_gen.image_to_image(
                image_path=uploaded_file['path'],
                prompt=prompt.value,
                negative_prompt=negative_prompt.value,
                strength=float(strength.value),
                steps=int(steps.value),
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
                                # Fallback for base64
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
