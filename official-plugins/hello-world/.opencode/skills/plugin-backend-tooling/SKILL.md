---
name: plugin-backend-tooling
description: Add or update DawnChat plugin backend tools and API handlers safely
compatibility: opencode
---

## When to use

Use this skill when changing `manifest.json`, MCP tool schemas, or Python tool handlers.

## Workflow

1. Update tool declaration in `manifest.json`.
2. Implement/update handler in `src/main.py`.
3. Keep response shape stable and explicit.
4. Update tests under `tests/`.

## Checklist

- Manifest schema aligns with runtime handler arguments.
- Error handling remains user-readable.
- Existing tool behavior is not unintentionally broken.
