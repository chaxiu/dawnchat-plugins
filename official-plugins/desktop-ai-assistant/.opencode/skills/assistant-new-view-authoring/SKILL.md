---
name: assistant-new-view-authoring
description: Author a new DawnChat Assistant view using the standard contract/resource/capabilities/registration split. Invoke when adding a brand new view or page scene.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: view-authoring
---

## What I do

- Add a new view using the standard four-part structure:
  - `*.contract`
  - `*.resource`
  - `*.capabilities`
  - `*ViewRegistration`
- Keep page rendering, resource normalization, capability mutations, and runtime registration clearly separated.
- Ensure the new view is compatible with `assistant.view.describe` and the current minimal runtime observation fields.

## When to invoke

- Invoke when the task is to create a brand new view or page scene.
- Invoke when an existing task needs a new `view_id`, new anchors, or a new resource contract.
- Do not invoke for simple edits inside an existing view unless the task is expanding it into a new scene boundary.

## Standard file split

- `*.contract`
  - Define manifest-facing stable contract:
    - `view_id`
    - `resource_type`
    - anchors
    - capability definitions
    - resource contract
    - default resource
- `*.resource`
  - Normalize and validate incoming `view.open` payloads.
  - Build default/fallback resource values.
  - Return explicit `invalid_view_resource` style failures.
- `*.capabilities`
  - Implement page-local mutations for `view.capability.invoke`.
  - Return explicit success payloads, changed resource, and next anchor.
  - Keep handlers pure whenever possible.
- `*ViewRegistration`
  - Wire together manifest, route, `createDefaultResource`, `open`, `invokeCapability`, and `buildStateSummary`.
  - Keep this file small and assembly-oriented.

## Required runtime integration

- Register the new view in `_ir/frontend/web-src/src/runtime/view/registry.ts`.
- Ensure top-level `view.open` can reach the new view via the shared registry and open handler.
- Ensure route metadata in registration matches the actual page route.
- Keep `buildStateSummary` small, structured, and useful for `assistant.view.describe`.
- Ensure the resource and capability contracts are visible through `assistant.view.describe`.

## Runtime observation rules

- The view layer should not manage runtime observation store directly.
- The view owns:
  - resource shape
  - anchors
  - page-local capability behavior
  - state summary
- Runtime owns:
  - `active_resource_context` aggregation
  - `task_progress` observation
  - `continuation` observation
- If the new view is `stateful`, keep persistence config on `ViewRegistration`, not inside the Agent-facing manifest.
- Persist frequent state changes as a JSON payload through the runtime adapter instead of expanding them into database schema fields.
- New views must expose stable `buildStateSummary()` output without depending on legacy recovery semantics.

## Recommended implementation order

- Create the page Vue component.
- Create `*.contract` with manifest and default resource.
- Create `*.resource` for `view.open` normalization.
- Create `*.capabilities` for page-local mutations.
- Create `*ViewRegistration` and connect the files.
- Register the view in `view/registry.ts`.
- Confirm `assistant.view.describe` exposes the new contract.
- Add focused contract/runtime tests.

## Minimum test checklist

- `view.open` succeeds with valid resource input.
- `view.open` fails with explicit error code for invalid resource input.
- `view.focus` works for valid anchors.
- `view.capability.invoke` succeeds for valid inputs.
- Invalid capability input returns stable errors.
- `dawnchat.ui.capabilities.list` includes the new view in the scene catalog.
- `assistant.view.list` exposes `view.open` contract details for the new scene.
- `assistant.view.describe` exposes the new view without introducing extra runtime observation fields.

## Output Contract

- Return the files created or updated for the new view.
- Return the final `view_id`, `resource_type`, anchors, and capability ids.
- Return any new error codes introduced by resource or capability validation.
- Return the exact tests added for the new view.
