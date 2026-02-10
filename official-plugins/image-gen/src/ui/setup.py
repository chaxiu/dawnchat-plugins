from nicegui import ui
from dawnchat_sdk import host
from i18n import i18n

async def render_setup(on_check_again):
    with ui.column().classes('w-full h-screen items-center justify-center p-8 gap-6'):
        ui.icon('sentiment_dissatisfied', size='4rem').classes('text-grey-5')
        
        ui.label(i18n.t('setup.title')).classes('text-2xl font-bold')
        
        ui.label(i18n.t('setup.message')).classes('text-lg text-center opacity-80')
        
        with ui.card().classes('bg-grey-9 p-4 rounded-lg'):
            ui.label(i18n.t('setup.instruction')).classes('text-md font-mono text-center')
            
        ui.button(i18n.t('setup.check_again'), on_click=on_check_again) \
            .props('color=primary icon=refresh')
