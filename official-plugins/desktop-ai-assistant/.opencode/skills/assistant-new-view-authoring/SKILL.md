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
- Ensure the new view is compatible with `assistant.view.describe`, workspace snapshotting, and checkpoint/resume.

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
- Ensure route metadata in registration matches the actual page route.
- Keep `buildStateSummary` small, structured, and useful for `assistant.view.describe`.
- Ensure the resource and capability contracts are visible through `assistant.view.describe`.

## Workspace and checkpoint rules

- The view layer should not manage workspace store directly.
- The view owns:
  - resource shape
  - anchors
  - page-local capability behavior
  - state summary
- Runtime owns:
  - workspace snapshot aggregation
  - checkpoint persistence
  - explicit resume behavior
- New views must restore correctly from `viewState` and summary data after explicit resume.

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
- `assistant.view.describe` includes the new view in `available_views`.
- Explicit resume restores the new view without auto-taking over unrelated tasks.

## Output Contract

- Return the files created or updated for the new view.
- Return the final `view_id`, `resource_type`, anchors, and capability ids.
- Return any new error codes introduced by resource or capability validation.
- Return the exact tests added for the new view.
