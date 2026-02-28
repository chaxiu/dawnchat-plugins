# DawnChat Shared Plugin Rules

These rules are shared across all DawnChat plugins in development mode.

## Scope

- Applies to plugin source workspaces under the DawnChat host app.
- Works together with plugin-local `AGENTS.md` and `.opencode/context/*.md`.

## Guardrails

- Keep `manifest.json` fields aligned with actual runtime behavior.
- Prefer minimal and verifiable code changes.
- Do not change plugin `id` unless explicitly requested.
- Keep backend handlers and frontend contracts in sync.

## Validation

- Run focused tests for modified plugin paths.
- Provide a short manual verification checklist for preview mode.
