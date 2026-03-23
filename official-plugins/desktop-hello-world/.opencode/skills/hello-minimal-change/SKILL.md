---
name: hello-minimal-change
description: Keep desktop-hello-world changes small, explicit, and easy to verify. Invoke before implementing any feature, refactor, or bugfix in this template.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: minimalism
---

## What I do

- Constrain scope to the smallest patch that satisfies intent.
- Prefer direct edits in existing files over structural expansion.
- Preserve hello-world readability and teaching value.

## Rules

- Do not introduce new architectural layers unless required by intent.
- Do not add speculative abstractions for future scenarios.
- Keep API and UI behavior explicit and easy to trace.

## Checklist

- Changed files are strictly related to requested behavior.
- New complexity is justified by current requirements.
- Runtime behavior remains easy to explain in one short paragraph.
