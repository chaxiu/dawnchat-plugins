---
name: assistant-reference-scene-eval
description: Validate the DawnChat Assistant reference scene end-to-end. Invoke when checking whether word.main, view.describe, guide UI, and error recovery behave as expected.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: evaluation
---

## What I do

- Run a lightweight self-check for the current reference scene.
- Verify that the Agent can inspect `word.main`, operate view actions, and observe expected state changes.
- Check that failure paths return stable error codes instead of silent success.

## When to use

- Use this skill after runtime changes to `word.main`, `assistant.view.describe`, or guide/view orchestration.
- Use this skill before trying a real external Agent run.
- Do not use this skill as the default working flow for normal user tasks.

## Required context

- Assistant scene discovery comes from `dawnchat.ui.capabilities.list`.
- Registered view contract details, route entry, anchors, capability contract, resource contract, and current page state come from `assistant.view.describe`.
- Current view registry lives in `_ir/frontend/web-src/src/runtime/view/registry.ts`.
- Current guide actions live in `_ir/frontend/web-src/src/runtime/guide/runtime.ts` and `_ir/frontend/web-src/src/runtime/guide/actions.ts`.
- Current guide card types live in `_ir/frontend/web-src/src/cards/registry.ts`.

## Evaluation flow

- Step 1: runtime and discovery
  - call `dawnchat.ui.runtime.info`
  - call `dawnchat.ui.capabilities.list`
  - confirm the scene catalog includes the expected view
  - confirm `assistant.view.describe` is available as the detail entrypoint
- Step 2: inspect current page
  - call `dawnchat.ui.capability.invoke(function=assistant.view.describe)`
  - read:
    - `requested_view`
    - `active_view_id`
    - `active_anchor`
    - `current_resource`
    - `guide_state`
- Step 3: success path checks
  - open `word.main`
  - focus `word.meaning`
  - invoke `append_etymology`
  - focus `word.etymology`
  - invoke `set_title`
  - run a guide expression step such as `guide.narrate` or `guide.card.show`
- Step 4: continuation visibility checks
  - confirm `assistant.view.describe` exposes `task_progress`
  - confirm `assistant.view.describe` exposes `active_resource_context`
  - confirm `assistant.view.describe` exposes `continuation`
- Step 5: failure path checks
  - send an invalid anchor
  - send an invalid capability id
  - send invalid capability input
  - confirm the error codes are explicit and the Agent can recover by re-reading `assistant.view.describe`

## Expected checks

- `dawnchat.ui.capabilities.list` returns `word.main` in the scene catalog.
- `assistant.view.describe` returns resource contract and capability contract for `word.main`.
- `view.open` with a valid word resource succeeds.
- `view.focus(word.meaning)` updates active anchor to `word.meaning`.
- `view.capability.invoke(append_etymology)` updates the etymology list and active anchor.
- `view.capability.invoke(set_title)` updates the page title.
- guide overlay can coexist with the page after `word.main` is active.
- minimal runtime observation fields are discoverable without taking over the page.
- `continuation` remains lightweight observation metadata, not an auto-restore instruction.
- invalid input returns stable errors such as:
  - `invalid_view_resource`
  - `invalid_view_capability_input`
  - `anchor_not_found`
  - `view_capability_not_found`

## Output contract

- Return a short pass/fail matrix for:
  - discovery
  - inspect
  - success path
  - failure path
- Return the exact failing step, error code, and observed state if any check fails.
- Return whether the reference scene is ready for a real Agent trial.

## Checklist

- No guessing of anchor names or capability input without reading `assistant.view.describe`.
- No mixing this evaluation flow into the normal narration skill.
- Re-check `assistant.view.describe` after a failed action before concluding state is broken.
- Treat runtime observation metadata as discoverable state, not an instruction to auto-override the current task.
