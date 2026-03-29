from importlib import import_module

import pytest


def test_ui_module_import_does_not_require_nicegui() -> None:
    module = import_module("dawnchat_sdk.ui")

    assert module.__all__ == []


def test_ui_symbol_access_raises_removed_error() -> None:
    module = import_module("dawnchat_sdk.ui")
    with pytest.raises(ModuleNotFoundError):
        _ = module.Card
