from typing import Any

from app.mcp.tools.echo import build_echo_tool


def build_mcp_components(manifest: dict[str, Any], plugin_id: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    manifest_tools = list(manifest.get("capabilities", {}).get("tools", []))
    echo_tool_definition, echo_tool_handler = build_echo_tool(plugin_id)
    if not manifest_tools:
        manifest_tools = [echo_tool_definition]
    return manifest_tools, {"assistant.python.echo": echo_tool_handler}
