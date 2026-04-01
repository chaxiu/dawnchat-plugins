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
- When the task depends on page structure, anchors, resource state, or available page mutations, call `dawnchat.ui.capability.invoke(function=assistant.view.describe)` before deciding payload.
- If `assistant.view.describe` exposes `checkpoint_summary`, prefer reading it before mutating the page.
- If a resume just succeeded and `continuation_hint.pending_wait` exists, do not treat the task as a normal single-step mutation; hand off to `assistant-session-narration`.
- Keep payload minimal and aligned with the listed schema.
- Prefer one direct capability call for single-step tasks.
- If the task needs ordered `view.* + guide.*` orchestration, hand off to `assistant-session-narration` instead of ad-hoc chaining.
- Never auto-resume the workspace as part of a normal single-step mutation.
- Use `assistant.workspace.resume` only when the task explicitly asks to continue the previous state.
- If invoke fails, return a brief fallback explanation and include the observed error code.

## Output Contract

- Return the inspected page context when `assistant.view.describe` was used.
- Return checkpoint metadata when it materially affects the next action.
- Return invoked function names and payload summary.
- Return final user-facing short explanation text.
- Return fallback behavior when invoke fails.

## Checklist

- Capability list was read before planning invoke.
- `assistant.view.describe` was used when page reasoning was required.
- Existing checkpoint metadata was inspected before any explicit resume.
- Capability invocation followed schema.
- Result was verified in runtime response.
