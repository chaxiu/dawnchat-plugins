# DawnChat Plugin Development Rules

## General

- Follow DawnChat plugin manifest conventions.
- Keep behavior compatible with plugin preview mode.
- Use clear error messages for tool/API failures.

## Backend Rules

- Python code should be readable and testable.
- Avoid hardcoding machine-specific paths.
- Keep async paths truly async where I/O is involved.

## Frontend Rules

- Keep UI simple and demo-friendly.
- Avoid breaking existing localization/theme flow.
- Ensure API error states are visible to users.

## Tooling Rules

- Update `manifest.json` whenever tools are added/changed.
- If changing tool input schema, update handlers and tests in the same change.
