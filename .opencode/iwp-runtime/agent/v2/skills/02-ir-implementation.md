# Skill v2-02: IR Implementation (Code Only)

Use this skill after `.iw` intent is aligned for the current session.

## Objective

Implement runtime behavior in `_ir` based on this session's markdown changes.

## In Scope

- read `session diff` impacted nodes to understand what changed
- implement or refactor `_ir` code and tests
- enforce layer placement and dependency direction

## Out of Scope

- editing `@iwp.link` annotations
- node-id selection decisions
- reverse-review judgment output

## Core Rule

This stage is code-first and link-blind:

- MUST NOT add/remove/update any `@iwp.link`
- only exception: syntax-preserving edit required to keep file parseable
- if link work is required beyond exception, stop and defer to Stage 3

## Procedure

1. Run:
   - `<IWP_BUILD_CMD> session diff --config .iwp-lint.yaml --preset agent-default`
2. Read:
   - changed markdown files
   - impacted behavior summary
   - suggested code paths
3. Implement code by layer:
   - `views` for rendering/interaction wiring
   - `logic` for orchestration and side effects
   - `state/models` for state ownership and data structures
4. Add/update tests if behavior changes.
5. Keep edits minimal and maintainable.

## Exit Criteria (Before Stage 3)

- behavior for current session intent is implemented
- tests updated where behavior changed
- no net new/changed `@iwp.link` in Stage 2 output (except allowed syntax-preserving exception)
- unresolved implementation blockers are explicitly listed for handoff

## Placement Guardrails

- no business logic in adapter/bootstrap/config folders
- preserve dependency direction: `views -> logic -> state/models/locales`
- avoid broad refactors not required by current intent changes
