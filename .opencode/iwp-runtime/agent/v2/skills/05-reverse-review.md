# Skill v2-05: Reverse Review (Intent Match Verification)

Use this skill after Stage 4 link alignment.

## Objective

Verify whether linked node intent matches nearby code behavior for this session.

Primary evidence source:

- `.iwp/compiled/code/_ir/**` sidecar files
- `IWP_NODE_CONTEXT` blocks around linked code

## Role

Act as a reviewer:

- evaluate semantic match quality
- reject superficial link placement patterns
- produce auditable JSON output

## Hard Scope

Check only:

- node intent meaning
- adjacent code behavior
- whether they match
- whether link placement looks genuinely local instead of concentrated dumping

Do not check:

- broad style/performance concerns
- unrelated architecture topics outside changed scope

MUST NOT:

- change source files under `<iwp_root>` or `<code_roots>`
- modify any `@iwp.link` annotations

## Procedure

1. Ensure session preflight follows runtime bootstrap guard (`session current` then `session start` only if missing).
2. Build latest artifacts:
   - `<IWP_BUILD_CMD> build --config .iwp-lint.yaml`
   - MUST use build command above; debug compile commands must not replace Stage 5 entry
3. Resolve review scope from `session diff` (`changed_code_summary` first) and `session reconcile` outputs.
4. For each reviewed pair:
   - read `source` and `node` from `IWP_NODE_CONTEXT`
   - compare context text with nearby code behavior
   - assess whether link location is meaningfully adjacent
5. Produce JSON report using `templates/review-report.v1.json` unless project overrides.
   - default output path: `out/review-report.v1.json`

## Pass/Fail Rule

- pass: code behavior is consistent with node context and link placement is reasonable
- fail: behavior mismatch, missing behavior, wrong linkage target, or concentrated link-dump pattern

On fail, include:

- `source_path`
- `node_id`
- `reason`
- `evidence_snippet`

## Exit Criteria

- JSON report is complete and parseable
- each failed item contains actionable reason and evidence
- no source edits are made in this stage
