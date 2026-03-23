---
name: hello-preview-validation
description: Validate desktop-hello-world runtime and preview output after changes. Invoke before delivery and when checking regressions.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: validation
---

## What I do

- Verify changed API behavior and UI rendering in a focused way.
- Confirm manifest runtime and preview settings remain valid.
- Summarize manual checks and unresolved risk.

## Validation flow

1. Identify changed backend and frontend files.
2. Run targeted checks for changed behavior.
3. Verify preview rendering and API output for the changed path.
4. Report pass/fail and residual risk.

## Checklist

- `manifest.json` runtime entry points to existing backend file.
- `preview.frontend_dir` points to existing frontend source root.
- `/health`, `/api/info`, and `/api/hello` behavior remains coherent.
- Home page still renders and reflects requested changes.
