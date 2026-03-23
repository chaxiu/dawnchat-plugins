# Skill v2-01: Intent Authoring (.iw First)

Use this skill when user instructions require updating intent markdown under `<iwp_root>`.

## Objective

Translate chat instructions into valid `.iw` markdown that matches:

- project folder topology
- schema constraints (`tools/schema/iwp-schema.v1.json`)
- IWP layer boundaries

## In Scope

- create/update `.iw` markdown files
- choose correct layer path (`views/`, `logic/`, `state/`, `models/`, `styles/`, `locales/`, `tests/`)
- ensure required sections exist per file type schema
- add `[text]` marker only in allowed sections (`layout_tree`, `layout`, `display_rules`)

## Out of Scope

- `_ir` code implementation
- node-id link editing in code
- compiled sidecar review

## Procedure

1. Parse user instruction into intent items:
   - behavior
   - constraints
   - acceptance checks
2. Map each item to one `.iw` file path by layer semantics.
3. Validate section structure against schema:
   - required sections present
   - no illegal sections
   - one H1 per file
4. Keep markdown concise and executable as intent contract.
5. Run session diff to confirm impacted markdown scope.

## Schema Fast Reference

- `views/pages/*.md`: required `layout_tree`, `interaction_hooks`
- `views/components/*.md`: required `layout`
- `logic/*.md`: required `trigger`, `execution_flow`
- `logic/middleware/*.md`: required `trigger`, `guard_rules`, `post_redirect_rules`
- `state/*.md`: required `fields`
- `models/**/*.md`: required `entity`
- `styles/*.md`: required `theme_tokens`
- `tests/**/*.md`: required `scenario`

## Quality Bar

- intent is explicit and testable
- no code snippets intended for direct runtime execution
- no cross-layer requirement that violates `views -> logic -> state/models`
