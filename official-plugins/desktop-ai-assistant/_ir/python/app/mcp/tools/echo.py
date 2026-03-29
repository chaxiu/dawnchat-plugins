from typing import Any


def build_echo_tool(plugin_id: str) -> tuple[dict[str, Any], Any]:
    tool_definition = {
        "name": "assistant.python.echo",
        "description": "Echo payload from python sidecar for runtime diagnostics",
        "inputSchema": {
            "type": "object",
            "properties": {
                "message": {"type": "string"},
            },
            "required": [],
        },
    }

    async def tool_handler(arguments: dict[str, Any]) -> dict[str, Any]:
        message = str(arguments.get("message") or "ok")
        return {
            "message": message,
            "plugin_id": plugin_id,
            "service": "python-sidecar",
        }

    return tool_definition, tool_handler
