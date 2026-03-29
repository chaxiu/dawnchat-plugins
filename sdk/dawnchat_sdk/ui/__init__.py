from __future__ import annotations

from typing import Any

_LEGACY_EXPORTS = {
    "DawnChatTheme",
    "DARK_THEME",
    "LIGHT_THEME",
    "setup_dawnchat_ui",
    "get_theme",
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
    "ResultCard",
    "LoadingSpinner",
    "create_theme_toggle",
}

__all__: list[str] = []


def __getattr__(name: str) -> Any:
    if name not in _LEGACY_EXPORTS:
        raise AttributeError(name)
    raise ModuleNotFoundError("dawnchat_sdk.ui (NiceGUI Python UI) has been removed from dawnchat-sdk")
