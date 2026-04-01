---
name: assistant-session-narration
description: Compose and validate DawnChat session.start payloads for plugin-controlled step execution, host session lifecycle, and host voice bridge usage.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: session-step-autonomy
---

## What I do

- Build `dawnchat.ui.session.start` payloads with ordered `steps`.
- Keep `steps[].action` as plugin-owned payload and avoid host-side interpretation.
- Use host session lifecycle controls (`start/status/stop`) for orchestration.
- Use plugin-side host voice bridge when step needs speech.
- Reuse the current view-first runtime instead of inventing new page control paths.

## Rules

- Use host tools for session orchestration:
  - `dawnchat.ui.session.start`
  - `dawnchat.ui.session.status`
- Before planning a view-aware session, inspect current page state with:
  - `dawnchat.ui.capability.invoke(function=assistant.view.describe)`
- If `assistant.view.describe` reports `resume_available=true`, treat it as recoverable metadata only.
- Only call `assistant.workspace.resume` when the current task explicitly intends to continue the previous workspace.
- After a successful resume, inspect `continuation_hint` before composing any new `session.start`.
- `dawnchat.ui.session.start` payload does not include `idempotency_key`.
- Do not include `steps[].narration`; narration/voice instructions belong in `action.payload`.
- Do not require host/runtime layers to parse `steps[].action.payload` internals.
- When a running session exists for the same plugin, treat `session_busy` as expected and query `session.status` or call `session.stop`.
- If action details evolve, update plugin capability handlers only.
- Treat `view.*` and `guide.*` as step action namespaces, not top-level capability names.
- Get the registered view list, anchors, route entry, resource contract, and view capability contract from `assistant.view.describe`.
- The current guide action implementations live in `_ir/frontend/web-src/src/runtime/guideRuntime.ts`.
- The current guide card types live in `_ir/frontend/web-src/src/cards/registry.ts`.

## Recommended Flow

- For page-first tasks:
  - call `dawnchat.ui.capabilities.list`
  - call `dawnchat.ui.capability.invoke(function=assistant.view.describe)`
  - if the response contains checkpoint metadata, decide whether the current task should ignore it or explicitly resume it
  - if resume succeeds, use `continuation_hint` to decide whether to continue from a wait boundary or plan a fresh sequence
  - decide whether the task needs direct `view.*` actions or a host-managed `session.start`
- For narrated walkthroughs:
  - use `view.open` to enter the page
  - use `view.focus` or `view.capability.invoke` to manipulate the page
  - use `guide.card.show`, `guide.tip.show`, or `guide.narrate` only for guide expression
- When an error occurs:
  - read `error_code`
  - re-check `assistant.view.describe` if page state may have changed
  - re-check `session.status` when the failure happened inside a running session
  - if the failure happened after refresh/restart, inspect `assistant.workspace.checkpoint.describe` before retrying

## Output Contract

- Return a ready-to-send `session.start` JSON payload.
- Return optional voice script summary in step order from `action.payload`.
- Return the expected lifecycle strategy (`start -> status -> stop` when interruption is needed).

## Checklist

- Every step has `action.type`.
- `action.payload` remains an object and is treated as plugin-owned.
- If a step needs voice, voice fields are inside `action.payload` and executed by plugin runtime.
- If the task depends on page structure, base the step plan on `assistant.view.describe` instead of guessing anchors or capability input.
- If a recoverable checkpoint exists, keep resume explicit and do not let stale state override a new task plan.
- If `continuation_hint.pending_wait` exists, avoid replaying the entire earlier session and prefer a short continuation session around the pending wait.
- If `continuation_hint.last_completed_step_index` exists, treat it as a progress hint and avoid blindly re-sending obviously completed setup steps.
