from nicegui import ui
from i18n import i18n

def render_header(title: str, on_back=None):
    with ui.row().classes('w-full bg-transparent text-white p-4 items-center no-wrap gap-4') \
            .style('height: 64px; border-bottom: 1px solid rgba(255,255,255,0.1)'):
        if on_back:
            ui.button(icon='arrow_back', on_click=on_back).props('flat round color=white')
        ui.label(title).classes('text-h6 font-bold')

def normalize_image_result(result):
    if not isinstance(result, dict):
        return False, {}
    data = result.get('data', result)
    while isinstance(data, dict) and 'data' in data and 'code' in data and not data.get('images') and 'image_path' not in data and data.get('status') != 'success':
        data = data.get('data')
    payload = data if isinstance(data, dict) else {}
    is_success = False
    if result.get('code') == 200:
        is_success = True
    if payload.get('status') == 'success':
        is_success = True
    if payload.get('code') == 200:
        is_success = True
    return is_success, payload

def task_card(title: str, description: str, icon: str, on_click, enabled: bool = True):
    """Render a task card."""
    # Using DawnChat theme colors implicitly via NiceGUI theme setup in main.py
    
    card_style = """
        border-radius: 16px; 
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
    """
    
    with ui.card().classes('w-full p-4 transition-all duration-200 relative-position') \
            .style(card_style) as card:
        
        if not enabled:
            card.classes('opacity-50 cursor-not-allowed')
            ui.label('Unavailable').classes('absolute-top-right text-xs bg-grey-8 px-2 py-1 rounded-bl-lg opacity-80')
        else:
            card.classes('cursor-pointer hover:bg-white/10 hover:border-primary')
            card.on('click', on_click)
            
        with ui.row().classes('items-center no-wrap w-full gap-4'):
            # Icon container
            with ui.column().classes('items-center justify-center rounded-xl bg-primary/20 p-3') \
                    .style('width: 56px; height: 56px'):
                ui.icon(icon, size='24px').classes('text-primary')
                
            # Content
            with ui.column().classes('col'):
                ui.label(title).classes('text-lg font-bold leading-tight')
                ui.label(description).classes('text-sm opacity-70 leading-tight')
