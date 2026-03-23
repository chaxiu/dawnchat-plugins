---
name: hello-iwp-delivery
description: Deliver IWP-driven updates for desktop-hello-world across intent, code, and links. Invoke when implementing or repairing behavior tied to InstructWare.iw.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: iwp
---

## What I do

- Keep `.iw` intent and `_ir` behavior aligned for changed scope.
- Apply strict Stage 1-4 separation for safer iteration.
- Ensure link alignment is artifact-driven and local to changed boundaries.

## Workflow

1. Resolve roots and presets from `.iwp-lint.yaml`.
2. Stage 1 updates `.iw` only.
3. Stage 2 updates `_ir` only and keeps net `@iwp.link` unchanged.
4. Stage 3 aligns links using session artifacts.
5. Stage 4 emits reverse review output only.

## Hello-world specifics

- Backend entry is `_ir/backend/entry/main.ts`.
- Frontend source root is `_ir/frontend/web-src`.
- Keep endpoints and page behavior simple and explicit.

## Exit checklist

- Changed intent nodes are implemented in runtime behavior.
- Link updates are colocated and scoped to changed code.
- Validation for changed paths is complete.
