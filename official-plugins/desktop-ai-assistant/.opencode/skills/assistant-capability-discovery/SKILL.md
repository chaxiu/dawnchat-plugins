---
name: assistant-capability-discovery
description: Discover and normalize current DawnChat Assistant UI capabilities via MCP list operation before any invoke call.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: discovery
---

## What I do

- Call `dawnchat.ui.capabilities.list` for current plugin session.
- Normalize returned scene summaries and follow-up entrypoints into a deterministic feature map.
- Distinguish assistant-facing feature scenes from plugin-internal runtime step handlers.
- Point downstream skills to `assistant.view.describe` when page semantics, interaction hints, or runtime observation fields matter.
- Flag missing capabilities for self-evolution path.

## Mandatory Rules

- **Order:** Have a **`plugin_id`** first (`manifest.json` → `id` in `desktop-ai-assistant`, unless the host supplies another canonical id). Optionally call `dawnchat.ui.runtime.info` with that id when freshness is uncertain, then call `dawnchat.ui.capabilities.list`. Do **not** assume `runtime.info` can run without `plugin_id`.
- Never invoke any Assistant UI function before capability list succeeds (for discovery flows).
- Never infer payload fields that are absent from schema.
- Keep a deterministic capability summary for downstream skills.
- Treat `dawnchat.ui.capabilities.list` as the assistant feature-scene catalog, not as the raw runtime handler registry.
- Treat top-level `view.open` as the stable page entry capability returned by the current assistant contract.
- Do not treat `view.focus`, `guide.*`, or internal `assistant.session_step_*` handlers as scene catalog entries.
- **Require** `assistant.view.describe` after `view.open` when the plan includes **write** `view.capability.invoke` or `session.start` steps that depend on live page/state binding; **recommend** describe for read-only tasks that still need anchors or continuation. `assistant.view.list` does not replace describe for dynamic state.
- Treat `capabilities[].capability_id` as the external identifier for `view.capability.invoke`; keep it **outside** `input`, never nested inside `input`.
- Treat `capability_invoke_contract` as the lightweight packaging guide for `view_id + capability_id + input`.

## Output Contract

- Return `capability_map` keyed by scene id or follow-up function name.
- Return `recommended_function` list for current request.
- Return `follow_up_surface` suggestions when the task needs:
  - `assistant.view.describe`
  - `dawnchat.ui.event.wait`
  - `dawnchat.ui.session.wait_for_end`
- Return `capability_gap` when requirements are not covered.

## Checklist

- Capability list was fetched in current session.
- Every planned invoke has schema-backed payload fields.
- Assistant-facing scenes are not confused with internal session step namespaces.

## Standard example

For a wait-aware guided task, the default follow-up sequence should usually be:

1. Resolve `plugin_id` from `manifest.json` → `id` (or host); optionally `dawnchat.ui.runtime.info` with that id.
2. `dawnchat.ui.capabilities.list`
3. `view.open`
4. `assistant.view.describe` (**before** writes / state-dependent session steps)
5. `dawnchat.ui.session.start`
6. `dawnchat.ui.event.wait`
7. `dawnchat.ui.session.wait_for_end`

Short single-step tasks may stop earlier after `view.open` and use direct `view.capability.invoke` calls instead of `session.start`.
When they do, call `assistant.view.describe` first if the invoke is a **write**; prefer the exact `capability_id` returned by discovery/describe and keep **only** business fields inside `payload.input` (`capability_id` stays next to `input`, not inside it).
