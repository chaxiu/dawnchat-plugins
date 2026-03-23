# System

## Product Identity

- plugin id: `com.dawnchat.desktop-starter`
- app type: `desktop`
- runtime backend: `bun`
- source root: `_ir`

## Global Rules

- frontend and backend edits MUST stay under `_ir`.
- `_ir` uses domain-oriented architecture:
  - shared layer: `_ir/shared/**`
  - backend layer: `_ir/backend/**`
  - frontend layer: `_ir/frontend/**`
- backend API response shape for tool call MUST remain stable.
- preview startup MUST keep working with `preview.frontend_dir`.

## Information Architecture

- intent SSOT stays in `InstructWare.iw/**`.
- implementation code keeps layered responsibilities:
  - semantic models shared by frontend/backend stay in `_ir/shared/models/**`
  - backend adaptation code stays in `_ir/backend/**`
  - frontend implementation and build artifacts stay in `_ir/frontend/**`
  - frontend source layering under `_ir/frontend/web-src/src/**`:
    - view nodes in `views/**`
    - rendering and behavior logic in `logic/**`
    - view models in `models/**`
- colocated links map changed intent nodes to nearby code boundaries only.

## Runtime Guarantees

- backend runtime exposes `/health`, `/api/info`, `/api/hello`, `/api/tools/call`.
- tool call result shape keeps deterministic `status` and `result` fields.
- frontend preview loads from `_ir/frontend/web` static artifacts.

## Security Model

- plugin declares `network:none` and `fs:read` permissions only.
- tool call input is validated and unknown tool names return controlled errors.
