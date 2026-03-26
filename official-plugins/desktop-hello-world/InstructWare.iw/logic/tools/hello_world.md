# hello_world_tool

This tool defines the backend hello endpoint contract for template verification and quick host integration checks.

## API Trigger

HTTP GET `/api/hello` accepts optional query `name`. @iwp(file=logic,section=trigger)

## Behavior Contract

- The handler reads `name`, trims whitespace, and applies fallback `World` when empty.
- The handler returns a deterministic JSON object with stable keys: `status`, `plugin_id`, and `greeting`. @iwp(file=logic,section=output)
- The `greeting` field format is exactly `Hello, {resolved_name}!`.
- Frontend verification action may call this endpoint directly to validate runtime connectivity.

## Runtime Boundary

Backend implementation lives under `_ir/backend/**`.

## Error and Fallback Policy

Fallback rule for invalid or empty input is mandatory and must not depend on external services.

## Acceptance Criteria

- Request without `name` returns greeting for `World`.
- Request with `name=Alice` returns greeting for `Alice`.
- Response keys and value shape remain stable for host-side consumption.
