---
name: assistant-evolution-implement
description: Implement new DawnChat Assistant UI capabilities when discovery shows a capability gap.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: evolution
---

## What I do

- Add or update Vue pages, view registrations, runtime capabilities, and describe surface code.
- Add dependencies only when necessary for current feature.
- Ensure new function is discoverable after hot reload.
- Keep Q&A scenarios first-class while enabling broader assistant tasks through evolution.

## Guardrails

- Allowed edit scope:
  - `_ir/frontend/web-src/src/**`
  - `_ir/frontend/web-src/package.json`
  - `_ir/backend/**`
- Keep naming stable and namespaced.
- Keep capability schema explicit and minimal.
- Prefer feature-local view registration and page files over growing shared monolithic registries.
- Do not reintroduce removed legacy direct card entrypoints.

## Output Contract

- Return changed files list.
- Return added/updated capability definitions or view contracts.
- Return migration notes for call sites if payload schema changed.

## Checklist

- New capability or view contract is registered in runtime.
- `assistant.view.describe` reflects the updated view contract when page semantics changed.
- Top-level capability appears in `dawnchat.ui.capabilities.list` after update when applicable.
