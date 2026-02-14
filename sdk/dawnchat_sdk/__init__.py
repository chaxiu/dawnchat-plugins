"""
DawnChat Plugin SDK

Build plugins for the DawnChat AI Assistant Platform.
"""

from .plugin import BasePlugin
from .host import (
    host,
    HostClient,
    SDKError,
    HostConnectionError,
    HostAPIError,
)
from .cards import Card as AdaptiveCard, TextBlock, Container, Action
from .logging import setup_plugin_logging
from .mcp_router import build_mcp_router, report_task_progress
from .api_router import create_tool_proxy_router
from .task_handle import TaskSnapshot, ToolTaskHandle
from .tool_errors import (
    ToolCallError,
    ToolCancelledError,
    ToolExecutionError,
    ToolTimeoutError,
    ToolTransportError,
)
from .tool_gateway import ToolCallMode, ToolCallOptions, ToolGateway
from .plugin_data import PluginDataPaths
from .model_downloads import DownloadSource, DownloadTask, ModelDownloadFacade
from .model_artifacts import is_repo_installed, is_single_file_installed
from .download_task_store import DownloadTaskStore

__version__ = "1.0.0"
__all__ = [
    # Plugin base
    "BasePlugin",
    # Host client
    "host",
    "HostClient",
    # Exceptions
    "SDKError",
    "HostConnectionError",
    "HostAPIError",
    # Adaptive Cards
    "AdaptiveCard",
    "TextBlock",
    "Container",
    "Action",
    "setup_plugin_logging",
    "build_mcp_router",
    "report_task_progress",
    "create_tool_proxy_router",
    "ToolGateway",
    "ToolCallMode",
    "ToolCallOptions",
    "ToolTaskHandle",
    "TaskSnapshot",
    "ToolCallError",
    "ToolTimeoutError",
    "ToolCancelledError",
    "ToolExecutionError",
    "ToolTransportError",
    "PluginDataPaths",
    "DownloadSource",
    "DownloadTask",
    "ModelDownloadFacade",
    "is_repo_installed",
    "is_single_file_installed",
    "DownloadTaskStore",
]

# UI module is optional and imported separately
# from dawnchat_sdk.ui import setup_dawnchat_ui, Card, PrimaryButton, ...
