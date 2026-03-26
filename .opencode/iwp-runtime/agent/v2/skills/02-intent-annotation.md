# Skill v2-02: Intent Annotation Review (`@iwp`)

Use this skill after Stage 1 only when annotation value is clear.

## Objective

Improve traceability by adding minimal, high-value `@iwp` annotations to intent nodes.

## Role

Act as a developer reviewing intent quality for downstream implementation and linking.

## In Scope

- add or refine `@iwp` on important nodes
- use optional parameters (`type`, `kind`, `file`, `section`) only where useful
- keep annotation footprint intentionally small
- preserve original business wording as much as possible

## Out of Scope

- `_ir` code implementation
- `@iwp.link` code annotation edits
- rewriting user-authored intent style without clear need

## Annotation Policy

- annotate behavior first, not prose first
- use `@iwp` only for runtime-impacting intent: trigger/output, state constraints, state update rules, critical guardrails; page-structure nodes should also keep annotations for structure-to-code traceability
- use parameterized forms only when they improve routing or validation clarity
- avoid annotating every line
- retain `@no-iwp` where content is explicitly non-runtime or draft-only
- prefer list-top single-line token for same-type list blocks
- keep H2-level annotation for backward compatibility only, not as default
- list-top token must be a standalone line and be placed immediately before the target list block
- do not place token on prose line when expecting list inheritance
- when a list contains mixed semantic kinds, annotate each item explicitly
- use `@no-iwp` on list items that are exceptions under an annotated scope

## Priority and Scope Rule

- apply this precedence strictly: item `@no-iwp` > item `@iwp(...)` > list-top token > inherited H2 `@iwp(...)`
- if list-top token exists, it applies only to the next list block
- if H2-level annotation exists, treat it as broad fallback and narrow it with item-level overrides
- if scope is unclear, remove broad annotation and add explicit item-level annotation only

## Density Control Rule

- default strategy: minimum viable annotation set
- do not annotate `data_bindings` locale lists unless runtime behavior depends on locale file identity
- do not annotate `display_rules` key-inventory lists by default
- do not annotate acceptance bullet lists by default
- if a section already has one high-quality behavior anchor, avoid adding parallel low-value anchors
- target outcome: links should cluster around behavior boundaries, not around every document bullet

## Annotation Decision Flow

1. Identify candidate nodes from changed markdown.
2. Classify each node as behavior-critical, structural-supporting, or prose-only.
3. Keep behavior-critical nodes and page-structure nodes by default.
4. Add structural-supporting nodes only when they are required for deterministic implementation or review.
5. Exclude prose-only nodes with no annotation.
6. Re-check whether generated nodes would create concentrated link-dump risk in code; if yes, reduce annotations and keep strongest anchors only.

## Procedure

1. Ensure session preflight follows runtime bootstrap guard (`session current` then `session start` only if missing).
2. Read updated pages and identify runtime-impacting nodes.
3. Add `@iwp` only to nodes that matter for traceability and implementation.
4. Add optional parameters only when ambiguity remains without them.
5. Apply density control and remove low-value annotations before finishing.
6. Run `session diff` to verify scope and avoid accidental broad edits.

## Quality Bar

- annotations are selective, purposeful, and consistent
- intent readability remains high after annotation
- no `_ir` files are changed in this stage
- annotation set is sparse enough to avoid link-dump patterns in Stage 4
