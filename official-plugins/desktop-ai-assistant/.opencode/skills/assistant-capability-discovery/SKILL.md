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
- Flag missing capabilities for self-evolution path.

## Mandatory Rules

- Read `dawnchat.ui.runtime.info` first when runtime freshness is uncertain.
- Never invoke any Assistant UI function before capability list succeeds.
- Never infer payload fields that are absent from schema.
- Keep a deterministic capability summary for downstream skills.

## Output Contract

- Return `capability_map` keyed by function name.
- Return `recommended_function` list for current request.
- Return `capability_gap` when requirements are not covered.

## Checklist

- Capability list was fetched in current session.
- Every planned invoke has schema-backed payload fields.
