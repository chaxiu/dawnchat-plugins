# page_home

This page defines the minimal hello-world interaction in a single centered card and keeps behavior deterministic for template users.

The page is the first-touch example for plugin developers and should remain concise, readable, and easy to extend.

## Page Purpose

- The user can type a name and immediately see a local greeting preview.
- The page provides a minimal backend API verification path for frontend-backend integration checks.

## Page Structure

- One centered hello card container. @iwp(kind=views.pages.layout_tree)
- One title text and one short endpoint hint.
- One editable name input, one local greeting output text, and one backend verification area.

## Interaction Intent

- Editing the name input updates local greeting text in the same render cycle.
- Input name default is `DawnChat`. @iwp(file=state,section=defaults)
- When input is empty after trim, the greeting falls back to `World`. @iwp(file=state,section=constraints)
- Clicking verify action calls `GET /api/hello?name=...` and updates backend result state. @iwp(file=logic,section=trigger)

The page implementation lives under `_ir/frontend/web-src/src/views/pages/home/**`.

## Display Contract

- Rendered greeting output format is exactly `Hello, {name}!`. @iwp(file=views.pages,section=output)
- Rendered endpoint hint format is exactly `GET /api/hello?name=...`. @iwp(file=views.pages,section=output)
- Rendered backend result shows loading, success greeting, or error message. @iwp(file=views.pages,section=output)

## State Expectations

Required local view state:

- `input_name`
- `resolved_name`
- `greeting_text`
- `backend_status`
- `backend_greeting`
- `backend_error`

State update rules:

- `resolved_name = trim(input_name) || "World"`
- `greeting_text = "Hello, " + resolved_name + "!"`
- verify action sets `backend_status` to `loading` and then to `success | error`
- on success, `backend_greeting` is read from API response field `greeting`

## Acceptance Criteria

- Greeting text changes immediately when typing.
- Empty input always resolves to `World`.
- Verify action can fetch backend greeting and show deterministic result state.
