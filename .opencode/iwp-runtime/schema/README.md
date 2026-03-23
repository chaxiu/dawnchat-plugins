# IWP Schema

This directory contains versioned semantic schema profiles for IWP markdown source files.

## Files

- `iwp-schema.v1.json`: Machine-readable schema (single source of truth).
- `IWP-Schema-v1.md`: Human-readable explanation document derived from the JSON schema.

## Positioning

- `protocol/` defines core protocol principles and architecture constraints.
- `schema/` defines concrete markdown node structures for implementation-level linting and validation.

## Source of Truth Policy

- Iterate JSON first (`iwp-schema.v1.json`) for any schema change.
- Keep Markdown in sync as narrative/spec explanation.
- Linters and agents SHOULD consume JSON directly.
- v1 JSON is intentionally minimal and only includes:
  - `id`
  - `path_patterns`
  - `required_sections`
  - `optional_sections`

## Compatibility Note

The v1 schema is aligned with currently existing docs in `InstructWare.iw`.
It is intended as the baseline for linter rule evolution.

