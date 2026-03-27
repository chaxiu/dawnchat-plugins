---
name: tutor-evolution-implement
description: Implement new tutor UI capabilities when discovery shows a capability gap.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: evolution
---

## What I do

- Add or update Vue card components and capability registration code.
- Add dependencies only when necessary for current feature.
- Ensure new function is discoverable after hot reload.

## Guardrails

- Allowed edit scope:
  - `_ir/frontend/web-src/src/**`
  - `_ir/frontend/web-src/package.json`
  - `_ir/backend/**`
- Keep naming stable and namespaced.
- Keep capability schema explicit and minimal.

## Output Contract

- Return changed files list.
- Return added/updated capability definitions.
- Return migration notes for call sites if payload schema changed.

## Checklist

- New capability is registered in runtime.
- Capability appears in `dawnchat.ui.capabilities.list` after update.
