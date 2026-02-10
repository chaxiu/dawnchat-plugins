"""
UI Module

NiceGUI 界面组件。
"""

# 使用延迟导入，避免循环依赖和相对导入问题
from typing import TYPE_CHECKING

__all__ = ["render_dashboard", "render_import_modal", "render_detail_view"]

if TYPE_CHECKING:
    from .dashboard import render_dashboard
    from .detail_view import render_detail_view
    from .import_modal import render_import_modal


def __getattr__(name):
    """延迟导入"""
    if name == "render_dashboard":
        from ui.dashboard import render_dashboard
        return render_dashboard
    elif name == "render_import_modal":
        from ui.import_modal import render_import_modal
        return render_import_modal
    elif name == "render_detail_view":
        from ui.detail_view import render_detail_view
        return render_detail_view
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
