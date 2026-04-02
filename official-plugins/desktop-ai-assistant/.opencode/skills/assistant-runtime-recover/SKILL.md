---
name: assistant-runtime-recover
description: Execute runtime recovery sequence for DawnChat Assistant plugin when HMR view is stale.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: runtime-recover
---

## What I do

- Execute ordered recovery: info -> capabilities.list -> refresh -> verify -> restart -> verify.
- Use `dawnchat.ui.runtime.restart` only when refresh cannot recover.
- Re-check capabilities and one invoke after recovery.
- If recovery reveals resumable state, inspect checkpoint metadata before deciding whether to continue or ignore it.

## Mandatory Sequence

1. `dawnchat.ui.runtime.info`
2. `dawnchat.ui.capabilities.list`
3. `dawnchat.ui.runtime.refresh`
4. If still stale, `dawnchat.ui.runtime.restart`
5. Poll task completion and re-run capability checks
6. If recoverable workspace state exists, inspect `assistant.workspace.checkpoint.describe` before any explicit resume

## Output Contract

- Return executed actions with timestamps.
- Return whether recovery succeeded and at which step.
- Return unresolved blocker if recovery failed.
