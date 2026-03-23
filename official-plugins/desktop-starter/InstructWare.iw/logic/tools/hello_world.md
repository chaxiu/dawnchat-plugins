# hello_world_tool

## Trigger

- POST `/api/tools/call` with `name=hello_world`
- GET `/api/hello` with optional query `name`

## Execution Flow

- receive tool call with optional `name` argument
- produce greeting payload in a deterministic JSON shape
- return `status=ok` and `result.greeting`

## Failure Handling

- fallback name to `World` when input is empty
- return error response for unknown tool names
