"""
DawnChat Plugin SDK - Adaptive Cards Builder

Provides a Pythonic interface for building Adaptive Cards.
"""

from typing import Optional, Any
from dataclasses import dataclass, field, asdict


@dataclass
class TextBlock:
    """
    A block of text in an Adaptive Card.
    
    Example:
        text = TextBlock("Hello World", size="large", weight="bolder")
    """
    
    text: str
    size: Optional[str] = None  # small, default, medium, large, extraLarge
    weight: Optional[str] = None  # lighter, default, bolder
    color: Optional[str] = None  # default, dark, light, accent, good, warning, attention
    wrap: bool = True
    
    def to_dict(self) -> dict:
        """Convert to Adaptive Card element dict."""
        result = {
            "type": "TextBlock",
            "text": self.text,
            "wrap": self.wrap,
        }
        if self.size:
            result["size"] = self.size
        if self.weight:
            result["weight"] = self.weight
        if self.color:
            result["color"] = self.color
        return result


@dataclass
class Image:
    """
    An image element in an Adaptive Card.
    
    Example:
        img = Image("https://example.com/logo.png", alt="Logo")
    """
    
    url: str
    alt: Optional[str] = None
    size: Optional[str] = None  # auto, stretch, small, medium, large
    
    def to_dict(self) -> dict:
        """Convert to Adaptive Card element dict."""
        result = {
            "type": "Image",
            "url": self.url,
        }
        if self.alt:
            result["altText"] = self.alt
        if self.size:
            result["size"] = self.size
        return result


@dataclass
class Container:
    """
    A container that groups elements.
    
    Example:
        container = Container([
            TextBlock("Title", size="large"),
            TextBlock("Description"),
        ])
    """
    
    items: list = field(default_factory=list)
    style: Optional[str] = None  # default, emphasis, good, attention, warning, accent
    
    def to_dict(self) -> dict:
        """Convert to Adaptive Card element dict."""
        result = {
            "type": "Container",
            "items": [
                item.to_dict() if hasattr(item, "to_dict") else item
                for item in self.items
            ],
        }
        if self.style:
            result["style"] = self.style
        return result


@dataclass
class ColumnSet:
    """
    A set of columns for horizontal layout.
    
    Example:
        columns = ColumnSet([
            Column([TextBlock("Left")]),
            Column([TextBlock("Right")]),
        ])
    """
    
    columns: list = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """Convert to Adaptive Card element dict."""
        return {
            "type": "ColumnSet",
            "columns": [
                col.to_dict() if hasattr(col, "to_dict") else col
                for col in self.columns
            ],
        }


@dataclass
class Column:
    """
    A column in a ColumnSet.
    
    Example:
        col = Column([TextBlock("Content")], width="auto")
    """
    
    items: list = field(default_factory=list)
    width: str = "auto"  # auto, stretch, or specific width
    
    def to_dict(self) -> dict:
        """Convert to Adaptive Card element dict."""
        return {
            "type": "Column",
            "width": self.width,
            "items": [
                item.to_dict() if hasattr(item, "to_dict") else item
                for item in self.items
            ],
        }


@dataclass
class FactSet:
    """
    A set of facts (key-value pairs) displayed in a formatted way.
    
    Example:
        facts = FactSet([
            ("Name", "John"),
            ("Age", "30"),
        ])
    """
    
    facts: list = field(default_factory=list)  # List of (title, value) tuples
    
    def to_dict(self) -> dict:
        """Convert to Adaptive Card element dict."""
        return {
            "type": "FactSet",
            "facts": [
                {"title": title, "value": value}
                for title, value in self.facts
            ],
        }


class Input:
    """Namespace for input elements."""
    
    @dataclass
    class Text:
        """
        A text input field.
        
        Example:
            name_input = Input.Text("name", label="Your Name")
        """
        
        id: str
        label: Optional[str] = None
        placeholder: Optional[str] = None
        is_multiline: bool = False
        max_length: Optional[int] = None
        
        def to_dict(self) -> dict:
            """Convert to Adaptive Card element dict."""
            result = {
                "type": "Input.Text",
                "id": self.id,
                "isMultiline": self.is_multiline,
            }
            if self.label:
                result["label"] = self.label
            if self.placeholder:
                result["placeholder"] = self.placeholder
            if self.max_length:
                result["maxLength"] = self.max_length
            return result
    
    @dataclass
    class Choice:
        """
        A choice input (dropdown/radio).
        
        Example:
            color = Input.Choice("color", choices=[
                ("Red", "red"),
                ("Blue", "blue"),
            ])
        """
        
        id: str
        choices: list = field(default_factory=list)  # List of (title, value) tuples
        label: Optional[str] = None
        is_compact: bool = True  # True for dropdown, False for expanded
        
        def to_dict(self) -> dict:
            """Convert to Adaptive Card element dict."""
            result = {
                "type": "Input.ChoiceSet",
                "id": self.id,
                "style": "compact" if self.is_compact else "expanded",
                "choices": [
                    {"title": title, "value": value}
                    for title, value in self.choices
                ],
            }
            if self.label:
                result["label"] = self.label
            return result


class Action:
    """Namespace for action elements."""
    
    @dataclass
    class Submit:
        """
        A submit button action.
        
        Example:
            btn = Action.Submit("Send", data={"action": "send"})
        """
        
        title: str
        data: dict = field(default_factory=dict)
        style: Optional[str] = None  # default, positive, destructive
        
        def to_dict(self) -> dict:
            """Convert to Adaptive Card action dict."""
            result = {
                "type": "Action.Submit",
                "title": self.title,
                "data": self.data,
            }
            if self.style:
                result["style"] = self.style
            return result
    
    @dataclass
    class OpenUrl:
        """
        An action that opens a URL.
        
        Example:
            link = Action.OpenUrl("Learn More", url="https://example.com")
        """
        
        title: str
        url: str
        
        def to_dict(self) -> dict:
            """Convert to Adaptive Card action dict."""
            return {
                "type": "Action.OpenUrl",
                "title": self.title,
                "url": self.url,
            }


@dataclass
class Card:
    """
    An Adaptive Card.
    
    Example:
        card = Card(
            body=[
                TextBlock("Hello World", size="large"),
            ],
            actions=[
                Action.Submit("OK", data={"action": "ok"}),
            ],
        )
    """
    
    body: list = field(default_factory=list)
    actions: list = field(default_factory=list)
    card_type: str = "message"  # message, page, modal
    version: str = "1.5"
    
    def to_dict(self) -> dict:
        """Convert to full Adaptive Card JSON."""
        return {
            "type": "AdaptiveCard",
            "version": self.version,
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "body": [
                item.to_dict() if hasattr(item, "to_dict") else item
                for item in self.body
            ],
            "actions": [
                action.to_dict() if hasattr(action, "to_dict") else action
                for action in self.actions
            ],
        }
    
    def to_response(self) -> dict:
        """
        Convert to a plugin response format.
        
        This is the format expected by the Host when returning a card.
        """
        return {
            "type": "card",
            "card_type": self.card_type,
            "card": self.to_dict(),
        }

