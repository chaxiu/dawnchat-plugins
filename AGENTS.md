# AGENTS.md

DawnChat Plugins monorepo. Vue 3 + TypeScript packages built with Vite; Python pieces live alongside the plugin SDKs.

## Stack

- **Frontend / UI packages**: Vue 3 (`<script setup lang="ts">`), TypeScript, Vite library builds (`vite build` + `vite-plugin-dts`), Vitest + `@vue/test-utils` (jsdom).
- **Plugin SDKs / protocol**: `sdk/`, `shared-protocol/`, `shared-ui/`, `official-plugins/`, `assistant-sdk/`.
- Package manager: `npm` per package (each package owns its `package.json`; there is no root workspace install).

## Directory conventions

- `assistant-sdk/<package>/src/` — package sources; re-export public API from `src/index.ts`.
- `assistant-sdk/<package>/src/components/` — Vue SFCs; component specs live in `src/components/__tests__/*.spec.ts`.
- Other packages follow the same `src/` + `__tests__/` layout.
- Never commit build output (`dist/`) or `node_modules/`.

## Skills routing

Load the matching skill before editing:

| Area | Skill |
| --- | --- |
| Web / TypeScript / Vue components, shared TS packages | `.agents/skills/web-typescript/SKILL.md` |
| DawnChat plugin manifest vs implementation drift | `.opencode/skills/plugin-manifest-sync/SKILL.md` |
| Validating plugin changes in preview mode | `.opencode/skills/plugin-preview-validation/SKILL.md` |

## Test pyramid

- **L1 unit**: pure functions, adapters, stores, computed logic — plain Vitest `*.spec.ts`, no DOM needed.
- **L2 in-process integration**: headless component mounting with `@vue/test-utils` + `jsdom` (assert rendered DOM, props, emitted events). No real browser or network.
- Run a single spec: `npx vitest run src/components/__tests__/<Name>.spec.ts` inside the package.
- Run a package's suites: `npm run test` inside the package.
- Typecheck: `npm run typecheck`; library build: `npm run build`.
- Prefer testing behaviour through public props/emitted events rather than internal implementation details; no placeholder assertions.

## Coding discipline

- Keep diffs scoped to the requested change; match neighbouring naming, imports and style.
- Reuse existing design tokens (`--color-*`, `.task-meta-chip`, …) instead of inventing new styles.
- Do not add machine-specific paths or private environment details to source, tests or docs.
