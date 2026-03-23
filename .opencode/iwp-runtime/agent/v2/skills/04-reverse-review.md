# Skill v2-04: Reverse Review (Node <-> Code Match Only)

Use this skill after Stage 3 link alignment.

## Objective

Review whether linked node intent matches nearby code behavior using compiled code sidecar:

- source: `.iwp/compiled/code/_ir/**`
- focus: injected `IWP_NODE_CONTEXT` blocks around linked code

This review is human-facing and semantic-only.

## Hard Scope

Check only:

- node context meaning
- adjacent code behavior
- whether they match

Do not check:

- programming language syntax validity
- style/performance/testing coverage
- unrelated architecture concerns

MUST NOT:

- change source files under `<iwp_root>` or `<code_roots>`
- modify any `@iwp.link` annotations

## Procedure

1. Build latest sidecar:
   - `<IWP_BUILD_CMD> build --config .iwp-lint.yaml`
   - MUST use this build command; `iwp-lint nodes compile` is debug-only and MUST NOT replace Stage 4 entry.
2. Resolve review file scope from `session diff` (`changed_code_summary` first), then open changed sidecar files under `.iwp/compiled/code/_ir/**`.
3. For each reviewed pair:
   - read `source` and `node` from `IWP_NODE_CONTEXT`
   - compare context text with nearby code effect
4. Produce JSON report using `templates/review-report.v1.json`.

## Pass/Fail Rule

- pass: code behavior is consistent with node context
- fail: behavior mismatch, missing behavior, or wrong linkage target

On fail, include:

- `source_path`
- `node_id`
- `reason`
- `evidence_snippet`

## Exit Criteria

- JSON report is complete and parseable
- every failed check contains `source_path`, `node_id`, and actionable reason
- no source edits are made in this stage
