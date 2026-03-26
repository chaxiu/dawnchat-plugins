# System

This document defines runtime boundaries and baseline constraints for desktop-hello-world.

## Product Identity

- plugin id: `com.dawnchat.desktop-hello-world`
- app type: `desktop`
- runtime backend: `bun`
- source root: `_ir`

## Runtime Boundaries

- Frontend and backend edits MUST stay under `_ir`.
- Layered structure is fixed as shared (`_ir/shared/**`), backend (`_ir/backend/**`), and frontend (`_ir/frontend/**`).
- Preview startup MUST keep working with `preview.frontend_dir`.

## Architecture Contract

- Intent SSOT stays in `InstructWare.iw/**`.
- Backend runtime code stays in `_ir/backend/**` and frontend source/artifacts stay in `_ir/frontend/**`.
- Shared contracts MAY be added under `_ir/shared/**` when needed.

## Runtime Guarantees

- Backend runtime exposes `/health`, `/api/info`, `/api/hello`. @iwp(file=logic,section=output)
- `/api/hello` returns deterministic JSON with `status` and `greeting`. @iwp(file=logic,section=output)
- Frontend preview loads static artifacts from `_ir/frontend/web`.

## Security Policy

- Plugin keeps an empty permissions list by default.
- Avoid adding unnecessary runtime capabilities in hello-world baseline.
