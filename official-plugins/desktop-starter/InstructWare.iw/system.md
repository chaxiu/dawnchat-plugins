# System

## Product Identity

- plugin id: `com.dawnchat.desktop-starter`
- app type: `desktop`
- runtime backend: `bun`
- source root: `_ir`

## Global Rules

- frontend and backend edits MUST stay under `_ir`.
- backend API response shape for tool call MUST remain stable.
- preview startup MUST keep working with `preview.frontend_dir`.

## Information Architecture

- intent SSOT stays in `InstructWare.iw/**`.
- implementation code stays in `_ir/**` with view and logic separation.
- colocated links map changed intent nodes to nearby code boundaries only.

## Runtime Guarantees

- backend runtime exposes `/health`, `/api/info`, `/api/hello`, `/api/tools/call`.
- tool call result shape keeps deterministic `status` and `result` fields.
- frontend preview loads from `_ir/views/web` static artifacts.

## Security Model

- plugin declares `network:none` and `fs:read` permissions only.
- tool call input is validated and unknown tool names return controlled errors.
