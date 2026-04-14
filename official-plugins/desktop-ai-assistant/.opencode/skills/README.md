# Skills Index

## Global invariants

- **`plugin_id`:** In the `desktop-ai-assistant` workspace, read **`manifest.json` → `id`** and use that string for every `dawnchat.ui.*` call unless the host injects another canonical id. **`dawnchat.ui.runtime.info` requires `plugin_id`**—it validates host/preview state; it does **not** discover an id from nothing.
- **`view.capability.invoke`:** Keep `view_id` and `capability_id` at the **payload root** next to `input`; never nest them inside `input`.
- **Writes:** After `view.open`, call **`assistant.view.describe`** before any **write** `view.capability.invoke` or before state-dependent `session.start` steps.

## Available Skills

- `assistant-intent-router`: Classify user request and choose Capability-First or Self-Evolving path.
- `assistant-capability-discovery`: Build runtime capability map from MCP list results.
- `assistant-runtime-diagnose`: Read runtime info and decide whether refresh or restart is required.
- `assistant-runtime-recover`: Execute refresh/restart recovery sequence and validate result.
- `assistant-python-sidecar-check`: Validate Python sidecar runtime state and MCP endpoint availability.
- `assistant-rich-display-execution`: Render content via existing capabilities only.
- `assistant-session-narration`: Build session.start payloads with stable narration.text and plugin action passthrough.
- `assistant-wait-continuation-handoff`: Continue from `continuation.pending_wait` and `flow.wait` boundaries without replaying stale setup steps.
- `assistant-evolution-implement`: Add or modify UI capabilities through code changes.
- `assistant-new-view-authoring`: Add a brand new view using the standard contract/state_binding/capabilities/registration split.
- `assistant-evolution-verify`: Enforce typecheck/unit/build and runtime capability checks.
- `assistant-reference-scene-eval`: Validate the `word.main` reference scene, `assistant.view.describe`, and error recovery flow.
- `assistant-delivery-report`: Produce delivery notes with capability changes and validation status.

## Recommended Order by Task

- View-first task with existing runtime:
  - `assistant-intent-router` -> `assistant-runtime-diagnose` -> `assistant-python-sidecar-check` -> `assistant-capability-discovery` -> `assistant-rich-display-execution` -> `assistant-delivery-report`
- Ordered guide/view walkthrough:
  - `assistant-intent-router` -> `assistant-runtime-diagnose` -> `assistant-python-sidecar-check` -> `assistant-capability-discovery` -> `assistant-session-narration` -> `assistant-delivery-report`
- Continuation-aware recovery:
  - `assistant-runtime-diagnose` -> `assistant-capability-discovery` -> `assistant-runtime-recover` -> `assistant-wait-continuation-handoff` -> `assistant-delivery-report`
- Capability gap request:
  - `assistant-intent-router` -> `assistant-runtime-diagnose` -> `assistant-python-sidecar-check` -> `assistant-capability-discovery` -> `assistant-evolution-implement` -> `assistant-runtime-recover` -> `assistant-evolution-verify` -> `assistant-delivery-report`
- New view request:
  - `assistant-intent-router` -> `assistant-runtime-diagnose` -> `assistant-capability-discovery` -> `assistant-new-view-authoring` -> `assistant-evolution-implement` -> `assistant-evolution-verify` -> `assistant-delivery-report`
- Reference-scene regression check:
  - `assistant-runtime-diagnose` -> `assistant-runtime-recover` -> `assistant-reference-scene-eval` -> `assistant-evolution-verify` -> `assistant-delivery-report`

## Continuation Notes

- Treat `assistant.view.describe` as the page and runtime observation entrypoint; **required** before page mutations when state matters.
- If continuation state is reported, inspect `continuation` first.
- Use `continuation.pending_wait` to decide whether a follow-up `dawnchat.ui.event.wait(...)` or `dawnchat.ui.session.wait_for_end(session_id)` is more appropriate than a fresh session.
- If `continuation.pending_wait` exists, prefer `assistant-wait-continuation-handoff` and a short wait-aware continuation instead of replaying the whole prior sequence.
- Do not let stale continuation state override the current task intent.
