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
- Normalize function names, schema, and usage notes into a capability map.
- Distinguish top-level capability names from plugin-internal step action namespaces.
- Point downstream skills to `assistant.view.describe` when page semantics or runtime observation fields matter.
- Flag missing capabilities for self-evolution path.

## Mandatory Rules

- Read `dawnchat.ui.runtime.info` first when runtime freshness is uncertain.
- Never invoke any Assistant UI function before capability list succeeds.
- Never infer payload fields that are absent from schema.
- Keep a deterministic capability summary for downstream skills.
- Treat `dawnchat.ui.capabilities.list` as the source of top-level capability names only.
- Do not treat `view.*` or `guide.*` as top-level MCP capabilities; they are session step namespaces.
- When the task depends on page semantics, anchors, resource state, task progress, or continuation state, recommend `assistant.view.describe`.

## Output Contract

- Return `capability_map` keyed by function name.
- Return `recommended_function` list for current request.
- Return `follow_up_surface` suggestions when the task needs:
  - `assistant.view.describe`
  - `dawnchat.ui.session.wait`
- Return `capability_gap` when requirements are not covered.

## Checklist

- Capability list was fetched in current session.
- Every planned invoke has schema-backed payload fields.
- Top-level capabilities are not confused with session step namespaces.
