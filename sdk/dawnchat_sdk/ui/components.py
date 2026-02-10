"""
DawnChat Plugin SDK - UI Components

Pre-styled NiceGUI components that match the DawnChat Vue frontend.
"""

from typing import Optional, Callable, Any
from nicegui import ui

from .theme import get_theme


# ============ Layout Components ============

class Card:
    """
    A styled card container matching DawnChat Vue frontend.
    
    Example:
        with Card("My Card", subtitle="Some description"):
            ui.label("Card content here")
    """
    
    def __init__(
        self,
        title: Optional[str] = None,
        subtitle: Optional[str] = None,
        classes: str = "",
    ):
        self._title = title
        self._subtitle = subtitle
        self._classes = classes
        self._container: Optional[Any] = None
    
    def classes(self, add: Optional[str] = None, *, remove: Optional[str] = None, replace: Optional[str] = None) -> "Card":
        """
        Apply CSS classes to the card container.
        Matches NiceGUI's Element.classes() signature.
        """
        if add:
            self._classes = f"{self._classes} {add}".strip()
        return self
    
    def __enter__(self):
        theme = get_theme()
        c = theme.colors
        
        container = ui.card().classes(f"dc-card {self._classes}").style(
            f"background-color: {c.bg_secondary}; "
            f"border: 1px solid {c.border}; "
            f"border-radius: 0.5rem; "
            f"padding: 1.5rem;"
        )
        self._container = container
        container.__enter__()
        
        if self._title:
            Header(self._title)
        if self._subtitle:
            MutedText(self._subtitle)
            ui.element('div').classes('h-2')  # Spacer
        
        return self._container
    
    def __exit__(self, *args):
        if self._container is not None:
            self._container.__exit__(*args)


# ============ Button Components ============

def PrimaryButton(
    text: str,
    on_click: Optional[Callable] = None,
    icon: Optional[str] = None,
    disabled: bool = False,
    classes: str = "",
) -> ui.button:
    """
    Primary action button with DawnChat styling.
    
    Example:
        PrimaryButton("Submit", on_click=handle_submit, icon="send")
    """
    theme = get_theme()
    c = theme.colors
    
    btn = ui.button(text, on_click=on_click, icon=icon)
    btn.classes(f"dc-btn-primary {classes}")
    btn.style(
        f"background-color: {c.primary}; "
        f"color: white; "
        f"border: none; "
        f"border-radius: 0.375rem; "
        f"padding: 0.5rem 1rem; "
        f"font-weight: 500;"
    )
    
    if disabled:
        btn.props('disable')
    
    return btn


def SecondaryButton(
    text: str,
    on_click: Optional[Callable] = None,
    icon: Optional[str] = None,
    disabled: bool = False,
    classes: str = "",
) -> ui.button:
    """
    Secondary action button with outline style.
    
    Example:
        SecondaryButton("Cancel", on_click=handle_cancel)
    """
    theme = get_theme()
    c = theme.colors
    
    btn = ui.button(text, on_click=on_click, icon=icon)
    btn.classes(f"dc-btn-secondary {classes}")
    btn.style(
        f"background-color: transparent; "
        f"color: {c.text_primary}; "
        f"border: 1px solid {c.border}; "
        f"border-radius: 0.375rem; "
        f"padding: 0.5rem 1rem; "
        f"font-weight: 500;"
    )
    
    if disabled:
        btn.props('disable')
    
    return btn


def DangerButton(
    text: str,
    on_click: Optional[Callable] = None,
    icon: Optional[str] = None,
    disabled: bool = False,
    classes: str = "",
) -> ui.button:
    """
    Danger/destructive action button.
    
    Example:
        DangerButton("Delete", on_click=handle_delete, icon="delete")
    """
    theme = get_theme()
    c = theme.colors
    
    btn = ui.button(text, on_click=on_click, icon=icon)
    btn.classes(f"dc-btn-danger {classes}")
    btn.style(
        f"background-color: {c.danger}; "
        f"color: white; "
        f"border: none; "
        f"border-radius: 0.375rem; "
        f"padding: 0.5rem 1rem; "
        f"font-weight: 500;"
    )
    
    if disabled:
        btn.props('disable')
    
    return btn


# ============ Input Components ============

def TextInput(
    label: str = "",
    placeholder: str = "",
    value: str = "",
    on_change: Optional[Callable] = None,
    password: bool = False,
    classes: str = "",
) -> ui.input:
    """
    Styled text input matching DawnChat theme.
    
    Example:
        name = TextInput(label="Name", placeholder="Enter your name")
    """
    theme = get_theme()
    c = theme.colors
    
    input_el = ui.input(
        label=label,
        placeholder=placeholder,
        value=value,
        on_change=on_change,
        password=password,
    )
    input_el.classes(f"dc-input w-full {classes}")
    input_el.style(
        f"--q-field-bg: {c.bg_secondary}; "
    )
    
    return input_el


# ============ Typography Components ============

def Header(
    text: str,
    classes: str = "",
) -> ui.label:
    """
    Large header text.
    
    Example:
        Header("Welcome to My Plugin")
    """
    theme = get_theme()
    c = theme.colors
    
    label = ui.label(text)
    label.classes(f"text-2xl font-bold dc-text-primary {classes}")
    label.style(f"color: {c.text_primary};")
    
    return label


def SubHeader(
    text: str,
    classes: str = "",
) -> ui.label:
    """
    Smaller header/subheading text.
    
    Example:
        SubHeader("Section Title")
    """
    theme = get_theme()
    c = theme.colors
    
    label = ui.label(text)
    label.classes(f"text-lg font-semibold dc-text-primary {classes}")
    label.style(f"color: {c.text_primary};")
    
    return label


def BodyText(
    text: str,
    classes: str = "",
) -> ui.label:
    """
    Normal body text.
    
    Example:
        BodyText("This is some content.")
    """
    theme = get_theme()
    c = theme.colors
    
    label = ui.label(text)
    label.classes(f"text-base dc-text-primary {classes}")
    label.style(f"color: {c.text_primary};")
    
    return label


def MutedText(
    text: str,
    classes: str = "",
) -> ui.label:
    """
    Muted/secondary text for less important information.
    
    Example:
        MutedText("Last updated: 2024-01-01")
    """
    theme = get_theme()
    c = theme.colors
    
    label = ui.label(text)
    label.classes(f"text-sm dc-text-secondary {classes}")
    label.style(f"color: {c.text_secondary};")
    
    return label


# ============ Utility Components ============

def Divider(classes: str = "") -> ui.element:
    """
    A horizontal divider line.
    
    Example:
        Divider()
    """
    theme = get_theme()
    c = theme.colors
    
    div = ui.element('hr')
    div.classes(f"dc-divider w-full {classes}")
    div.style(f"border-top: 1px solid {c.border}; margin: 1rem 0;")
    
    return div


class ResultCard:
    """
    A card for displaying operation results.
    
    Example:
        with ResultCard("Success!", success=True):
            ui.label("Operation completed successfully.")
    """
    
    def __init__(
        self,
        title: str,
        success: bool = True,
        classes: str = "",
    ):
        self._title = title
        self._success = success
        self._classes = classes
        self._container: Optional[Any] = None
    
    def classes(self, add: Optional[str] = None, *, remove: Optional[str] = None, replace: Optional[str] = None) -> "ResultCard":
        """
        Apply CSS classes to the card container.
        Matches NiceGUI's Element.classes() signature.
        """
        if add:
            self._classes = f"{self._classes} {add}".strip()
        return self
    
    def __enter__(self):
        theme = get_theme()
        c = theme.colors
        
        border_color = c.success if self._success else c.danger
        
        container = ui.card().classes(f"dc-card {self._classes}").style(
            f"background-color: {c.bg_secondary}; "
            f"border: 1px solid {border_color}; "
            f"border-radius: 0.5rem; "
            f"padding: 1rem;"
        )
        self._container = container
        container.__enter__()
        
        with ui.row().classes("items-center gap-2"):
            icon = "check_circle" if self._success else "error"
            color = c.success if self._success else c.danger
            ui.icon(icon).style(f"color: {color}; font-size: 1.5rem;")
            ui.label(self._title).classes("text-lg font-semibold").style(f"color: {c.text_primary};")
        
        return self._container
    
    def __exit__(self, *args):
        if self._container is not None:
            self._container.__exit__(*args)


class LoadingSpinner:
    """
    A loading spinner with optional message.
    
    Example:
        spinner = LoadingSpinner("Loading data...")
        spinner.show()
        # ... do work ...
        spinner.hide()
    """
    
    def __init__(self, message: str = "Loading..."):
        self._message = message
        self._container = None
    
    def show(self) -> ui.column:
        theme = get_theme()
        c = theme.colors
        
        self._container = ui.column().classes("items-center justify-center gap-4 p-4")
        with self._container:
            ui.spinner(size="lg").style(f"color: {c.primary};")
            if self._message:
                ui.label(self._message).style(f"color: {c.text_secondary};")
        
        return self._container
    
    def hide(self):
        if self._container:
            self._container.delete()
            self._container = None
