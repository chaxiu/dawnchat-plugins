# Skill: assistant-python-sidecar-check

## Goal

Validate Python sidecar runtime availability before DawnChat Assistant Python MCP operations.

## Steps

1. Call `dawnchat.ui.runtime.info`.
2. Confirm `python_sidecar.state` is `running`.
3. Confirm `mcp_endpoints.python_sidecar.port` is present.
4. If unavailable, run `dawnchat.ui.runtime.restart`.
5. Re-check runtime info and continue only when sidecar is healthy.
