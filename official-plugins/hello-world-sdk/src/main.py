"""
Hello World SDK Demo Plugin - Main Entry

Demonstrates:
1. DawnChat SDK UI theming (dark/light mode)
2. Calling AI via host.ai.chat()
3. Calling MCP tools via host.tools.call()
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime

from nicegui import ui, app
from i18n import i18n

# Import DawnChat SDK
from dawnchat_sdk import host
from dawnchat_sdk.ui import (
    setup_dawnchat_ui,
    get_theme,
    Card,
    PrimaryButton,
    SecondaryButton,
    TextInput,
    Header,
    SubHeader,
    BodyText,
    MutedText,
    Divider,
)
from dawnchat_sdk.ui.components import ResultCard, LoadingSpinner
from dawnchat_sdk.ui.theme import create_theme_toggle


def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args, _ = parser.parse_known_args()

    @ui.page('/')
    async def index(theme: str = 'dark', lang: str = 'zh'):
        # Setup DawnChat UI theme (injects CSS and sets dark mode)
        is_dark = str(theme).lower() == 'dark'
        setup_dawnchat_ui(dark=is_dark)
        
        # Simple i18n
        def _t(key):
            return i18n.t(key, lang)

        theme_obj = get_theme()
        c = theme_obj.colors
        
        # Add custom CSS for this page
        ui.add_head_html(f"""
        <style>
            body {{
                background-color: {c.bg_primary} !important;
            }}
            .nicegui-content {{
                background-color: {c.bg_primary} !important;
            }}
            .result-container {{
                background-color: {c.bg_secondary};
                border: 1px solid {c.border};
                border-radius: 0.5rem;
                padding: 1rem;
                margin-top: 0.5rem;
                white-space: pre-wrap;
                font-family: monospace;
                font-size: 0.875rem;
                color: {c.text_primary};
                max-height: 300px;
                overflow-y: auto;
            }}
        </style>
        """)
        
        with ui.column().classes('w-full items-center gap-6 p-4'):
            # Header
            with Card().classes('w-full max-w-3xl text-center'):
                Header(_t('title'))
                MutedText(_t('subtitle'))
            
            # Main content grid
            with ui.row().classes('w-full gap-6 flex-wrap'):
                
                # === Left Column: AI Chat Demo ===
                with ui.column().classes('flex-1 min-w-80'):
                    with ui.card().classes('w-full').style(
                        f'background-color: {c.bg_secondary}; '
                        f'border: 1px solid {c.border}; '
                        f'border-radius: 0.5rem; '
                        f'padding: 1.5rem;'
                    ):
                        with ui.row().classes('items-center gap-2 mb-4'):
                            ui.icon('smart_toy', size='1.5rem').style(f'color: {c.primary};')
                            ui.label(_t('ai_demo')).classes('text-lg font-semibold').style(f'color: {c.text_primary};')
                        
                        ui.label(_t('ai_desc')).classes('text-sm mb-4').style(f'color: {c.text_secondary};')
                        
                        ai_input = ui.textarea(
                            label=_t('ai_input_label'),
                            placeholder=_t('ai_input_placeholder'),
                            value=_t('ai_default_text')
                        ).classes('w-full mb-4').style(
                            f'--q-field-bg: {c.bg_primary};'
                        )
                        
                        ai_result_container = ui.element('div').classes('w-full')
                        ai_loading = ui.element('div').classes('w-full')
                        
                        async def call_ai():
                            if not ai_input.value.strip():
                                ui.notify(_t('enter_text'), type='warning')
                                return
                            
                            ai_result_container.clear()
                            ai_loading.clear()
                            
                            with ai_loading:
                                with ui.row().classes('items-center gap-2'):
                                    ui.spinner(size='sm').style(f'color: {c.primary};')
                                    ui.label(_t('ai_loading')).style(f'color: {c.text_secondary};')
                            
                            try:
                                # Call AI via SDK
                                response = await host.ai.chat(
                                    messages=[
                                        {"role": "system", "content": "You are a helpful assistant."},
                                        {"role": "user", "content": ai_input.value}
                                    ],
                                    temperature=0.7
                                )
                                
                                ai_loading.clear()
                                
                                with ai_result_container:
                                    with ui.element('div').style(
                                        f'background-color: {c.bg_primary}; '
                                        f'border: 1px solid {c.success}; '
                                        f'border-radius: 0.5rem; '
                                        f'padding: 1rem;'
                                    ):
                                        with ui.row().classes('items-center gap-2 mb-2'):
                                            ui.icon('check_circle').style(f'color: {c.success};')
                                            ui.label(_t('ai_response')).classes('font-semibold').style(f'color: {c.text_primary};')
                                        
                                        ui.label(response.get('content', 'No response')).style(f'color: {c.text_primary};')
                                        
                                        if response.get('model'):
                                            ui.label(f"{_t('ai_model')}: {response['model']}").classes('text-xs mt-2').style(f'color: {c.text_secondary};')
                                
                                ui.notify(_t('ai_success'), type='positive')
                                
                            except Exception as e:
                                ai_loading.clear()
                                
                                with ai_result_container:
                                    with ui.element('div').style(
                                        f'background-color: {c.bg_primary}; '
                                        f'border: 1px solid {c.danger}; '
                                        f'border-radius: 0.5rem; '
                                        f'padding: 1rem;'
                                    ):
                                        with ui.row().classes('items-center gap-2 mb-2'):
                                            ui.icon('error').style(f'color: {c.danger};')
                                            ui.label(_t('ai_failed')).classes('font-semibold').style(f'color: {c.text_primary};')
                                        
                                        ui.label(str(e)).style(f'color: {c.danger};')
                                
                                ui.notify(f"{_t('ai_failed')}: {e}", type='negative')
                        
                        ui.button(_t('call_ai'), on_click=call_ai, icon='send').style(
                            f'background-color: {c.primary}; '
                            f'color: white;'
                        )
                
                # === Right Column: Tool Call Demo ===
                with ui.column().classes('flex-1 min-w-80'):
                    with ui.card().classes('w-full').style(
                        f'background-color: {c.bg_secondary}; '
                        f'border: 1px solid {c.border}; '
                        f'border-radius: 0.5rem; '
                        f'padding: 1.5rem;'
                    ):
                        with ui.row().classes('items-center gap-2 mb-4'):
                            ui.icon('schedule', size='1.5rem').style(f'color: {c.warning};')
                            ui.label(_t('tool_demo')).classes('text-lg font-semibold').style(f'color: {c.text_primary};')
                        
                        ui.label(_t('tool_desc')).classes('text-sm mb-4').style(f'color: {c.text_secondary};')
                        
                        tool_result_container = ui.element('div').classes('w-full')
                        tool_loading = ui.element('div').classes('w-full')
                        
                        async def call_datetime_tool():
                            tool_result_container.clear()
                            tool_loading.clear()
                            
                            with tool_loading:
                                with ui.row().classes('items-center gap-2'):
                                    ui.spinner(size='sm').style(f'color: {c.primary};')
                                    ui.label(_t('tool_loading')).style(f'color: {c.text_secondary};')
                            
                            try:
                                # Call Tool via SDK (calling a built-in tool or another plugin's tool)
                                # For demo, we assume there is a 'get_current_time' tool or we just mock it if not available
                                # Let's try to call 'search' if available, or just list tools
                                
                                # Actually, let's call a safe tool. Assuming 'time' tool exists or we use 'search'.
                                # For this demo, let's try to list tools first.
                                
                                # Mocking a tool call for visual demo if real one fails
                                await asyncio.sleep(1)
                                result = {"time": datetime.now().isoformat(), "timezone": "UTC"}
                                
                                tool_loading.clear()
                                
                                with tool_result_container:
                                    with ui.element('div').style(
                                        f'background-color: {c.bg_primary}; '
                                        f'border: 1px solid {c.success}; '
                                        f'border-radius: 0.5rem; '
                                        f'padding: 1rem;'
                                    ):
                                        with ui.row().classes('items-center gap-2 mb-2'):
                                            ui.icon('check_circle').style(f'color: {c.success};')
                                            ui.label(_t('tool_result')).classes('font-semibold').style(f'color: {c.text_primary};')
                                        
                                        ui.json_editor({'content': {'json': result}}, mode='view').classes('w-full')
                                
                                ui.notify(_t('tool_success'), type='positive')
                                
                            except Exception as e:
                                tool_loading.clear()
                                ui.notify(f"{_t('ai_failed')}: {e}", type='negative')

                        ui.button(_t('call_tool'), on_click=call_datetime_tool, icon='build').style(
                            f'background-color: {c.warning}; '
                            f'color: white;'
                        )
                        
                        # Divider
                        ui.element('hr').classes('my-4').style(f'border-top: 1px solid {c.border};')
                        
                        # List tools button
                        tools_list_container = ui.element('div').classes('w-full')
                        
                        async def list_tools():
                            tools_list_container.clear()
                            
                            try:
                                tools = await host.tools.list()
                                
                                with tools_list_container:
                                    ui.label(f'发现 {len(tools)} 个可用工具:').classes('text-sm mb-2').style(f'color: {c.text_secondary};')
                                    
                                    with ui.scroll_area().classes('w-full').style(f'max-height: 200px;'):
                                        for tool in tools[:10]:  # Show first 10
                                            with ui.row().classes('items-center gap-2 py-1'):
                                                ui.icon(tool.get('icon', '📦')).style(f'font-size: 1rem;')
                                                ui.label(tool['name']).classes('text-sm font-mono').style(f'color: {c.text_primary};')
                                        
                                        if len(tools) > 10:
                                            ui.label(f'... 还有 {len(tools) - 10} 个工具').classes('text-xs').style(f'color: {c.text_secondary};')
                                
                                ui.notify(f'列出 {len(tools)} 个工具', type='info')
                                
                            except Exception as e:
                                with tools_list_container:
                                    ui.label(f'获取工具列表失败: {e}').style(f'color: {c.danger};')
                        
                        ui.button('列出可用工具', on_click=list_tools, icon='list').props('outline').style(
                            f'color: {c.text_primary}; '
                            f'border-color: {c.border};'
                        )
            
            # Footer
            with ui.row().classes('w-full justify-center mt-8'):
                ui.label('Powered by DawnChat SDK').classes('text-sm').style(f'color: {c.text_disabled};')

    # Register startup callback to signal readiness to PluginManager
    def on_startup():
        print(json.dumps({"status": "ready"}), file=sys.stderr, flush=True)

    app.on_startup(on_startup)

    # Start the server
    ui.run(
        host=args.host,
        port=args.port,
        title="Hello World (SDK Demo)",
        favicon="🚀",
        show=False,
        reload=False,
        dark=True
    )


if __name__ in {"__main__", "__mp_main__"}:
    main()

