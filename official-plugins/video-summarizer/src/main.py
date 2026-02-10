"""
Video Summarizer Plugin - Main Entry

音视频摘要插件的主入口。
使用 NiceGUI 构建用户界面。
"""

import argparse
import asyncio
import json
import sys
import logging
from pathlib import Path

# ============ 日志配置 ============
# 配置根日志器，确保所有日志都输出到 stderr（可被 Host 捕获）
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr)
    ]
)

# 为各模块创建 logger
logger = logging.getLogger("video-summarizer")
logger.setLevel(logging.DEBUG)

# 同时配置 dawnchat_sdk 的日志输出
sdk_logger = logging.getLogger("dawnchat_sdk")
sdk_logger.setLevel(logging.DEBUG)

logger.info("🎬 Video Summarizer Plugin starting...")

# Add src directory to path for absolute imports
SRC_DIR = Path(__file__).parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from nicegui import ui, app

from dawnchat_sdk import host
from dawnchat_sdk.ui import setup_dawnchat_ui, get_theme

from i18n import i18n
from ui.dashboard import render_dashboard
from ui.import_modal import render_import_modal
from ui.detail_view import render_detail_view
from storage.cache import TaskCache


# Global state
task_cache = TaskCache()
current_task_id = None


def main():
    """Plugin entry point."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args, _ = parser.parse_known_args()

    @ui.page('/')
    async def index(theme: str = 'dark', lang: str = 'zh'):
        """Main page - Task Dashboard."""
        is_dark = str(theme).lower() == 'dark'
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()
        c = theme_obj.colors
        
        # Add custom CSS
        ui.add_head_html(f"""
        <style>
            body {{
                background-color: {c.bg_primary} !important;
            }}
            .nicegui-content {{
                background-color: {c.bg_primary} !important;
            }}
            .task-card {{
                background-color: {c.bg_secondary};
                border: 1px solid {c.border};
                border-radius: 12px;
                padding: 1rem;
                margin-bottom: 0.75rem;
                transition: all 0.2s;
                cursor: pointer;
            }}
            .task-card:hover {{
                border-color: {c.primary};
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }}
            .status-processing {{
                color: {c.warning};
            }}
            .status-completed {{
                color: {c.success};
            }}
            .status-error {{
                color: {c.danger};
            }}
            .fab-button {{
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: {c.primary};
                color: white;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transition: all 0.2s;
                z-index: 100;
            }}
            .fab-button:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
            }}
        </style>
        """)
        
        # Render dashboard
        await render_dashboard(task_cache, theme_obj, lang=lang)

    @ui.page('/task/{task_id}')
    async def task_detail(task_id: str, theme: str = 'dark', lang: str = 'zh'):
        """Task detail page - Split view."""
        is_dark = theme == 'dark'
        setup_dawnchat_ui(dark=is_dark)
        theme_obj = get_theme()
        
        task = task_cache.get(task_id)
        if not task:
            ui.label("Task not found" if lang == 'en' else "任务不存在").classes('text-xl')
            return
        
        await render_detail_view(task, theme_obj, lang=lang)

    # Startup callback
    def on_startup():
        print(json.dumps({"status": "ready"}), file=sys.stderr, flush=True)

    app.on_startup(on_startup)

    # Start server
    ui.run(
        host=args.host,
        port=args.port,
        title="音视频摘要",
        favicon="📹",
        show=False,
        reload=False,
        dark=True
    )


if __name__ in {"__main__", "__mp_main__"}:
    main()

