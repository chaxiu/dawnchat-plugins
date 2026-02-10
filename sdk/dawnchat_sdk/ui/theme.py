"""
DawnChat Plugin SDK - Theme System

Provides theming for NiceGUI that matches the DawnChat Vue frontend.
Uses CSS variables matching apps/frontend/src/style.css.
"""

from dataclasses import dataclass
from typing import Optional, Callable
import logging

logger = logging.getLogger("dawnchat_sdk.ui")


# ============ Theme Definitions ============

@dataclass(frozen=True)
class ThemeColors:
    """Color definitions for a theme."""
    bg_primary: str
    bg_secondary: str
    bg_tertiary: str  # 第三级背景（卡片等）
    bg_hover: str
    border: str
    text_primary: str
    text_secondary: str
    text_disabled: str
    primary: str
    primary_hover: str
    success: str
    warning: str
    danger: str


# Dark Mode (Default) - matches Vue frontend CSS variables (apps/frontend/src/style.css)
# 配色基于 macOS 原生窗口颜色，实现跨平台统一视觉
DARK_THEME = ThemeColors(
    bg_primary="#373736",       # 匹配 macOS 深色窗口
    bg_secondary="#373736",     # 略浅的次级背景
    bg_tertiary="#3F3E3C",      # 第三级背景（卡片等）
    bg_hover="rgba(255, 255, 255, 0.08)",
    border="#454341",           # 边框色
    text_primary="#F9FAFB",
    text_secondary="#A8A6A3",
    text_disabled="#6B6965",
    primary="#3B82F6",
    primary_hover="#60A5FA",
    success="#22C55E",
    warning="#F59E0B",
    danger="#EF4444",
)

# Light Mode - matches Vue frontend CSS variables (apps/frontend/src/style.css)
LIGHT_THEME = ThemeColors(
    bg_primary="#F4F4F3",       # 匹配 macOS 浅色窗口
    bg_secondary="#F4F4F3",     # 略浅的次级背景
    bg_tertiary="#FFFFFF",      # 第三级背景（卡片等）
    bg_hover="rgba(0, 0, 0, 0.05)",
    border="#D1D1D0",           # 边框色
    text_primary="#1A1918",
    text_secondary="#6B6965",
    text_disabled="#A8A6A3",
    primary="#3B82F6",
    primary_hover="#60A5FA",
    success="#22C55E",
    warning="#F59E0B",
    danger="#EF4444",
)


# ============ Theme Manager ============

class DawnChatTheme:
    """
    Theme manager for DawnChat plugins.
    
    Provides dark/light mode switching and CSS generation.
    """
    
    _instance: Optional["DawnChatTheme"] = None
    
    def __new__(cls) -> "DawnChatTheme":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._dark_mode = True  # Dark mode by default
        self._colors = DARK_THEME
        self._on_change_callbacks: list[Callable[[bool], None]] = []
        self._initialized = True
    
    @property
    def is_dark(self) -> bool:
        """Check if dark mode is active."""
        return self._dark_mode
    
    @property
    def colors(self) -> ThemeColors:
        """Get current theme colors."""
        return self._colors
    
    def set_dark_mode(self, dark: bool) -> None:
        """Set dark mode on/off."""
        if self._dark_mode != dark:
            self._dark_mode = dark
            self._colors = DARK_THEME if dark else LIGHT_THEME
            logger.info(f"Theme switched to {'dark' if dark else 'light'} mode")
            
            # Notify listeners
            for callback in self._on_change_callbacks:
                try:
                    callback(dark)
                except Exception as e:
                    logger.error(f"Error in theme change callback: {e}")
    
    def toggle(self) -> bool:
        """Toggle between dark and light mode."""
        self.set_dark_mode(not self._dark_mode)
        return self._dark_mode
    
    def on_change(self, callback: Callable[[bool], None]) -> None:
        """Register a callback for theme changes."""
        self._on_change_callbacks.append(callback)
    
    def get_css(self) -> str:
        """Generate CSS for the current theme."""
        c = self._colors
        return f"""
        :root {{
            --dc-bg-primary: {c.bg_primary};
            --dc-bg-secondary: {c.bg_secondary};
            --dc-bg-tertiary: {c.bg_tertiary};
            --dc-bg-hover: {c.bg_hover};
            --dc-border: {c.border};
            --dc-text-primary: {c.text_primary};
            --dc-text-secondary: {c.text_secondary};
            --dc-text-disabled: {c.text_disabled};
            --dc-primary: {c.primary};
            --dc-primary-hover: {c.primary_hover};
            --dc-success: {c.success};
            --dc-warning: {c.warning};
            --dc-danger: {c.danger};
        }}
        
        body {{
            background-color: {c.bg_primary} !important;
            color: {c.text_primary} !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        }}
        
        /* NiceGUI overrides */
        .nicegui-content {{
            background-color: {c.bg_primary} !important;
        }}
        
        .q-card {{
            background-color: {c.bg_secondary} !important;
            border: 1px solid {c.border} !important;
            color: {c.text_primary} !important;
        }}
        
        .q-input .q-field__control {{
            background-color: {c.bg_secondary} !important;
            color: {c.text_primary} !important;
        }}
        
        .q-input .q-field__native {{
            color: {c.text_primary} !important;
        }}
        
        .q-input .q-field__label {{
            color: {c.text_secondary} !important;
        }}
        
        .q-btn--standard {{
            background-color: {c.primary} !important;
            color: white !important;
        }}
        
        .q-btn--standard:hover {{
            background-color: {c.primary_hover} !important;
        }}
        
        /* DawnChat custom classes */
        .dc-card {{
            background-color: {c.bg_secondary};
            border: 1px solid {c.border};
            border-radius: 0.5rem;
            padding: 1.5rem;
        }}
        
        .dc-text-primary {{
            color: {c.text_primary};
        }}
        
        .dc-text-secondary {{
            color: {c.text_secondary};
        }}
        
        .dc-text-muted {{
            color: {c.text_disabled};
        }}
        
        .dc-bg-primary {{
            background-color: {c.bg_primary};
        }}
        
        .dc-bg-secondary {{
            background-color: {c.bg_secondary};
        }}
        
        .dc-bg-tertiary {{
            background-color: {c.bg_tertiary};
        }}
        
        .dc-border {{
            border-color: {c.border};
        }}
        
        .dc-btn-primary {{
            background-color: {c.primary} !important;
            color: white !important;
            border: none !important;
        }}
        
        .dc-btn-primary:hover {{
            background-color: {c.primary_hover} !important;
        }}
        
        .dc-btn-secondary {{
            background-color: transparent !important;
            color: {c.text_primary} !important;
            border: 1px solid {c.border} !important;
        }}
        
        .dc-btn-secondary:hover {{
            background-color: {c.bg_hover} !important;
        }}
        
        .dc-btn-danger {{
            background-color: {c.danger} !important;
            color: white !important;
            border: none !important;
        }}
        
        .dc-input {{
            background-color: {c.bg_secondary} !important;
            border: 1px solid {c.border} !important;
            color: {c.text_primary} !important;
        }}
        
        .dc-divider {{
            border-top: 1px solid {c.border};
            margin: 1rem 0;
        }}
        """


# Global theme instance
_theme: Optional[DawnChatTheme] = None


def get_theme() -> DawnChatTheme:
    """Get the global theme instance."""
    global _theme
    if _theme is None:
        _theme = DawnChatTheme()
    return _theme


def setup_dawnchat_ui(dark: bool = True) -> DawnChatTheme:
    """
    Setup DawnChat UI theming for NiceGUI.
    
    Call this at the start of your plugin to apply DawnChat styling.
    
    Args:
        dark: Start in dark mode (default: True)
    
    Returns:
        The DawnChatTheme instance for further customization
    
    Example:
        from dawnchat_sdk.ui import setup_dawnchat_ui
        
        theme = setup_dawnchat_ui(dark=True)
        
        @ui.page('/')
        def index():
            ui.label("Hello DawnChat!")
    """
    from nicegui import ui
    
    theme = get_theme()
    theme.set_dark_mode(dark)
    
    # Add theme CSS to the page
    ui.add_head_html(f"<style>{theme.get_css()}</style>")
    
    # Set NiceGUI dark mode
    ui.dark_mode(dark)
    
    logger.info(f"DawnChat UI setup complete (dark={dark})")
    
    return theme


def create_theme_toggle():
    """
    Create a theme toggle button.
    
    Returns a NiceGUI button that toggles between dark and light mode.
    
    Example:
        from dawnchat_sdk.ui import setup_dawnchat_ui, create_theme_toggle
        
        setup_dawnchat_ui()
        
        @ui.page('/')
        def index():
            create_theme_toggle()
    """
    from nicegui import ui
    
    theme = get_theme()
    
    def toggle_theme():
        is_dark = theme.toggle()
        # Update NiceGUI dark mode
        ui.dark_mode(is_dark)
        # Refresh the page to apply new CSS
        ui.run_javascript('location.reload()')
    
    icon = "dark_mode" if theme.is_dark else "light_mode"
    tooltip = "切换到亮色模式" if theme.is_dark else "切换到暗色模式"
    
    return ui.button(icon=icon, on_click=toggle_theme).props('flat round').tooltip(tooltip)

