---
name: iwp-stage-router
description: Route current work to the correct IWP stage and enforce stage boundaries. Invoke before any IWP task or when stage ownership is unclear.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: iwp
---

## What I do

- Detect the active stage from artifacts and task intent.
- Enforce one active stage at a time.
- Block cross-stage edits and route to the correct stage.

## How to use

1. Read `.iwp-lint.yaml` to resolve roots and presets.
2. Check session state and latest diff/reconcile artifacts.
3. Decide Stage 1, 2, 3, or 4.
4. Output stage choice and boundary constraints before implementation.

## Routing rules

- Stage 1: change `.iw` intent.
- Stage 2: change `_ir` code and tests only.
- Stage 3: change `@iwp.link` only.
- Stage 4: reverse review output only.

## Guardrails

- Do not edit `.iwp/compiled/**`.
- Do not guess node ids.
- If artifact signals conflict, report unresolved items explicitly.
