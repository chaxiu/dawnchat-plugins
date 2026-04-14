---
name: assistant-rich-display-execution
description: Execute single-step DawnChat Assistant view-first interactions with existing capabilities only, using page introspection before action planning.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: rich-display
---

## What I do

- Inspect the current page with `assistant.view.describe` when page semantics matter.
- Choose the smallest existing capability path that satisfies the task.
- Keep interaction deterministic, schema compliant, and concise for the end user.

## Rules

- Use `dawnchat.ui.capability.invoke` only for this flow.
- Call `dawnchat.ui.capabilities.list` first.
- Read the returned scene catalog before choosing a view-level workflow.
- After `view.open`, **must** call `dawnchat.ui.capability.invoke(function=assistant.view.describe)` **before** any **`view.capability.invoke` that mutates page state** (writes). For read-only invokes, still use describe when anchors, binding, or continuation matter.
- When the task depends on page structure, anchors, state binding, or available page mutations, call `assistant.view.describe` before deciding payload.
- If `assistant.view.describe` exposes `continuation.pending_wait`, do not treat the task as a normal single-step mutation; hand off to `assistant-wait-continuation-handoff`.
- Keep payload minimal and aligned with the listed schema.
- Prefer one direct capability call for single-step tasks.
- If the task needs ordered `view.* + guide.*` orchestration, hand off to `assistant-session-narration` instead of ad-hoc chaining.
- Do not propose removed wait patterns such as `tail_wait` or `dawnchat.ui.session.wait`.
- Never let stale continuation state override a normal single-step mutation.
- If invoke fails, return a brief fallback explanation and include the observed error code.

## Output Contract

- Return the inspected page context when `assistant.view.describe` was used.
- Return continuation metadata when it materially affects the next action.
- Return invoked function names and payload summary.
- Return final user-facing short explanation text.
- Return fallback behavior when invoke fails.

## Checklist

- Capability list was read before planning invoke.
- `assistant.view.describe` was used before **write** `view.capability.invoke`, and whenever page reasoning was required.
- `view.capability.invoke` payload keeps `view_id` and `capability_id` **outside** `input`.
- Existing continuation metadata was inspected before any continuation-aware handoff.
- Capability invocation followed schema.
- Result was verified in runtime response.
