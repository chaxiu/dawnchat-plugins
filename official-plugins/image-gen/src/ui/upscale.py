import tempfile
import os
import inspect
import io
from nicegui import ui
from dawnchat_sdk import host
from i18n import i18n
from .components import render_header, normalize_image_result
from PIL import Image, ImageOps

async def render_upscale(on_back):
    render_header(i18n.t('dashboard.upscale'), on_back=on_back)
    
    uploaded_file = {'path': None}

    # Model State
    models = []
    selected_model = {'value': None}
    model_map = {}

    async def load_models():
        try:
            # Task type 'upscale'
            result = await host.image_gen.list_models(task_type='upscale', installed_only=True)
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
                # Last resort: try to dump the object structure for debugging (optional)
                raise ValueError(f"Could not extract content from event object: {dir(e)}")

            # Re-process image to ensure it is standard and contiguous
            # This fixes "view size is not compatible with input tensor's size and stride" errors
            # caused by EXIF rotation or non-standard image formats in ComfyUI
            try:
                img = Image.open(io.BytesIO(data))
                img = ImageOps.exif_transpose(img)  # Handle EXIF rotation
                img = img.convert('RGB')  # Ensure 3 channels (fix for RealESRGAN on MPS)
                
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
                # Fallback to raw write if PIL fails
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
    model_select = ui.select({}, label=i18n.t('common.model')).classes('w-32').bind_value(selected_model, 'value')
    scale = ui.select({2: '2x', 4: '4x'}, value=4, label=i18n.t('common.scale')).classes('w-32')
    
    async def generate():
        if not uploaded_file['path']:
            ui.notify("Please upload an image", type='warning')
            return
            
        with result_container:
            result_container.clear()
            ui.spinner('dots', size='lg')
            ui.label(i18n.t('common.processing')).classes('dc-text-secondary')
            
        try:
            # Determine workflow_id
            workflow_id = "upscale_4x"
            if selected_model['value'] in model_map:
                m = model_map[selected_model['value']]
                if m.get('recommended_workflows'):
                    workflow_id = m['recommended_workflows'][0]

            result = await host.image_gen.upscale(
                image_path=uploaded_file['path'],
                scale=scale.value,
                workflow_id=workflow_id
            )
            
            result_container.clear()
            
            is_success, data = normalize_image_result(result)
            
            with result_container:
                if is_success:
                    ui.label(i18n.t('common.success')).classes('text-lg text-green-500')
                    
                    images = data.get('images', [])
                    if images:
                        for img in images:
                            if os.path.exists(img):
                                ui.image(img).classes('w-full max-w-2xl rounded-lg shadow-lg')
                                ui.label(f"Saved to: {img}").classes('text-sm dc-text-secondary')
                            else:
                                # Fallback for base64 or other formats
                                ui.image(f"data:image/png;base64,{img}").classes('w-full max-w-2xl rounded-lg shadow-lg')
                                
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
