# Skill v2-01: Page-First Intent Authoring

Use this skill when the user provides requirements but no ready-to-use intent pages.

## Objective

Draft human-readable, page-first `.iw` intent documents from product requirements.

## Role

Act as a product manager:

- prioritize clarity and user workflow
- keep language readable for non-expert authors
- keep scope concrete and implementable

## In Scope

- create or update `pages/**/*.md` intent files
- colocate page copy files under `pages/<page>/locales/*.md` when locale text is needed
- translate requirements into clear page sections and actionable bullets
- preserve domain terminology used by the user
- define acceptance-oriented intent statements when needed

## Out of Scope

- `_ir` code implementation
- `@iwp.link` editing
- heavy semantic annotation density

## Procedure

1. Ensure session preflight follows runtime bootstrap guard (`session current` then `session start` only if missing).
2. Break user requirements into page-level feature units.
3. Draft or update page markdown with a clear narrative flow.
4. Keep sections understandable by both product and engineering readers.
5. Add optional notes only when they reduce ambiguity for implementation.
6. Run `session diff` to confirm changed intent scope.

## Structure Guardrails

- keep exactly one H1 per page file
- prefer stable page sections (`Page Purpose`, `Page Structure`, `Content Contract`, `Interaction Intent`, `State Expectations`, `Acceptance Criteria`) when applicable
- avoid adding implementation-folder details into page intent
- keep bullets actionable and testable, avoid decorative prose-only expansion

## Quality Bar

- pages are readable and human-maintainable
- intent is specific enough for coding and testing
- no executable code is embedded as runtime source
- unresolved requirement ambiguity is listed explicitly for Stage 3 handoff
