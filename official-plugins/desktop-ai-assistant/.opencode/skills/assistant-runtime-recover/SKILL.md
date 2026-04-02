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
- If recovery reveals stale UI state, inspect `assistant.view.describe` before deciding whether to continue, wait, or ignore prior runtime context.

## Mandatory Sequence

1. `dawnchat.ui.runtime.info`
2. `dawnchat.ui.capabilities.list`
3. `dawnchat.ui.runtime.refresh`
4. If still stale, `dawnchat.ui.runtime.restart`
5. Poll task completion and re-run capability checks
6. If continuation-aware runtime state may matter, inspect `assistant.view.describe` before any follow-up wait or fresh session plan

## Output Contract

- Return executed actions with timestamps.
- Return whether recovery succeeded and at which step.
- Return unresolved blocker if recovery failed.
