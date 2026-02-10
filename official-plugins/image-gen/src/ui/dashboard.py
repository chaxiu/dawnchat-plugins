from nicegui import ui
from dawnchat_sdk import host
from i18n import i18n
from .components import render_header, task_card

async def render_dashboard(on_navigate):
    # Check status
    try:
        status = await host.image_gen.get_status()
    except Exception as e:
        ui.notify(f"Failed to connect to host: {e}", type='negative')
        status = {'has_models': False} # Fallback

    # Get models to determine enabled tasks
    try:
        models = await host.image_gen.list_models(installed_only=True)
    except Exception:
        models = []
        
    # Check capabilities
    has_t2i = any('text_to_image' in m.get('types', []) for m in models)
    has_i2i = any('image_to_image' in m.get('types', []) for m in models)
    has_inpaint = any('inpaint' in m.get('types', []) for m in models)
    has_upscale = any('upscale' in m.get('types', []) for m in models)

    render_header(i18n.t('title'))
    
    with ui.column().classes('w-full max-w-4xl mx-auto p-4 gap-6'):
        ui.label(i18n.t('dashboard.title')).classes('text-xl font-bold opacity-80 mb-2')
        
        with ui.grid().classes('grid-cols-1 md:grid-cols-2 gap-4 w-full'):
            # Text to Image
            task_card(
                i18n.t('dashboard.text_to_image'),
                i18n.t('dashboard.desc_t2i'),
                'edit',
                lambda: on_navigate('text_to_image'),
                enabled=has_t2i
            )
            
            # Image to Image
            task_card(
                i18n.t('dashboard.image_to_image'),
                i18n.t('dashboard.desc_i2i'),
                'image',
                lambda: on_navigate('image_to_image'),
                enabled=has_i2i
            )
            
            # Inpaint
            task_card(
                i18n.t('dashboard.inpaint'),
                i18n.t('dashboard.desc_inpaint'),
                'brush',
                lambda: on_navigate('inpaint'),
                enabled=has_inpaint
            )
            
            # Upscale
            task_card(
                i18n.t('dashboard.upscale'),
                i18n.t('dashboard.desc_upscale'),
                'zoom_in',
                lambda: on_navigate('upscale'),
                enabled=has_upscale
            )
