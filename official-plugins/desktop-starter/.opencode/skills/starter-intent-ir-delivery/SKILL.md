---
name: starter-intent-ir-delivery
description: Deliver IWP-driven intent and runtime updates for desktop-starter. Invoke when implementing features or fixes tied to InstructWare.iw and _ir.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: delivery
---

## What I do

- Map requested behavior to `InstructWare.iw` and `_ir` ownership.
- Keep `views -> logic -> state/models` boundaries clear.
- Keep `manifest.json` runtime and preview paths aligned with code layout.

## Workflow

1. Confirm stage with `iwp-stage-router`.
2. Stage 1: update `.iw` files with schema-valid sections.
3. Stage 2: implement `_ir` behavior and tests without net `@iwp.link` edits.
4. Stage 3: align links near changed code using session artifacts.
5. Stage 4: produce reverse review output only.

## Desktop-starter specifics

- Frontend source root is `_ir/frontend/web-src`.
- Backend entry is `_ir/backend/entry/main.ts`.
- Prefer defaults in `src/models/**`, rendering logic in `src/logic/**`, and view wiring in `src/views/**`.

## Exit checklist

- Intent, code, and links are aligned for changed scope.
- No stage-boundary violations are introduced.
- Validation commands for changed scope have been executed.
