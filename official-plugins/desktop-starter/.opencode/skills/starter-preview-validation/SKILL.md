---
name: starter-preview-validation
description: Validate desktop-starter runtime and preview behavior after changes. Invoke before final delivery or when confirming regressions.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: validation
---

## What I do

- Validate changed backend and frontend behavior with focused checks.
- Verify manifest/runtime/preview path consistency.
- Output concise manual verification steps and residual risks.

## Validation flow

1. Confirm changed files and affected runtime paths.
2. Run focused backend and frontend checks relevant to the diff.
3. Verify preview entry and API responses for changed behavior.
4. Report pass/fail items and remaining risks.

## Checklist

- `manifest.json` runtime root and entry match actual files.
- `preview.frontend_dir` points to valid frontend source root.
- Changed UI renders correctly in preview.
- Changed API contracts remain stable and user-readable.
