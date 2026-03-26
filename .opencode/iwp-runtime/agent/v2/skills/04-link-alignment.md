# Skill v2-04: Link Alignment (Changed Scope Only)

Use this skill only after Stage 3 implementation is complete.

## Objective

Align changed intent nodes and changed code by adding precise, colocated `@iwp.link`.

## In Scope

- read session-scoped markdown/code diffs
- map changed nodes to changed code neighborhoods
- add/update/remove colocated links near real behavior boundaries
- apply minimal unblock patch only when mapping is impossible without tiny local edits

## Out of Scope

- broad logic rewrites
- project-wide historical backfill
- review judgments

## Link Source of Truth

- use `session diff` and compiled artifacts (`.iwp/compiled/md/**/*.iwc.md`, `.iwc.json`)
- copy exact pairs:
  - `source_path`
  - `node_id`

## Annotation Format

- JS/TS: `// @iwp.link <source_path>::<node_id>`
- Vue template: `<!-- @iwp.link <source_path>::<node_id> -->`
- CSS: `/* @iwp.link <source_path>::<node_id> */`
- Python: `# @iwp.link <source_path>::<node_id>`

## Placement Rules

1. place links near changed behavior boundaries in this session
2. avoid dumping many links in one unrelated area
3. do not create link-only sink files
4. if view and logic changed together, link both boundaries where appropriate
5. unresolved mapping must be reported explicitly as `<source_path>::<node_id>`

## Procedure

1. Ensure session preflight follows runtime bootstrap guard (`session current` then `session start` only if missing).
2. Collect changed code files from session diff.
3. Collect impacted node pairs from session diff.
4. Map each node to the nearest changed behavior boundary.
5. Add/update/remove links in changed files only.
6. Run:
   - `<IWP_BUILD_CMD> session reconcile --config .iwp-lint.yaml --preset agent-default`
7. If reconcile reports stale/invalid link pairs, run:
   - `<IWP_BUILD_CMD> session normalize-links --config .iwp-lint.yaml`
   - fallback only when needed: `<IWP_LINT_CMD> links normalize --config .iwp-lint.yaml --write`
8. Re-run:
   - `<IWP_BUILD_CMD> session reconcile --config .iwp-lint.yaml --preset agent-default`

## Minimal Unblock Patch Rule

Allowed only when both are true:

- node-to-code mapping cannot be completed with links alone
- patch is tiny and local and only for valid anchor placement

When applied:

- keep patch minimal and local
- do not expand into feature logic refactor
- record potential Stage 3 follow-up if behavior changed

## Exit Criteria

- changed nodes in scope have colocated links near changed code
- no obvious concentrated link-dump pattern
- unresolved pairs are explicitly listed
- reconcile has no blocking link diagnostics

Unresolved output format example:

```json
{
  "unresolved_pairs": [
    "pages/home.md::n.abcd"
  ]
}
```
