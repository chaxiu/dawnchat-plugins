# hello_world_tool

## Trigger

- GET `/api/hello` with optional query `name`

## Execution Flow

- receive request with optional `name` argument
- backend implementation resides in `_ir/backend/**`
- produce greeting payload in a deterministic JSON shape
- return `status=ok`, `plugin_id`, and `greeting`

## Failure Handling

- fallback name to `World` when input is empty
