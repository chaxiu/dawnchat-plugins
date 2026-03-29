from dawnchat_sdk.mcp_router import build_mcp_router

from app.mcp.registry import build_mcp_components


def build_plugin_mcp_router(manifest: dict, plugin_id: str):
    tools, handlers = build_mcp_components(manifest, plugin_id)
    return build_mcp_router(tools, handlers)


__all__ = ["build_mcp_router", "build_plugin_mcp_router"]
