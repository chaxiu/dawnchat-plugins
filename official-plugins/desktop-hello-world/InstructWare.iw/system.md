# System

## Product Identity

- plugin id: `com.dawnchat.desktop-hello-world`
- app type: `desktop`
- runtime backend: `bun`
- source root: `_ir`

## Global Rules

- frontend and backend edits MUST stay under `_ir`.
- `_ir` uses domain-oriented architecture:
  - shared layer: `_ir/shared/**`
  - backend layer: `_ir/backend/**`
  - frontend layer: `_ir/frontend/**`
- keep backend API shape stable for `/health`, `/api/info`, `/api/hello`.
- preview startup MUST keep working with `preview.frontend_dir`.

## Information Architecture

- intent SSOT stays in `InstructWare.iw/**`.
- implementation code keeps layered responsibilities:
  - backend runtime code stays in `_ir/backend/**`
  - frontend source and artifacts stay in `_ir/frontend/**`
  - shared contracts can be added under `_ir/shared/**` when needed.

## Runtime Guarantees

- backend runtime exposes `/health`, `/api/info`, `/api/hello`.
- `/api/hello` returns deterministic JSON with `status` and `greeting`.
- frontend preview loads from `_ir/frontend/web` static artifacts.

## Security Model

- plugin keeps an empty permissions list by default.
- avoid adding unnecessary runtime capabilities in hello-world baseline.
