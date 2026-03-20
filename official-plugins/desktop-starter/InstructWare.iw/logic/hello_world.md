# hello_world_tool

## execution_flow

- receive tool call with optional `name` argument
- produce greeting payload in a deterministic JSON shape
- return `status=ok` and `result.greeting`

## validation

- fallback name to `World` when input is empty
- return error response for unknown tool names

