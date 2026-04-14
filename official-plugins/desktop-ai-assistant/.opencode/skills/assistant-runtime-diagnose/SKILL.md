---
name: assistant-runtime-diagnose
description: Diagnose DawnChat Assistant runtime mode and freshness before deciding refresh or restart actions.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: runtime-diagnose
---

## What I do

- Call `dawnchat.ui.runtime.info` to inspect preview/runtime status.
- Determine whether current issue is stale HMR view, bridge issue, or backend unready.
- Produce deterministic next action: continue, refresh, or restart.

## Mandatory Rules

- Obtain **`plugin_id` before** calling `dawnchat.ui.runtime.info`: in this workspace, default to **`manifest.json` → `id`**. Host-injected session ids override when the host defines the active plugin.
- Never call `runtime.info` without `plugin_id`; the host rejects the call (`missing_plugin_id`). `runtime.info` is a **double check**, not a way to learn `plugin_id`.
- Never assume build mode when runtime info reports preview/HMR mode.
- Prefer `runtime.refresh` before `runtime.restart`.
- Keep diagnosis concise and grounded in returned runtime fields.

## Output Contract

- Return runtime summary (`preview`, `runtime`, `mcp_endpoint`, `environment`).
- Return recommended action (`none` / `refresh` / `restart_dev_session`).
- Return one short rationale tied to runtime signals.
- Return the **`plugin_id`** used for this diagnosis (same as `manifest.json` → `id` unless host-overridden) so downstream skills reuse **one** canonical value—do not treat `runtime.info` as the source of truth for discovering ids.
