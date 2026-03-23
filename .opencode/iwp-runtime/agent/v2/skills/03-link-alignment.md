# Skill v2-03: Link Alignment (Session-Scoped)

Use this skill only after Stage 2 code implementation is complete.

## Objective

Align `.iw` changed nodes and `_ir` changed code by adding/removing/updating colocated `@iwp.link`.

## In Scope

- read session-scoped markdown/code diffs
- map changed nodes to changed code neighborhoods
- apply precise inline link annotations
- perform minimal unblock patch only when mapping is impossible without tiny code adjustment

## Out of Scope

- broad implementation rewrites
- full-project backfill of historical uncovered nodes
- review of non-link quality dimensions

## Link Source of Truth

- use `session diff` and compiled artifacts (`.iwp/compiled/md/**/*.iwc.md`, `.iwc.json`)
- copy exact pair:
  - `source_path`
  - `node_id`

## Annotation Format

- JS/TS: `// @iwp.link <source_path>::<node_id>`
- Vue template: `<!-- @iwp.link <source_path>::<node_id> -->`
- CSS: `/* @iwp.link <source_path>::<node_id> */`
- Python: `# @iwp.link <source_path>::<node_id>`

## Placement Rules

1. only annotate near changed code boundaries in current session
2. prefer behavior/structure anchors over dense text-line anchors
3. do not create link-only sink files
4. if a view delegates to logic and both changed, place links on both relevant boundaries
5. unresolved mapping must be reported explicitly as `<source_path>::<node_id>`

## Procedure

1. Collect changed code files from session diff.
2. Collect impacted node pairs from session diff.
3. Match each node to nearest changed behavior boundary.
4. Add/update/remove links in changed files only.
5. Run:
   - `<IWP_BUILD_CMD> session reconcile --config .iwp-lint.yaml --preset agent-default`
6. If reconcile shows stale/invalid link pairs (for example `IWP105`), normalize first:
   - `<IWP_LINT_CMD> links normalize --config .iwp-lint.yaml --write`
7. Re-run:
   - `<IWP_BUILD_CMD> session reconcile --config .iwp-lint.yaml --preset agent-default`

## Minimal Unblock Patch Rule

Allowed only when both conditions are true:

- node-to-code mapping cannot be completed with links alone
- patch is tiny and local (for example missing wrapper/block boundary)

When applied:

- patch only the minimal code needed for valid anchor placement
- do not expand into feature logic refactor
- record that a Stage 2 follow-up may be required if behavior changed

## Exit Criteria (Before Stage 4)

- impacted nodes in scope have colocated links near changed code
- unresolved pairs are listed explicitly as `<source_path>::<node_id>`
- reconcile has no blocking link diagnostics

Unresolved output format example:

```json
{
  "unresolved_pairs": [
    "views/pages/home.md::n.abcd"
  ]
}
```
