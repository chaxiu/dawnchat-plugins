---
name: plugin-ui-refactor
description: Refactor Vue plugin UI while preserving plugin API compatibility
compatibility: opencode
---

## When to use

Use this skill when modifying `web-src/src/*` UI layout, styles, or interaction flows.

## Workflow

1. Identify current component and API dependencies.
2. Keep existing API contracts and query parameter behavior.
3. Make minimal UI changes with clear structure.
4. Provide quick verification steps (`pnpm build`, preview check).

## Do not

- Break existing API endpoints used by the frontend.
- Introduce large architectural rewrites in this demo plugin.
