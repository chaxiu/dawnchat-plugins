# DawnChat Desktop Hello World Rules

## Scope

These rules apply to this template directory only.

## Goals

- Keep this template minimal, readable, and easy to evolve.
- Align `InstructWare.iw`, `_ir`, and runtime behavior with low complexity.
- Avoid unnecessary abstractions in a hello-world baseline.

## Required Reading

- `README.md`
- `.iwp-lint.yaml`
- `InstructWare.iw/system.md`
- `InstructWare.iw/views/pages/home.md`
- `InstructWare.iw/logic/tools/hello_world.md`
- `.opencode/skills/README.md`

## Guardrails

- Keep behavior changes small and verifiable.
- Resolve paths and presets from `.iwp-lint.yaml` before IWP actions.
- Use `dawnchat_iwp` MCP tools for IWP build/lint actions.
- Do not edit `.iwp/compiled/**` manually.
- Do not guess `node_id`; use session artifacts.
- Keep `manifest.json` runtime and preview config aligned with actual files.

## IWP Stage Contract

- Stage 1: `.iw` intent updates only.
- Stage 2: `_ir` implementation updates only.
- Stage 3: `@iwp.link` alignment only.
- Stage 4: reverse review output only.

## Verification

- Run focused checks for changed files.
- Keep API output stable and user-readable.
- Include a short manual verification checklist in delivery notes.
