# DawnChat Assistant Operating Contract

## Scope

These rules apply to the `desktop-ai-assistant` template workspace only.

## Mission

- Build a self-evolving DawnChat Assistant plugin template for broad desktop use cases.
- Keep Q&A quality strong by default while supporting task execution and automation needs.
- Expand capabilities through safe code evolution when existing functions cannot satisfy requests.
- Keep outputs concise, accurate, and directly actionable.

## Operating Modes

- Capability-First Mode: reuse existing UI capabilities first.
- Self-Evolving Mode: add or update capability code only when required.

## Mandatory MCP Call Sequence

- Always call `dawnchat.ui.runtime.info` before making runtime recovery decisions.
- Always call `dawnchat.ui.capabilities.list` before invoking UI functions.
- Invoke UI functions only via `dawnchat.ui.capability.invoke`.
- Never assume function names or payload fields without listing current capabilities.

## Runtime Recovery Policy

- Runtime mode is usually HMR preview, not full production build mode.
- If UI does not reflect recent code edits, execute this fixed sequence:
  1. call `dawnchat.ui.runtime.info`
  2. call `dawnchat.ui.capabilities.list`
  3. call `dawnchat.ui.runtime.refresh`
  4. if still stale, call `dawnchat.ui.runtime.restart` (dev-session restart)
  5. verify `python_sidecar.state=running` in runtime info when Python MCP is required
  6. re-run capabilities list and one capability invoke for verification
- Do not default to full rebuild before running the recovery sequence above.

## Capability Rules

- Capability names should be stable and namespaced.
- Every capability must expose a clear `input_schema`.
- Capability handlers must return structured result payloads with explicit success/failure.
- Newly added capabilities must become discoverable through `capabilities.list` immediately after HMR.

## Evolution Guardrails (MVP)

- Allowed edit scope:
  - `_ir/frontend/web-src/src/**`
  - `_ir/frontend/web-src/package.json`
  - `_ir/backend/**`
  - `_ir/python/**`
- Keep architecture clean: no temporary wrappers, no duplicated orchestration paths.
- Do not alter host-level routing/protocol contracts from this plugin workspace.

## Execution Policy

- For Rich Display tasks:
  - first list capabilities
  - then invoke selected capability with validated payload
- For Self-Evolving tasks:
  - update code minimally
  - install dependencies only when needed
  - register new capability with schema and handler
  - re-run capability listing to confirm discoverability
  - prefer backward-compatible payload changes when possible

## Prompt and Rules Policy

- This plugin relies on workspace-scoped `AGENTS.md` and `.opencode/skills`.
- Shared host rules may be excluded by manifest policy.
- Keep this document and skill docs aligned with actual capability behavior.
- Python sidecar MCP is available via host-injected `dawnchat_plugin_python`.
- Always validate sidecar runtime state before relying on Python tool calls.
- Keep role framing aligned with DawnChat Assistant, not a narrow single-domain persona.

## Media Policy

- Do not pass local absolute paths to iframe UI as render source.
- Use web-accessible URLs or brokered asset references for media rendering.

## Verification

- Minimum verification before delivery:
  - frontend `typecheck`
  - frontend `test:unit`
  - frontend `build`
  - backend `typecheck`
  - backend `test:unit`
- Verify at least one end-to-end capability flow:
  - list capabilities
  - invoke one capability
  - confirm expected UI result

## Delivery Checklist

- Updated or added capabilities are discoverable and documented.
- Payload schemas match runtime behavior.
- Test and build commands pass for changed scope.
- Notes include what was changed, what was verified, and remaining risks.
