# System

This document defines runtime boundaries and baseline constraints for desktop-starter.

## Product Identity

- plugin id: `com.dawnchat.desktop-starter`
- app type: `desktop`
- runtime backend: `bun`
- source root: `_ir`

## Runtime Boundaries

- Frontend and backend edits MUST stay under `_ir`.
- Layered structure is fixed as shared (`_ir/shared/**`), backend (`_ir/backend/**`), and frontend (`_ir/frontend/**`).
- Preview startup MUST keep working with `preview.frontend_dir`.

## Architecture Contract

- Intent SSOT stays in `InstructWare.iw/**`.
- Frontend source layering under `_ir/frontend/web-src/src/**` keeps `views/**`, `logic/**`, and `models/**` responsibilities separated.
- Colocated links map changed intent nodes to nearby code boundaries only.

## Runtime Guarantees

- Backend runtime exposes `/health`, `/api/info`, `/api/hello`, `/api/tools/call`.
- Tool call result shape keeps deterministic `status` and `result` fields. @iwp(file=logic,section=output)
- Frontend preview loads static artifacts from `_ir/frontend/web`.

## Security Policy

- Plugin declares `network:none` and `fs:read` permissions only.
- Tool call input is validated and unknown tool names return controlled errors.
