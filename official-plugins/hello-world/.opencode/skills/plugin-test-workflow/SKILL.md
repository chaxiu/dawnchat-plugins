---
name: plugin-test-workflow
description: Validate DawnChat plugin changes with focused backend and frontend checks
compatibility: opencode
---

## When to use

Use this skill after code changes to generate a targeted verification checklist.

## Workflow

1. Run backend tests related to tool/router changes.
2. Build frontend if `web-src` changed.
3. Verify preview mode behaviors manually.
4. Summarize what was checked and what remains risky.

## Minimal Commands

- `pytest tests/ -v`
- `cd web-src && pnpm build`
