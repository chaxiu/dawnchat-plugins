# Plugin Debug Logging Context

## Purpose

This plugin supports coding-agent-friendly troubleshooting through structured logs and session sharding.

## Log Locations

- Main plugin log: host-managed plugins log file.
- Debug mirror: `.debug/log/<plugin_id>.log`
- Session shard: `.debug/log/<mode>-<session_id>.log`
- Session index: `.debug/log/sessions.json`

## Session Index Schema

- `version`: number
- `updated_at`: ISO timestamp
- `sessions`: latest-first array
  - `session_id`
  - `mode`
  - `started_at`
  - `last_seen_at`
  - `entries_count`
  - `last_source`
  - `log_file`

## Frontend Capture Notes

- Preview iframe forwards `warn`/`error` and unhandled runtime errors.
- Host forwards logs to backend ingest API with `plugin_id`, `mode`, and `session_id`.

## Backend Notes

- Backend writes main logs and debug/session files through a unified log service.
- Keep log lines readable and stable for agent parsing.
- Avoid logging sensitive fields; redact when needed.
