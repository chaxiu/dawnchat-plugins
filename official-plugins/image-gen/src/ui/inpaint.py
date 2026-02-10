import tempfile
import os
import inspect
import io
from nicegui import ui, events
from dawnchat_sdk import host
from i18n import i18n
from .components import render_header, normalize_image_result
from PIL import Image, ImageDraw, ImageOps

async def render_inpaint(on_back):
    render_header(i18n.t('dashboard.inpaint'), on_back=on_back)
    
    # 修复 Inpaint 笔刷 Y 轴偏移问题的关键 CSS
    # 问题根源：NiceGUI 的 interactive_image 组件中，img 和 SVG 的尺寸不一致
    # 解决方案：
    # 1. 让外层 div 使用 inline-block，收缩以适应 img 内容
    # 2. img 使用 auto 尺寸保持宽高比，受 max-height 限制
    # 3. SVG 作为 100% x 100% 绝对定位元素，会跟随 div 尺寸，与 img 保持一致
    ui.add_css('''
    .inpaint-interactive-image {
        display: inline-block !important;
        position: relative !important;
    }
    .inpaint-interactive-image > img {
        display: block !important;
        width: auto !important;
        height: auto !important;
        max-width: 100% !important;
        max-height: calc(100vh - 180px) !important;
    }
    ''')
    
    # State
    uploaded_file = {'path': None}
    paths = [] # List of paths, each path is a list of (x, y) tuples
    
    drawing = False
    mouse_pos = (0, 0)
    
    # Model State
    models = []
    selected_model = {'value': None}
    model_map = {}

    async def load_models():
        try:
            # Task type 'inpaint'
            result = await host.image_gen.list_models(task_type='inpaint', installed_only=True)
            models.clear()
            model_map.clear()
            options = {}
            default_model = None
            
            for m in result:
                # Store full model info if needed, but select needs key-value
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

    # UI References
    interactive_image = None

    with ui.dialog() as result_dialog, ui.card().classes('min-w-[500px] min-h-[300px] items-center p-0 dc-card'):
        with ui.row().classes('w-full justify-between items-center p-4 border-b dc-border dc-bg-secondary'):
            ui.label('Generation Result').classes('text-lg font-bold dc-text-primary')
            ui.button(icon='close', on_click=result_dialog.close).props('flat round dense')
        result_container = ui.column().classes('w-full items-center p-4 scroll-y max-h-[80vh]')
    
    async def handle_upload(e):
        try:
            # Try to get name
            name = getattr(e, 'name', None) or "uploaded_image.png"
            
            # Get content
            content = getattr(e, 'content', None)
            file_obj = getattr(e, 'file', None)
            
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
                elif hasattr(file_obj, '_data'):
                    data = file_obj._data
            
            if data is None:
                raise ValueError("Could not extract file content")

            # Process image
            try:
                img = Image.open(io.BytesIO(data))
                img = ImageOps.exif_transpose(img)
                img = img.convert('RGB')
                
                # Resize if too large (limit to 2048x2048 to prevent memory issues)
                max_dim = 2048
                if img.width > max_dim or img.height > max_dim:
                    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

                # Ensure even dimensions
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
                print(f"Image processing error: {img_err}")
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(name)[1]) as f:
                    f.write(data)
                    uploaded_file['path'] = f.name
            
            # Reset state
            paths.clear()
            if interactive_image:
                interactive_image.content = ''
                interactive_image.source = uploaded_file['path']
                interactive_image.visible = True
            
            if result_container:
                result_container.clear()
                
            ui.notify(i18n.t('common.success'))
        except Exception as err:
            ui.notify(f"Upload failed: {err}", type='negative')

    # Layout: Full height row with Sidebar and Main Area
    # h-[calc(100vh-80px)] to account for header and padding
    with ui.row().classes('w-full h-[calc(100vh-80px)] no-wrap items-stretch gap-0'):
        
        # --- Sidebar (Controls) ---
        with ui.scroll_area().classes('w-80 p-4 border-r dc-border dc-bg-secondary flex-shrink-0 flex flex-col gap-4 h-full'):
            
            # Upload
            ui.upload(label=i18n.t('common.upload'), on_upload=handle_upload, auto_upload=True).classes('w-full')
            
            ui.separator().classes('dc-divider')
            
            # Brush Controls
            ui.label('Masking Tools').classes('text-sm font-bold dc-text-primary')
            
            brush_size = ui.slider(min=5, max=100, value=30).props('label-always color=primary').classes('w-full')
            ui.label('Brush Size').classes('text-xs dc-text-secondary mb-2')
            
            with ui.row().classes('w-full gap-2'):
                def undo():
                    if paths:
                        paths.pop()
                        update_svg()
                
                def clear_mask():
                    paths.clear()
                    update_svg()
                
                ui.button('Undo', on_click=undo, icon='undo').props('outline size=sm').classes('flex-1')
                ui.button('Clear', on_click=clear_mask, icon='delete').props('outline color=warning size=sm').classes('flex-1')

            ui.separator().classes('dc-divider')

            # Generation Params
            ui.label('Generation Settings').classes('text-sm font-bold dc-text-primary')
            
            # Model Selection
            model_select = ui.select({}, label=i18n.t('common.model')).classes('w-full').bind_value(selected_model, 'value')
            
            prompt = ui.textarea(label=i18n.t('common.prompt'), placeholder="Describe what to fill in...").classes('w-full').props('autogrow outlined rows=3')
            negative_prompt = ui.textarea(label=i18n.t('common.negative_prompt'), placeholder="What to avoid...").classes('w-full').props('autogrow outlined rows=2')
            
            with ui.grid(columns=2).classes('w-full gap-2'):
                steps = ui.number(label=i18n.t('common.steps'), value=25, min=1, max=50).classes('w-full')
                strength = ui.number(label=i18n.t('common.strength'), value=0.8, min=0.0, max=1.0, step=0.05).classes('w-full')
            
            # Generate Button
            async def generate():
                if not uploaded_file['path']:
                    ui.notify("Please upload an image first", type='warning')
                    return
                # Prompt is optional for some models (e.g. LaMa)
                # if not prompt.value:
                #    ui.notify("Prompt is required", type='warning')
                #    return
                if not paths:
                    ui.notify("Please paint a mask on the image", type='warning')
                    return

                # Open dialog and show loading
                result_dialog.open()
                with result_container:
                    result_container.clear()
                    with ui.column().classes('w-full items-center justify-center p-8'):
                        progress_bar = ui.linear_progress(value=0).classes('w-full mb-2')
                        status_label = ui.label(i18n.t('common.processing')).classes('dc-text-secondary')
                
                try:
                    # 1. Generate Mask Image
                    original_img = Image.open(uploaded_file['path'])
                    # Mask needs to be same size as original
                    # Create L mask first
                    l_mask = Image.new('L', original_img.size, 0) # Black background
                    draw = ImageDraw.Draw(l_mask)
                    
                    for path in paths:
                        if len(path) > 1:
                            draw.line(path, fill=255, width=int(brush_size.value), joint='curve')
                        elif len(path) == 1:
                            x, y = path[0]
                            r = int(brush_size.value) / 2
                            draw.ellipse((x-r, y-r, x+r, y+r), fill=255)
                    
                    # Create RGBA image with mask in alpha channel
                    # Ensure brush is white (255,255,255) and opaque (255)
                    # Ensure background is black (0,0,0) and transparent (0) - though transparency is key
                    mask_img = Image.new('RGBA', original_img.size, (0, 0, 0, 0))
                    
                    # Create a white fill layer
                    white_fill = Image.new('RGBA', original_img.size, (255, 255, 255, 255))
                    
                    # Paste white fill using l_mask as mask
                    mask_img.paste(white_fill, mask=l_mask)
                            
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as f:
                        mask_img.save(f, format='PNG')
                        mask_path = f.name
                        
                    # 2. Call Backend
                    def on_progress(p, msg):
                        progress_bar.value = p / 100.0
                        status_label.text = f"{msg} ({int(p)}%)"

                    # Determine workflow_id
                    workflow_id = "sdxl_inpaint_basic"
                    if selected_model['value'] in model_map:
                        m = model_map[selected_model['value']]
                        if m.get('recommended_workflows'):
                            workflow_id = m['recommended_workflows'][0]

                    result = await host.image_gen.inpaint(
                        image_path=uploaded_file['path'],
                        mask_path=mask_path,
                        prompt=prompt.value,
                        negative_prompt=negative_prompt.value,
                        strength=float(strength.value),
                        steps=int(steps.value),
                        model_name=selected_model['value'],
                        workflow_id=workflow_id,
                        on_progress=on_progress
                    )
                    
                    # 3. Handle Result
                    result_container.clear()
                    
                    is_success, data = normalize_image_result(result)
                        
                    if is_success:
                        images = data.get('images', [])
                        if images:
                             for img in images:
                                if os.path.exists(img):
                                     with result_container:
                                         ui.image(img).classes('max-w-full max-h-[70vh] rounded-lg shadow-lg border')
                                         ui.label(f"Saved to: {img}").classes('text-xs dc-text-secondary mt-1')
                                else:
                                     with result_container:
                                         ui.image(f'data:image/png;base64,{img}').classes('max-w-full max-h-[70vh] rounded-lg shadow-lg border')
                        
                        elif 'image_path' in data:
                             img_path = data['image_path']
                             if os.path.exists(img_path):
                                 with result_container:
                                     ui.image(img_path).classes('max-w-full max-h-[70vh] rounded-lg shadow-lg border')
                                     ui.label(f"Saved to: {img_path}").classes('text-xs dc-text-secondary mt-1')
                    else:
                        msg = data.get('message') or result.get('message') or 'Unknown error'
                        with result_container:
                             ui.label(f"Error: {msg}").classes('text-red-500 font-bold')
                             ui.icon('error', size='lg', color='negative')
                        
                except Exception as e:
                    if result_container: 
                        result_container.clear()
                        with result_container:
                             ui.label(f"Error: {str(e)}").classes('text-red-500')
                    import traceback
                    traceback.print_exc()

            ui.button(i18n.t('common.generate'), on_click=generate).classes('w-full mt-4 dc-btn-primary')


        # --- Main Content (Canvas) ---
        with ui.column().classes('col h-full dc-bg-tertiary relative-position p-4 overflow-hidden'):
            
            # Canvas Container (Center the image)
            with ui.row().classes('w-full h-full items-center justify-center relative-position'):
                
                def update_svg():
                    if not interactive_image: return
                    
                    bs = int(brush_size.value)
                    # Mask paths
                    svg = f'<g stroke="white" stroke-width="{bs}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">'
                    for path in paths:
                        if len(path) > 1:
                            d = f"M {path[0][0]} {path[0][1]}"
                            for p in path[1:]:
                                d += f" L {p[0]} {p[1]}"
                            svg += f'<path d="{d}" />'
                        elif len(path) == 1:
                            x, y = path[0]
                            r = bs / 2
                            svg += f'<circle cx="{x}" cy="{y}" r="{r}" fill="white" stroke="none" />'
                    svg += '</g>'
                    
                    # Brush cursor (only if we have mouse pos)
                    if uploaded_file['path']:
                        mx, my = mouse_pos
                        r = bs / 2
                        # Draw a cursor that is visible on both dark and light backgrounds
                        svg += f'<circle cx="{mx}" cy="{my}" r="{r}" fill="none" stroke="black" stroke-width="1" opacity="0.5" />'
                        svg += f'<circle cx="{mx}" cy="{my}" r="{r}" fill="white" stroke="none" opacity="0.2" />'
                        
                    interactive_image.content = svg

                def on_mouse(e):
                    nonlocal drawing, mouse_pos
                    if not uploaded_file['path']:
                        return
                    
                    mouse_pos = (e.image_x, e.image_y)
                        
                    if e.type == 'mousedown':
                        drawing = True
                        paths.append([(e.image_x, e.image_y)])
                        update_svg()
                    elif e.type == 'mousemove':
                        if drawing:
                            paths[-1].append((e.image_x, e.image_y))
                        # Always update svg to show cursor
                        update_svg()
                    elif e.type == 'mouseup':
                        drawing = False
                        update_svg()

                interactive_image = ui.interactive_image(
                    source='',
                    on_mouse=on_mouse,
                    events=['mousedown', 'mousemove', 'mouseup'],
                    cross=False, # Disable default crosshair to use our custom cursor
                    sanitize=False  # SVG content is generated by us, no need to sanitize
                ).classes('inpaint-interactive-image shadow-2xl rounded-lg')
                
                interactive_image.visible = False
                
                # Placeholder when no image
                with ui.column().bind_visibility_from(interactive_image, 'visible', backward=lambda v: not v).classes('items-center justify-center dc-text-secondary'):
                    ui.icon('image', size='4rem').classes('mb-4 opacity-50')
                    ui.label('Upload an image to start inpainting').classes('text-lg')

    # Load models on start
    await load_models()
