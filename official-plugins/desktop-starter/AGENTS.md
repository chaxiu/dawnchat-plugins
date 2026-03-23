# DawnChat Desktop Starter Rules

## Scope

These rules apply to this template directory only.

## Goals

- Keep `InstructWare.iw`, `_ir`, and runtime behavior aligned.
- Follow IWP stage boundaries to reduce drift.
- Prefer minimal, verifiable changes over broad rewrites.

## Required Reading

- `README.md`
- `.iwp-lint.yaml`
- `InstructWare.iw/system.md`
- `InstructWare.iw/views/pages/home.md`
- `InstructWare.iw/logic/tools/hello_world.md`
- `.opencode/skills/README.md`

## Stage Contract

- Stage 1: edit `.iw` intent only.
- Stage 2: implement `_ir` behavior only, no net `@iwp.link` edits.
- Stage 3: align `@iwp.link` near changed code boundaries.
- Stage 4: reverse review only, no source edits.

## Runtime Guardrails

- Resolve paths and presets from `.iwp-lint.yaml` before decisions.
- Use `dawnchat_iwp` MCP tools for IWP build/lint actions.
- Do not edit `.iwp/compiled/**` manually.
- Do not guess `node_id`; use session artifacts.
- Keep `manifest.json` runtime and preview paths consistent with actual structure.

## Verification

- Run focused IWP checks after relevant stages.
- Run frontend or backend validation for changed runtime code.
- Provide a concise manual verification checklist in delivery notes.
