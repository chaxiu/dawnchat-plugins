import argparse
import json
import sys
from nicegui import ui, app

from dawnchat_sdk.ui import setup_dawnchat_ui, get_theme

from i18n import i18n

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    # Ignore unknown args to avoid conflicts
    args, _ = parser.parse_known_args()

    # Define the UI
    @ui.page('/')
    def index(theme: str = 'dark', lang: str = 'zh'):
        is_dark = str(theme).lower() == 'dark'
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()
        c = theme_obj.colors

        def _t(key):
            return i18n.t(key, lang)

        with ui.column().classes('w-full h-screen items-center justify-center').style(f'background-color: {c.bg_primary};'):

            with ui.card().classes('w-96 p-6 shadow-xl').style(f'background-color: {c.bg_secondary}; border: 1px solid {c.border};'):
                with ui.row().classes('w-full items-center justify-center mb-4'):
                    ui.icon('waving_hand', size='4rem').style(f'color: {c.primary};')
                
                ui.label(_t('title')).classes('text-3xl font-bold text-center w-full mb-1').style(f'color: {c.text_primary};')
                ui.label(_t('subtitle')).classes('text-sm text-center w-full mb-6').style(f'color: {c.text_secondary};')
                
                name_input = ui.input(label=_t('label')).classes('w-full mb-4').style(
                    f'--q-field-bg: {c.bg_secondary}; color: {c.text_primary};'
                )
                
                def greet():
                    name = name_input.value or "Stranger"
                    ui.notify(_t('notify').format(name), type='positive')
                
                ui.button(_t('btn'), on_click=greet).classes('w-full').style(f'background-color: {c.primary}; color: white;')
                
                with ui.expansion(_t('debug'), icon='info').classes('w-full mt-4').style(f'color: {c.text_primary};'):
                    ui.label(f'Host: {args.host}').style(f'color: {c.text_secondary};')
                    ui.label(f'Port: {args.port}').style(f'color: {c.text_secondary};')
                    ui.label(f'Python: {sys.version.split()[0]}').style(f'color: {c.text_secondary};')

    # Register startup callback to signal readiness to PluginManager
    def on_startup():
        print(json.dumps({"status": "ready"}), file=sys.stderr, flush=True)

    app.on_startup(on_startup)

    # Start the server
    ui.run(
        host=args.host,
        port=args.port,
        title="Hello World (NiceGUI)",
        favicon="👋",
        show=False,
        reload=False,
        dark=False
    )

if __name__ in {"__main__", "__mp_main__"}:
    main()
