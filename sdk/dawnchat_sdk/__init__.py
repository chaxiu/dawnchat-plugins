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
from .mcp_router import build_mcp_router

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
]

# UI module is optional and imported separately
# from dawnchat_sdk.ui import setup_dawnchat_ui, Card, PrimaryButton, ...
