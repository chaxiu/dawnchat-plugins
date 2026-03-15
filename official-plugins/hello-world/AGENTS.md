# DawnChat Hello World Vue Rules

## Scope

These rules apply to the current plugin directory only.

## Goals

- Keep this plugin a clear reference implementation.
- Prefer small, verifiable changes over large refactors.
- Maintain compatibility between `manifest.json`, Python handlers, and frontend UI.

## Required Reading

- `README.md`
- `.opencode/context/plugin-architecture.md`
- `.opencode/context/dawnchat-plugin-rules.md`
- `.opencode/context/plugin-debug-logging.md`
- `.opencode/skills/README.md`

## Guardrails

- Do not change plugin `id` in `manifest.json`.
- Do not remove existing sample APIs under `/api/sdk/*` unless explicitly requested.
- Keep tool schemas and runtime handlers aligned.
- Add or update tests when changing MCP/tool behavior.
- Do not log secrets, tokens, or credentials; redact sensitive fields.
- Remove temporary noisy debug logs once root cause is confirmed.

## Verification

- Run backend tests for changed behavior.
- Ensure frontend can build when touching `web-src`.
- Provide a short manual verification checklist in responses.
