---
name: assistant-intent-router
description: Route DawnChat Assistant requests into Capability-First mode or Self-Evolving mode based on current capability fit.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: routing
---

## What I do

- Parse user intent for Q&A, productivity, and automation-oriented assistant tasks.
- Decide whether existing UI capabilities are sufficient.
- Select one of four execution paths: direct view-first capability use, ordered session narration, continuation-aware wait handoff, or Self-Evolving.

## Decision Rules

- Choose `assistant-rich-display-execution` when one existing capability path can satisfy the task after capability listing and page introspection.
- Choose `assistant-session-narration` when request needs ordered multi-step execution with host session lifecycle (`start/status/stop`).
- Choose `assistant-wait-continuation-handoff` when `assistant.view.describe` exposes `continuation.pending_wait`.
- If continuation metadata suggests prior progress but not an active wait boundary, prefer `assistant-session-narration` over ad-hoc single-step mutation.
- Choose Self-Evolving when no listed capability or existing view contract can meet the request.
- Prefer smallest viable path that preserves user outcome quality.
- Treat current task intent as higher priority than stale continuation metadata unless the task explicitly asks to continue prior work.

## Output Contract

- Return selected mode.
- Return reason in one concise paragraph.
- Return required next skill.
- For session workflow, include whether interruption control is required (`session.stop` expected or not).
- For recovery workflow, include whether the next move is `event.wait`, `session.wait_for_end`, short continuation session, or fresh re-plan.

## Checklist

- Mode choice is tied to capability availability, not guesswork.
- Routing result is explicit and reproducible.
- `continuation.pending_wait` is treated as a distinct routing signal, not folded into generic narration flow.
