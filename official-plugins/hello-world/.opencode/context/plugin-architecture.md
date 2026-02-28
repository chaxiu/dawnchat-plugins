# Plugin Architecture Quick Context

## Runtime Layout

- Python backend: `src/main.py`
- MCP integration: `src/mcp.py`
- Frontend source: `web-src/src/*`
- Frontend static output: `web/*` (built artifacts)

## Backend Patterns

- Register route handlers inside `create_app`.
- Keep tool handlers pure and deterministic when possible.
- Use `host` API from `dawnchat_sdk` for AI, tools, and storage.

## Frontend Patterns

- Keep API calls under `api/*` paths served by plugin backend.
- Preserve theme/lang behavior from query params.
- Avoid introducing framework-level complexity in this demo plugin.
