"""
v2_player overlay - Overlay widget components for video commentary.

This module provides overlay widget components that display during video playback:
- ExplainCard: Shows structured explanation with TLDR and bullet points
- QACard: Interactive Q&A with multiple choice options
- GraphCard: Concept relationship graph (future)
- MindmapCard: Hierarchical mindmap (future)
- StepsCard: Step-by-step guide (future)

The actual rendering is handled by JavaScript in player_page.py, but this module
provides Python-side utilities for building widget HTML and data structures.

Usage:
    from ui.v2_player.overlay import build_explain_card_html, build_qa_card_html
    
    html = build_explain_card_html(widget)
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from storage.v2_player import WidgetPayload


def escape_html(text: str) -> str:
    """Escape HTML special characters."""
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def build_explain_card_html(widget: WidgetPayload) -> str:
    """
    Build HTML for an ExplainCard widget.
    
    Args:
        widget: WidgetPayload with widget_type="explain_card"
    
    Returns:
        HTML string for the explain card
    """
    if not widget or widget.widget_type != "explain_card":
        return ""
    
    html_parts = ['<div class="v2-overlay-card">']
    
    if widget.title:
        html_parts.append(
            f'<div class="v2-overlay-title">{escape_html(widget.title)}</div>'
        )
    
    body = widget.body or {}
    
    if body.get("tldr"):
        html_parts.append(
            f'<div class="v2-overlay-tldr">{escape_html(body["tldr"])}</div>'
        )
    
    bullets = body.get("bullets", [])
    if bullets and isinstance(bullets, list):
        html_parts.append('<ul class="v2-overlay-bullets">')
        for bullet in bullets:
            html_parts.append(f'<li>{escape_html(str(bullet))}</li>')
        html_parts.append('</ul>')
    
    html_parts.append('</div>')
    
    return "".join(html_parts)


def build_qa_card_html(
    widget: WidgetPayload,
    *,
    controller_name: str = "v2PlayerController",
) -> str:
    """
    Build HTML for a QACard widget.
    
    Args:
        widget: WidgetPayload with widget_type="qa_card"
        controller_name: JavaScript controller name for click handling
    
    Returns:
        HTML string for the QA card
    """
    if not widget or widget.widget_type != "qa_card":
        return ""
    
    body = widget.body or {}
    question = body.get("question", "")
    options = body.get("options", [])
    answer = body.get("answer", 0)
    
    if not question or not options:
        return ""
    
    html_parts = ['<div class="v2-overlay-card v2-qa-card">']
    
    html_parts.append(
        f'<div class="v2-qa-question">{escape_html(question)}</div>'
    )
    
    html_parts.append('<div class="v2-qa-options">')
    for idx, opt in enumerate(options):
        html_parts.append(
            f'<div class="v2-qa-option" data-idx="{idx}" data-answer="{answer}" '
            f'onclick="{controller_name}.checkQAAnswer(this, {idx}, {answer})">'
            f'{escape_html(str(opt))}'
            f'</div>'
        )
    html_parts.append('</div>')
    
    html_parts.append('</div>')
    
    return "".join(html_parts)


def build_widget_html(
    widget: WidgetPayload,
    *,
    controller_name: str = "v2PlayerController",
) -> str:
    """
    Build HTML for any widget type.
    
    Args:
        widget: WidgetPayload object
        controller_name: JavaScript controller name for interactive widgets
    
    Returns:
        HTML string for the widget
    """
    if not widget:
        return ""
    
    if widget.widget_type == "explain_card":
        return build_explain_card_html(widget)
    elif widget.widget_type == "qa_card":
        return build_qa_card_html(widget, controller_name=controller_name)
    elif widget.widget_type == "graph":
        return build_graph_card_html(widget)
    elif widget.widget_type == "mindmap":
        return build_mindmap_card_html(widget)
    elif widget.widget_type == "steps_card":
        return build_steps_card_html(widget)
    else:
        # Unknown widget type, show as simple card
        return build_simple_card_html(widget)


def build_simple_card_html(widget: WidgetPayload) -> str:
    """
    Build HTML for a simple card widget (fallback).
    
    Args:
        widget: WidgetPayload object
    
    Returns:
        HTML string for a simple card
    """
    if not widget:
        return ""
    
    html_parts = ['<div class="v2-overlay-card">']
    
    if widget.title:
        html_parts.append(
            f'<div class="v2-overlay-title">{escape_html(widget.title)}</div>'
        )
    
    body = widget.body or {}
    if isinstance(body, dict):
        # Show body content as text
        content = body.get("content") or body.get("text") or ""
        if content:
            html_parts.append(
                f'<div class="v2-overlay-body">{escape_html(str(content))}</div>'
            )
    
    html_parts.append('</div>')
    
    return "".join(html_parts)


def build_graph_card_html(widget: WidgetPayload) -> str:
    """
    Build HTML for a concept graph widget.
    
    Note: Full implementation requires a graph visualization library.
    This provides a basic placeholder.
    
    Args:
        widget: WidgetPayload with widget_type="graph"
    
    Returns:
        HTML string for the graph card
    """
    if not widget or widget.widget_type != "graph":
        return ""
    
    html_parts = ['<div class="v2-overlay-card">']
    
    if widget.title:
        html_parts.append(
            f'<div class="v2-overlay-title">{escape_html(widget.title)}</div>'
        )
    
    body = widget.body or {}
    nodes = body.get("nodes", [])
    
    # Basic text representation
    html_parts.append('<div class="v2-overlay-body">')
    if nodes:
        html_parts.append(f'<p>Concepts: {len(nodes)}</p>')
        for node in nodes[:5]:
            label = node.get("label") if isinstance(node, dict) else str(node)
            html_parts.append(f'<span style="margin-right:8px;">• {escape_html(label)}</span>')
    html_parts.append('</div>')
    
    html_parts.append('</div>')
    
    return "".join(html_parts)


def build_mindmap_card_html(widget: WidgetPayload) -> str:
    """
    Build HTML for a mindmap widget.
    
    Note: Full implementation requires a tree visualization.
    This provides a basic hierarchical list.
    
    Args:
        widget: WidgetPayload with widget_type="mindmap"
    
    Returns:
        HTML string for the mindmap card
    """
    if not widget or widget.widget_type != "mindmap":
        return ""
    
    html_parts = ['<div class="v2-overlay-card">']
    
    if widget.title:
        html_parts.append(
            f'<div class="v2-overlay-title">{escape_html(widget.title)}</div>'
        )
    
    body = widget.body or {}
    root = body.get("root", {})
    
    def render_node(node: Dict[str, Any], depth: int = 0) -> str:
        if not node:
            return ""
        
        label = node.get("label", "")
        children = node.get("children", [])
        
        indent = "  " * depth
        parts = [f'{indent}• {escape_html(label)}']
        
        for child in children[:5]:  # Limit children
            parts.append(render_node(child, depth + 1))
        
        return "<br>".join(parts)
    
    if root:
        html_parts.append(f'<div class="v2-overlay-body">{render_node(root)}</div>')
    
    html_parts.append('</div>')
    
    return "".join(html_parts)


def build_steps_card_html(widget: WidgetPayload) -> str:
    """
    Build HTML for a steps card widget.
    
    Args:
        widget: WidgetPayload with widget_type="steps_card"
    
    Returns:
        HTML string for the steps card
    """
    if not widget or widget.widget_type != "steps_card":
        return ""
    
    html_parts = ['<div class="v2-overlay-card">']
    
    if widget.title:
        html_parts.append(
            f'<div class="v2-overlay-title">{escape_html(widget.title)}</div>'
        )
    
    body = widget.body or {}
    steps = body.get("steps", [])
    
    if steps and isinstance(steps, list):
        html_parts.append('<ol class="v2-overlay-bullets" style="list-style:decimal;">')
        for step in steps:
            step_text = step.get("text") if isinstance(step, dict) else str(step)
            html_parts.append(f'<li>{escape_html(step_text)}</li>')
        html_parts.append('</ol>')
    
    html_parts.append('</div>')
    
    return "".join(html_parts)


def widget_from_dict(data: Dict[str, Any]) -> Optional[WidgetPayload]:
    """
    Create a WidgetPayload from a dictionary.
    
    Args:
        data: Dictionary with widget data
    
    Returns:
        WidgetPayload object or None if invalid
    """
    if not data or not isinstance(data, dict):
        return None
    
    widget_type = data.get("widget_type")
    if not widget_type:
        return None
    
    return WidgetPayload(
        widget_type=str(widget_type),
        title=str(data.get("title", "")),
        body=dict(data.get("body", {})),
    )

