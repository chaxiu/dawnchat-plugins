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
- For view-first tasks, call `dawnchat.ui.capability.invoke(function=assistant.view.describe)` after `capabilities.list` and before planning `view.*` or session actions.
- Treat `dawnchat.ui.capabilities.list` as the source of top-level capability names only.
- Treat `assistant.view.describe` as the source of registered view list, route entry, anchors, resource contract, current page snapshot, workspace snapshot, and recovery metadata.
- Treat `assistant.workspace.checkpoint.describe` as the source of the latest recoverable checkpoint summary.
- Use `assistant.workspace.resume` only with an explicit `resume_token`.
- Treat `continuation_hint` as recovery metadata for planning the next `dawnchat.ui.session.start`, not as an instruction to auto-replay old steps.
- Prefer direct capability invoke for single-step page reads or mutations; use session tools only when the task needs ordered multi-step guide/view orchestration.
- For guided narration flows, prefer host session tools:
  - `dawnchat.ui.session.start`
  - `dawnchat.ui.session.status`
  - `dawnchat.ui.session.stop`
  - `dawnchat.ui.session.wait`
- In session steps, keep voice/narration data inside `steps[].action.payload` only.
- Treat `steps[].action.payload` as opaque plugin payload and do not hardcode internal fields at host side.
- `dawnchat.ui.session.start` no longer uses `idempotency_key`.
- When `session_busy` is returned, query `session.status` or stop active session before starting a new one.

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
- `view.*` and `guide.*` are session step action namespaces, not top-level capability names returned by `capabilities.list`.
- Do not reintroduce legacy direct card capabilities such as `assistant.render_card` or `assistant.clear_cards`.
- Keep top-level capabilities small and stable. Put page-local mutations behind `view.capability.invoke` and expose page semantics through `assistant.view.describe`.
- Recoverable state must be discoverable without automatically taking over the current UI.
- The runtime bootstrap entry lives in `_ir/frontend/web-src/src/runtime/bootstrap.ts`.
- The current view registry lives in `_ir/frontend/web-src/src/runtime/viewRegistry.ts`.
- The current reference view registration lives in `_ir/frontend/web-src/src/views/pages/word/wordMainViewRegistration.ts`.
- The current guide action definitions live in `_ir/frontend/web-src/src/runtime/guideRuntime.ts`.
- The current guide card types live in `_ir/frontend/web-src/src/cards/registry.ts`.

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
  - then inspect page state with `assistant.view.describe` whenever the task depends on page semantics, anchors, or resource state
  - if checkpoint metadata exists, decide explicitly whether the current task should ignore it or resume it
  - then prefer a single direct capability invoke when one step is enough
  - switch to `session.start` only when the task needs ordered `view.* + guide.*` execution
- For View-First tasks:
  - inspect current page via `assistant.view.describe`
  - treat `resume_available` as optional recovery metadata, not as an automatic next step
  - use `assistant.workspace.checkpoint.describe` before any resume decision after refresh or restart
  - use `view.open` for page entry and resource binding
  - use `view.focus` for anchor changes
  - use `view.capability.invoke` for page-local mutations
  - use `guide.*` only for narration, tip, and overlay card expression
- For Explicit Resume tasks:
  - inspect current state via `assistant.view.describe`
  - inspect the latest checkpoint via `assistant.workspace.checkpoint.describe`
  - call `assistant.workspace.resume` only when the current task explicitly intends to continue the prior workspace
  - after a successful resume, read `continuation_hint` before planning any new session
  - if `continuation_hint.pending_wait` exists, prefer a short follow-up session around that wait boundary instead of replaying the whole prior sequence
  - when `continuation_hint.pending_wait` exists and the next move depends on a runtime signal, prefer `dawnchat.ui.session.wait` with `wait_for=runtime_event` and `since_seq=continuation_hint.event_cursor_seq`
  - if `continuation_hint.last_completed_step_index` exists, treat earlier steps as progress hints and avoid blindly re-sending obviously completed setup steps
  - do not auto-resume if a new task already has a clearer current-page intent
- For Self-Evolving tasks:
  - update code minimally
  - install dependencies only when needed
  - prefer new view registrations, page-local capabilities, or describe surface updates over adding broad top-level capabilities
  - register new capability with schema and handler only when page-local mutation cannot fit existing runtime structure
  - re-run capability listing to confirm discoverability
  - prefer backward-compatible payload changes when possible

## Prompt and Rules Policy

- This plugin relies on workspace-scoped `AGENTS.md` and `.opencode/skills`.
- Shared host rules may be excluded by manifest policy.
- Keep this document and skill docs aligned with actual capability behavior.
- Keep formal workflow skills and evaluation skills separate. Use evaluation skills only for self-check, trial, and acceptance verification.
- For brand new view work, prefer the dedicated `assistant-new-view-authoring` skill and keep `assistant-evolution-implement` as the broader evolution wrapper.
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
