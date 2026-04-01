# Skills Index

## Available Skills

- `assistant-intent-router`: Classify user request and choose Capability-First or Self-Evolving path.
- `assistant-capability-discovery`: Build runtime capability map from MCP list results.
- `assistant-runtime-diagnose`: Read runtime info and decide whether refresh or restart is required.
- `assistant-runtime-recover`: Execute refresh/restart recovery sequence and validate result.
- `assistant-python-sidecar-check`: Validate Python sidecar runtime state and MCP endpoint availability.
- `assistant-rich-display-execution`: Render content via existing capabilities only.
- `assistant-session-narration`: Build session.start payloads with stable narration.text and plugin action passthrough.
- `assistant-evolution-implement`: Add or modify UI capabilities through code changes.
- `assistant-new-view-authoring`: Add a brand new view using the standard contract/resource/capabilities/registration split.
- `assistant-evolution-verify`: Enforce typecheck/unit/build and runtime capability checks.
- `assistant-reference-scene-eval`: Validate the `word.main` reference scene, `assistant.view.describe`, and error recovery flow.
- `assistant-delivery-report`: Produce delivery notes with capability changes and validation status.

## Recommended Order by Task

- View-first task with existing runtime:
  - `assistant-intent-router` -> `assistant-runtime-diagnose` -> `assistant-python-sidecar-check` -> `assistant-capability-discovery` -> `assistant-rich-display-execution` -> `assistant-delivery-report`
- Ordered guide/view walkthrough:
  - `assistant-intent-router` -> `assistant-runtime-diagnose` -> `assistant-python-sidecar-check` -> `assistant-capability-discovery` -> `assistant-session-narration` -> `assistant-delivery-report`
- Checkpoint-aware recovery:
  - `assistant-runtime-diagnose` -> `assistant-capability-discovery` -> `assistant-rich-display-execution` -> `assistant-runtime-recover` -> `assistant-delivery-report`
- Capability gap request:
  - `assistant-intent-router` -> `assistant-runtime-diagnose` -> `assistant-python-sidecar-check` -> `assistant-capability-discovery` -> `assistant-evolution-implement` -> `assistant-runtime-recover` -> `assistant-evolution-verify` -> `assistant-delivery-report`
- New view request:
  - `assistant-intent-router` -> `assistant-runtime-diagnose` -> `assistant-capability-discovery` -> `assistant-new-view-authoring` -> `assistant-evolution-implement` -> `assistant-evolution-verify` -> `assistant-delivery-report`
- Reference-scene regression check:
  - `assistant-runtime-diagnose` -> `assistant-runtime-recover` -> `assistant-reference-scene-eval` -> `assistant-evolution-verify` -> `assistant-delivery-report`

## Recovery Notes

- Treat `assistant.view.describe` as the page and workspace snapshot entrypoint.
- If a recoverable state is reported, inspect `checkpoint_summary` and `resume_available` first.
- Use `assistant.workspace.checkpoint.describe` to confirm the latest recoverable state.
- Use `assistant.workspace.resume` only with an explicit `resume_token`.
- Do not auto-resume solely because a checkpoint exists; prefer the current task intent over stale state.
