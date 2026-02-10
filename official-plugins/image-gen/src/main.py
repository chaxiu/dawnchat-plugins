import argparse
import sys
import json
import logging
import asyncio
from pathlib import Path
from nicegui import ui, app

# Add src directory to path
SRC_DIR = Path(__file__).parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from dawnchat_sdk import host
from dawnchat_sdk.ui import setup_dawnchat_ui, get_theme
from i18n import i18n
from ui.dashboard import render_dashboard
from ui.setup import render_setup
from ui.text_to_image import render_text_to_image
from ui.image_to_image import render_image_to_image
from ui.inpaint import render_inpaint
from ui.upscale import render_upscale

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-gen")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8081)
    args, _ = parser.parse_known_args()
    
    # State
    class AppState:
        def __init__(self):
            self.current_page = 'dashboard'
            self.has_models = False
            self.checked_status = False

    state = AppState()

    @ui.page('/')
    async def index(theme: str = 'dark', lang: str = 'zh'):
        is_dark = str(theme).lower() == 'dark'
        setup_dawnchat_ui(dark=is_dark)
        
        i18n.set_lang(lang)
        
        # Container for content
        content = ui.column().classes('w-full min-h-screen p-0')
        
        async def check_status():
            try:
                status = await host.image_gen.get_status()
                state.has_models = status.get('has_models', False)
                state.checked_status = True
            except Exception as e:
                logger.error(f"Status check failed: {e}")
                state.has_models = False
                
        async def render_content():
            content.clear()
            with content:
                if not state.checked_status:
                    await check_status()
                    
                if not state.has_models:
                    async def retry():
                        state.checked_status = False
                        await render_content()
                    await render_setup(on_check_again=retry)
                    return

                def navigate(page: str):
                    state.current_page = page
                    asyncio.create_task(render_content())

                if state.current_page == 'dashboard':
                    await render_dashboard(on_navigate=navigate)
                elif state.current_page == 'text_to_image':
                    await render_text_to_image(on_back=lambda: navigate('dashboard'))
                elif state.current_page == 'image_to_image':
                    await render_image_to_image(on_back=lambda: navigate('dashboard'))
                elif state.current_page == 'inpaint':
                    await render_inpaint(on_back=lambda: navigate('dashboard'))
                elif state.current_page == 'upscale':
                    await render_upscale(on_back=lambda: navigate('dashboard'))
        
        await render_content()

    # Startup callback
    def on_startup():
        print(json.dumps({"status": "ready"}), file=sys.stderr, flush=True)

    app.on_startup(on_startup)

    ui.run(
        host=args.host,
        port=args.port,
        title="AI Image Studio",
        favicon="🎨",
        show=False,
        reload=False,
        dark=True
    )

if __name__ in {"__main__", "__mp_main__"}:
    main()
