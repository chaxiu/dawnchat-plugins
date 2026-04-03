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
  - `dawnchat.ui.event.wait`
  - `dawnchat.ui.session.wait_for_end`
- Before planning a view-aware session, inspect current page state with:
  - `dawnchat.ui.capability.invoke(function=assistant.view.describe)`
- If `assistant.view.describe` reports `continuation.pending_wait`, treat it as lightweight continuation metadata only.
- `dawnchat.ui.session.start` payload does not include `idempotency_key`.
- Do not include `steps[].narration`; narration/voice instructions belong in `action.payload`.
- Do not require host/runtime layers to parse `steps[].action.payload` internals.
- When a running session exists for the same plugin, treat `session_busy` as expected and query `session.status` or call `session.stop`.
- If action details evolve, update plugin capability handlers only.
- Treat `view.*` and `guide.*` as step action namespaces, not top-level capability names.
- Get the registered view list, anchors, route entry, resource contract, and view capability contract from `assistant.view.describe`.
- The current guide action implementations live in `_ir/frontend/web-src/src/runtime/guide/runtime.ts` and `_ir/frontend/web-src/src/runtime/guide/actions.ts`.
- The current guide card types live in `_ir/frontend/web-src/src/cards/registry.ts`.

## Recommended Flow

- Standard wait-aware template:
  - `dawnchat.ui.capabilities.list`
  - `assistant.view.describe`
  - `dawnchat.ui.session.start`
  - `dawnchat.ui.event.wait`
  - `dawnchat.ui.session.wait_for_end`
- Standard `view.capability.invoke` step payload:

```json
{
  "type": "view.capability.invoke",
  "payload": {
    "view_id": "tictactoe.main",
    "capability_id": "game.place_mark",
    "input": {
      "index": 6
    }
  }
}
```
- For page-first tasks:
  - call `dawnchat.ui.capabilities.list`
  - call `dawnchat.ui.capability.invoke(function=assistant.view.describe)`
  - if the response contains `continuation.pending_wait`, decide whether the current task should continue from that wait boundary or ignore it
  - if `continuation.pending_wait` exists, hand off to `assistant-wait-continuation-handoff`
  - otherwise use `continuation` to decide whether to continue from a wait boundary or plan a fresh sequence
  - decide whether the task needs direct `view.*` actions or a host-managed `session.start`
- For narrated walkthroughs:
  - use `view.open` to enter the page
  - use `view.focus` or `view.capability.invoke` to manipulate the page
  - use `guide.card.show`, `guide.tip.show`, or `guide.narrate` only for guide expression
  - when the next move depends on a runtime signal, prefer `dawnchat.ui.event.wait` over status polling
  - when the next move depends on the current session fully finishing, use `dawnchat.ui.session.wait_for_end`
  - if both the runtime event and session completion matter, make the `event.wait` observation window overlap with the user's action window instead of serializing `session.wait_for_end -> event.wait`
- When an error occurs:
  - read `error_code`
  - re-check `assistant.view.describe` if page state may have changed
  - re-check `session.status` when the failure happened inside a running session
  - if the failure happened after refresh/restart, inspect `assistant.view.describe` and `dawnchat.ui.session.status` before retrying

## Output Contract

- Return a ready-to-send `session.start` JSON payload.
- Return optional voice script summary in step order from `action.payload`.
- Return the expected lifecycle strategy (`start -> event.wait -> session.wait_for_end` when applicable, plus `status/stop` only when needed).

## Checklist

- Every step has `action.type`.
- `action.payload` remains an object and is treated as plugin-owned.
- `view.capability.invoke` uses `capability_id` and wraps business parameters inside `input`.
- If a step needs voice, voice fields are inside `action.payload` and executed by plugin runtime.
- If the task depends on page structure, base the step plan on `assistant.view.describe` instead of guessing anchors or capability input.
- Do not let stale continuation state override a new task plan.
- If `continuation.pending_wait` exists, avoid replaying the entire earlier session and prefer a short continuation session around the pending wait.
- If `continuation.last_completed_step_index` exists, treat it as a progress hint and avoid blindly re-sending obviously completed setup steps.
- Do not reintroduce `tail_wait` or the removed `dawnchat.ui.session.wait` API in new plans.
