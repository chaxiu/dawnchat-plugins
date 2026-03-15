---
name: plugin-debug-logging
description: Add structured debug logs and troubleshoot with session-sharded plugin logs
compatibility: opencode
---

## When to use

Use this skill when:
- A plugin issue is hard to reproduce or diagnose in preview/runtime.
- You need to add targeted logs to isolate backend or frontend failures.
- You need evidence from session-specific logs for root cause analysis.

## Logging contract

1. Use levels intentionally:
   - `INFO`: lifecycle milestones
   - `WARN`: recoverable anomalies
   - `ERROR`: user-impacting failures
2. Treat correlation fields as system-owned context:
   - Runtime/logger should auto-inject `plugin_id`, `mode` (`preview`/`runtime`), and `session_id` when available.
   - Business log code should not manually set or override those fields.
   - Business log code may add `request_id` / operation id for traceability.
3. Never log secrets, tokens, credentials, or private keys.
4. Keep logs concise and actionable; avoid persistent noise.

## Workflow

1. Identify 2-4 checkpoints around the failing flow.
2. Add frontend `WARN/ERROR` logs around API failures, state mismatches, and unhandled errors.
3. Add backend logs at request boundaries and exception branches.
4. Reproduce once and inspect:
   - `.debug/log/sessions.json`
   - `.debug/log/<mode>-<session_id>.log`
   - main plugin log
5. Summarize cause with log evidence.
6. Remove temporary noisy logs after confirmation.

## Verification checklist

- Logs are emitted in both main and session files.
- `sessions.json` contains current session activity.
- No sensitive data appears in logs.
- Existing feature behavior remains unchanged.
