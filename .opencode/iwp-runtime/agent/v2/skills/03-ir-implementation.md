# Skill v2-03: IR Implementation (Code Quality First)

Use this skill when intent is accepted for this session.

## Objective

Implement runtime behavior in `_ir` from session intent changes with strong architecture and code quality.

## In Scope

- read `session diff` impacted nodes and changed intent files
- implement or refactor `_ir` code and tests
- design reasonable code structure for maintainability
- preserve dependency direction and boundary clarity

## Out of Scope

- editing `@iwp.link` annotations
- reverse-review judgment output

## Core Rule

This stage is implementation-only:

- MUST NOT add/remove/update any `@iwp.link`
- only exception: syntax-preserving edit required to keep file parseable
- if link work is needed beyond exception, stop and defer to Stage 4

## Procedure

1. Ensure session preflight follows runtime bootstrap guard (`session current` then `session start` only if missing).
2. Run:
   - `<IWP_BUILD_CMD> session diff --config .iwp-lint.yaml --preset agent-default`
3. Read:
   - changed markdown pages
   - impacted node summary
   - suggested code paths
4. Implement behavior in `_ir` with maintainable structure.
5. Add or update tests for changed behavior.
6. Keep edits focused on this session scope.

## Placement Guardrails

- avoid putting business logic into adapter/bootstrap/config-only folders
- preserve dependency direction: `views -> logic -> state/models/locales`
- avoid broad refactors not required by current intent changes

## Quality Bar

- behavior fully reflects current session intent
- code architecture is reasonable for expected complexity
- tests cover changed behavior where applicable
- no net new/changed `@iwp.link` in this stage output
- unresolved implementation blockers are explicitly listed for Stage 4/5 handoff
