---
name: assistant-wait-continuation-handoff
description: Handle DawnChat Assistant continuation boundaries when `assistant.view.describe` exposes `continuation.pending_wait`. Use when current work should continue from `flow.wait`, runtime event observation, or decoupled wait primitives instead of replaying old setup steps.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: wait-continuation-handoff
---

# Wait/Continuation Handoff

## What I do

- Interpret `continuation` from `assistant.view.describe`.
- Continue from the current wait boundary instead of replaying completed setup steps.
- Prefer `dawnchat.ui.event.wait` when the next move depends on a runtime event.

## When to use

- Use when `assistant.view.describe` exposes `continuation.pending_wait`.
- Use when the caller is unsure whether to wait, continue, or start a fresh session.
- Do not use for normal single-step page mutations with no continuation context.

## Rules

- Never auto-replay only because continuation metadata exists.
- Treat `continuation.last_completed_step_index` as a progress hint, not as permission to replay everything.
- If `continuation.pending_wait` exists and the next move depends on a runtime signal, prefer `dawnchat.ui.event.wait`.
- Re-send setup steps only when the current page state clearly requires them.

## Recommended flow

1. Read current state with `assistant.view.describe`.
2. Read:
   - `continuation.pending_wait`
   - `continuation.last_completed_step_index`
3. Branch:
   - if `pending_wait` exists and next move depends on an event, call `dawnchat.ui.event.wait`
   - if the prior session must finish before the next action, call `dawnchat.ui.session.wait_for_end`
   - if `pending_wait` is null but current state is sufficient, plan the next minimal session or direct capability invoke
   - if current task intent conflicts with stale continuation, stop and re-plan instead of replaying old steps

When continuation is present, the normalized reference sequence is:

1. `assistant.view.describe`
2. `dawnchat.ui.event.wait` if the boundary is event-driven
3. `dawnchat.ui.session.wait_for_end` if the next action depends on the prior session actually ending
4. only then plan a short follow-up `dawnchat.ui.session.start` if more ordered work is still needed

## `event.wait` pattern

Use:

```json
{
  "event_types": ["assistant.guide.confirm.responded"],
  "match": {
    "confirm_id": "confirm-delete"
  },
  "timeout_ms": 30000
}
```

Use `session.wait_for_end` separately when the next move depends on the session becoming terminal:

```json
{
  "session_id": "<active-session-id>",
  "timeout_ms": 30000
}
```

## Output contract

- Return whether the current work should:
  - wait
  - continue with a short new session
  - ignore stale continuation state and re-plan
- Return the exact next MCP call to make.
- Return which earlier setup steps were treated as already completed.

## Checklist

- `assistant.view.describe` was read before any new plan.
- `event.wait` was preferred when the boundary is event-driven.
- No blind replay of obviously completed setup steps.
- Current task intent remained higher priority than stale continuation metadata.
