---
name: assistant-wait-resume-handoff
description: Handle DawnChat Assistant continuation boundaries after explicit resume, especially when continuation_hint.pending_wait exists. Use when a resumed workspace must continue from flow.wait, runtime_event observation, or session.wait instead of replaying old steps.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: wait-resume-handoff
---

# Wait/Resume Handoff

## What I do

- Interpret `continuation_hint` after an explicit `assistant.workspace.resume`.
- Continue from the current wait boundary instead of replaying completed setup steps.
- Prefer `dawnchat.ui.session.wait` when the next move depends on a runtime event.

## When to use

- Use after a successful `assistant.workspace.resume`.
- Use when `continuation_hint.pending_wait` exists.
- Use when the caller is unsure whether to wait, continue, or start a fresh session.
- Do not use for normal single-step page mutations with no recovery context.

## Rules

- Never auto-resume only because a checkpoint exists.
- Only act after an explicit `assistant.workspace.resume`.
- Treat `continuation_hint.last_completed_step_index` as a progress hint, not as permission to replay everything.
- If `continuation_hint.pending_wait` exists and the next move depends on a runtime signal, prefer `dawnchat.ui.session.wait`.
- Use `since_seq=continuation_hint.event_cursor_seq` when waiting on runtime events after resume.
- Re-send setup steps only when the current page state clearly requires them.

## Recommended flow

1. Read current state with `assistant.view.describe`.
2. Read latest checkpoint metadata with `assistant.workspace.checkpoint.describe` if not already available.
3. Call `assistant.workspace.resume` explicitly.
4. Read:
   - `continuation_hint.pending_wait`
   - `continuation_hint.event_cursor_seq`
   - `continuation_hint.last_completed_step_index`
5. Branch:
   - if `pending_wait` exists and next move depends on an event, call `dawnchat.ui.session.wait`
   - if `pending_wait` is null but restored state is sufficient, plan the next minimal session or direct capability invoke
   - if current task intent conflicts with restored state, stop and re-plan instead of replaying stale steps

## `session.wait` pattern

Use:

```json
{
  "session_id": "<restored-or-active-session-id>",
  "wait_for": "runtime_event",
  "event_types": ["<event-type>"],
  "since_seq": "<continuation_hint.event_cursor_seq>",
  "timeout_ms": 30000
}
```

When `pending_wait.match` exists, carry it into the wait call instead of broad waiting.

## Output contract

- Return whether the resumed workspace should:
  - wait
  - continue with a short new session
  - ignore stale recovery state and re-plan
- Return the exact next MCP call to make.
- Return which earlier setup steps were treated as already completed.

## Checklist

- Resume was explicit, not automatic.
- `continuation_hint` was read before any new plan.
- `session.wait` was preferred when the boundary is event-driven.
- No blind replay of obviously completed setup steps.
