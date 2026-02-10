"""
DawnChat Plugin SDK - UI Module

Provides NiceGUI theming and components that match the DawnChat Vue frontend.
"""

from .theme import (
    DawnChatTheme,
    DARK_THEME,
    LIGHT_THEME,
    setup_dawnchat_ui,
    get_theme,
)
from .components import (
    Card,
    PrimaryButton,
    SecondaryButton,
    DangerButton,
    TextInput,
    Header,
    SubHeader,
    BodyText,
    MutedText,
    Divider,
)

__all__ = [
    # Theme
    "DawnChatTheme",
    "DARK_THEME",
    "LIGHT_THEME",
    "setup_dawnchat_ui",
    "get_theme",
    # Components
    "Card",
    "PrimaryButton",
    "SecondaryButton",
    "DangerButton",
    "TextInput",
    "Header",
    "SubHeader",
    "BodyText",
    "MutedText",
    "Divider",
]

