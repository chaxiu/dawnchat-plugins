---
name: assistant-rich-display-execution
description: Execute DawnChat Assistant rendering with existing capabilities only, focusing on concise Q&A output and robust payloads.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: rich-display
---

## What I do

- Compose user-facing response with concise and high-signal text.
- Invoke one or more existing UI capabilities for rich presentation.
- Keep interaction deterministic and schema compliant.

## Rules

- Use `dawnchat.ui.capability.invoke` only.
- Keep payload minimal and aligned with function input schema.
- If invoke fails, provide brief fallback text and report failure cause.

## Output Contract

- Return invoked function names and payload summary.
- Return final user-facing short explanation text.
- Return fallback behavior when rendering fails.

## Checklist

- Capability invocation followed schema.
- Render result is verified in runtime response.
