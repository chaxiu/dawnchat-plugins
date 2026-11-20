---
name: web-typescript
description: Web TypeScript / frontend coding conventions for Munk Auto coding and repair agents. Use when editing web apps, Vue/React/Nuxt pages, shared TS packages, or browser UI.
license: MIT
compatibility: opencode
metadata:
  audience: coding
  platform: web
---

## When to use

Load this skill when the work item touches web or TypeScript application code (SPA/SSR pages, components, shared packages, CSS).

## Conventions

- Prefer the framework and patterns already used in the repo (Vue/React/Nuxt/etc.); do not introduce a parallel stack.
- Keep changes scoped to the requested feature; avoid drive-by refactors.
- Follow existing folder layout (`app/`, `features/`, `packages/`, etc.) and import boundaries.
- Prefer typed APIs and shared contracts already in the monorepo over ad-hoc `any` payloads.
- For UI, reuse existing design system primitives and spacing before inventing new card/layout patterns.

## Verification hints

- Prefer the repo's documented typecheck / lint / unit / e2e commands when available.
- Do not invent package manager flags or script names that the project does not use.
