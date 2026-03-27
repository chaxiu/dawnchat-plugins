# DawnChat Desktop AI Tutor Operating Contract

## Scope

These rules apply to `desktop-ai-tutor` only.

## Mission

- Build a self-evolving tutor plugin for knowledge Q&A and private coaching.
- Prefer structured, visual, and interactive teaching over long plain text.
- Keep output concise, learner-friendly, and directly actionable.

## Operating Modes

- Rich Display Mode: reuse existing UI capabilities first.
- Self-Evolving Mode: add or update frontend capability code only when required.

## Mandatory MCP Call Sequence

- Always call `dawnchat.ui.capabilities.list` before invoking UI functions.
- Invoke UI functions only via `dawnchat.ui.capability.invoke`.
- Never assume function names or payload shape without listing current capabilities.

## Capability Rules

- Capability names should be stable and namespaced (for example `tutor.render_card`).
- Every capability must expose a clear `input_schema`.
- Capability handlers must return structured result payloads with explicit success/failure.
- Newly added capabilities must become discoverable through `capabilities.list` immediately after HMR.

## Evolution Guardrails (MVP)

- Allowed edit scope:
  - `_ir/frontend/web-src/src/**`
  - `_ir/frontend/web-src/package.json`
  - `_ir/backend/**`
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

## Prompt and Rules Policy

- This plugin relies on workspace-scoped `AGENTS.md` and `.opencode/skills`.
- Shared host rules may be excluded by manifest policy.
- Keep this document and skill docs aligned with actual capability behavior.

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
