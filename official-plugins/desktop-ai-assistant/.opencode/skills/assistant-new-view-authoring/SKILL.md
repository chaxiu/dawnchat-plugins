---
name: assistant-new-view-authoring
description: Author a new DawnChat Assistant view using defineView, state_binding normalization, capabilities, and registry wiring. Invoke when adding a brand new view or page scene.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: view-authoring
---

## What I do

- Add a new view using the standard separation of concerns (often two TS modules plus Vue):

  - **`*.view.ts`**: `defineView` manifest (`view_id`, `binding_type`, `default_state_binding`, anchors, capabilities, interaction hints), `normalizeStateBinding` / `open`, `invokeCapability`, `getStateSummary`, optional persistence.
  - **`*.capabilities.ts`** (or a `capabilities/` folder): page-local mutations for `view.capability.invoke`; keep handlers focused and testable.
  - **`*ViewRegistration`** or inline export: wire the view into the shared registry (see below).
  - **Vue page component** for rendering.

- Keep page rendering, state binding normalization, capability mutations, and runtime registration clearly separated.
- Ensure the new view is compatible with `assistant.view.describe` and the current minimal runtime observation fields.

## When to invoke

- Invoke when the task is to create a brand new view or page scene.
- Invoke when an existing task needs a new `view_id`, new anchors, or new state binding definitions for `view.open`.
- Do not invoke for simple edits inside an existing view unless the task is expanding it into a new scene boundary.

## Manifest and state binding (align with `defineView`)

In `assistant-core` the manifest types live in `assistant-core/src/runtime/view/manifest.ts`. Prefer these names:

- **`binding_type`**: discriminant for `view.open` payloads (replaces legacy “resource type” wording).
- **`default_state_binding`**: canonical default `ViewStateBinding` (`binding_type`, optional `binding_label`, `title`, `data`).
- **`state_bindings` in describe output**: the envelope Agents read from `assistant.view.describe` (definitions + labels), not a separate “resource contract” file.
- **`normalizeStateBinding`**: validate/normalize incoming `view.open` payload into a `ViewStateBinding`; return `invalid_view_resource` (legacy code string) or other stable `error_code` on rejection.

## Standard module split (repo-typical)

- **`*.view.ts`**

  - Call `defineView` with stable contract: `view_id`, `binding_type`, anchors, capability definitions, optional `interaction_hints`, `default_state_binding`.
  - Implement `normalizeStateBinding` for `view.open`.
  - Optionally implement custom `open` if routing needs extra work after normalization.
  - Delegate `invokeCapability` to `*.capabilities` helpers where practical.
  - Implement `getStateSummary` / `build*StateSummary` for `assistant.view.describe`.

- **`*.capabilities.ts`**

  - Implement mutations for `view.capability.invoke`.
  - Return explicit success payloads, updated `ViewStateBinding` data, and next anchor hints.
  - Keep handlers pure whenever possible.

- **Registry**

  - Register the new view in `_ir/frontend/web-src/src/runtime/view/registry.ts` (or the active registry path for this workspace).
  - Ensure top-level `view.open` can reach the new view via the shared registry and open handler.
  - Ensure route metadata in registration matches the actual page route.

## Required runtime integration

- Ensure `buildStateSummary` output is small, structured, and useful for `assistant.view.describe`.
- Ensure state binding definitions and capability contracts are visible through `assistant.view.describe`.

## Runtime observation rules

- The view layer should not manage runtime observation store directly.
- The view owns:

  - state binding shape (`ViewStateBinding.data`)
  - anchors
  - page-local capability behavior
  - state summary

- Runtime owns:

  - `active_state_binding` aggregation (legacy alias `active_resource_context` may still appear in older docs/payloads)
  - `task_progress` observation
  - `continuation` observation

- If the new view is `stateful`, keep persistence config on the `defineView` registration (`persistence`), not inside ad-hoc Agent-facing fields.
- Persist frequent state changes as a JSON payload through the runtime adapter instead of expanding them into database schema fields.
- New views must expose stable `getStateSummary()` output without depending on legacy recovery semantics.

## Recommended implementation order

- Create the page Vue component.
- Create `*.view.ts` with `defineView`, `default_state_binding`, and `normalizeStateBinding`.
- Add or extend `*.capabilities.ts` for page-local mutations.
- Wire registration and routes; register in `view/registry.ts`.
- Confirm `assistant.view.describe` exposes the new contract.
- Add focused contract/runtime tests.

## Minimum test checklist

- `view.open` succeeds with valid state binding input.
- `view.open` fails with explicit error code for invalid state binding input.
- `view.focus` works for valid anchors.
- `view.capability.invoke` succeeds for valid inputs.
- Invalid capability input returns stable errors.
- `dawnchat.ui.capabilities.list` includes the new view in the scene catalog.
- `assistant.view.list` exposes `view.open` contract details for the new scene.
- `assistant.view.describe` exposes the new view without introducing extra runtime observation fields.

## Output Contract

- Return the files created or updated for the new view.
- Return the final `view_id`, `binding_type`, anchors, and capability ids.
- Return any new error codes introduced by state binding or capability validation.
- Return the exact tests added for the new view.
