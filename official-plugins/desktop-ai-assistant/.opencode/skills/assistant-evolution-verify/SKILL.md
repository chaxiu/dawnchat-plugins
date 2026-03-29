---
name: assistant-evolution-verify
description: Run mandatory MVP verification gates for DawnChat Assistant capability evolution.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: verification
---

## What I do

- Enforce frontend and backend verification commands.
- Validate capability discovery and invocation after code changes.
- Produce pass/fail status for each gate.

## Mandatory Gates

- Frontend:
  - `pnpm run typecheck`
  - `pnpm run test:unit`
  - `pnpm run build`
- Backend:
  - `bun run typecheck`
  - `bun run test:unit`
- Runtime:
  - read runtime info
  - refresh runtime when needed
  - restart dev session when refresh does not recover
  - list capabilities
  - invoke at least one affected capability

## Output Contract

- Return gate results matrix.
- Return blocking issues and exact failing gate.

## Checklist

- No delivery without passing mandatory gates.
- Runtime capability checks match changed scope.
