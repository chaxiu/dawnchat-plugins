# IWP Agent Runtime v2

This is the v2 runtime playbook for IWP coding agents.

Goal:

- make natural-language intent under `<iwp_root>` the governable source of truth and keep it continuously aligned with runtime code under `<code_roots>`
- run a stage-based delivery loop that is auditable, deterministic, and safe for partial handoff
- minimize annotation/link noise while preserving high-value traceability at real behavior boundaries
- ensure every change can pass through diff, reconcile, review, and commit with explicit failure handling

## Design Principles

1. Stage isolation:
   - each stage has one objective and explicit out-of-scope items
2. Page-first authoring:
   - intent starts from readable product pages, not fixed code-architecture folders
3. Selective annotation:
   - `@iwp` is added only where traceability value is clear; avoid over-annotation
4. Artifact-grounded decisions:
   - rely on `session diff/reconcile` and compiled artifacts, never guessed node ids
5. Human-auditable delivery:
   - outputs stay concise, reviewable, and reproducible

## Terminology

- `source_path`: the intent markdown path relative to `<iwp_root>` (for example `pages/home.md`)
- `node_id`: compiled node identifier emitted from `.iwp/compiled/md/**/*.iwc.md`
- `pair`: exact mapping tuple `<source_path>::<node_id>`
- `colocated link`: `@iwp.link` placed next to the real behavior boundary in changed code
- `sidecar`: compiled code artifact under `.iwp/compiled/code/_ir/**` used for reverse review
- `IWP_NODE_CONTEXT`: sidecar-injected context block containing linked node source and semantic text

## Runtime Discovery (Do Not Hardcode)

Resolve from `.iwp-lint.yaml`:

- `iwp_root` as intent root
- `code_roots` as implementation roots
- `compiled.dir` as compiled artifact root when configured
- `execution_presets` as command defaults

Fallback values are allowed only when config fields are missing:

- `<iwp_root>`: `InstructWare.iw`
- `<code_roots>`: `_ir/`
- `<compiled_dir>`: `.iwp/compiled`

Fallback handling rule:

- when config is missing or ambiguous, record fallback assumptions in handoff note
- if artifact signals conflict, resolve conflict before continuing to next stage

## Command Policy

Use runtime aliases:

- `<IWP_BUILD_CMD>` default `uv run iwp-build`
- `<IWP_LINT_CMD>` default `uv run iwp-lint`

Primary loop:

1. `<IWP_BUILD_CMD> session current --config .iwp-lint.yaml --preset agent-default`
2. Start a session only when no open session exists:
   - `<IWP_BUILD_CMD> session start --config .iwp-lint.yaml --preset agent-default --json out/session-start.json`
3. `<IWP_BUILD_CMD> session diff --config .iwp-lint.yaml --preset agent-default`
4. Run stage skills in order (Stage 1 -> 2 -> 3 -> 4 -> 5)
5. `<IWP_BUILD_CMD> session reconcile --config .iwp-lint.yaml --preset agent-default`
   - if stale/invalid links are reported, run `<IWP_BUILD_CMD> session normalize-links --config .iwp-lint.yaml` then reconcile again
6. `<IWP_BUILD_CMD> session commit --config .iwp-lint.yaml --preset ci-strict`

Session bootstrap guard:

- run `session current` first and start a new session only when no open session exists
- if `session start` returns "open session already exists", continue with `session diff` on current session

agent-default runtime notes:

- `session diff` uses `--format both` and writes `out/session-diff.json` on each run (replace mode)
- `session reconcile` uses `--format both` and writes `out/session-reconcile.json` on each run (replace mode)
- `session reconcile` uses `--min-severity error`, so warning-only diagnostics are hidden in text-first output by default

## Quick Failure Triage

When reconcile or review gates fail, apply this order:

1. Session state check:
   - run `session current`; if no open session, start one then re-run `session diff`
2. Pair validity check:
   - verify each failing pair uses exact `<source_path>::<node_id>` from compiled artifacts
3. Link freshness check:
   - run `session normalize-links` when stale/invalid links are reported, then re-run `session reconcile`
4. Placement check:
   - move concentrated links to real behavior boundaries; avoid link sink patterns
5. Unresolved handoff:
   - if mapping is still unclear, output unresolved pairs explicitly and stop guessing

## Stage Router (v2, Five Stages)

Use exactly one active stage at a time.

- Stage 1 (`skills/01-page-intent-authoring.md`)
  - trigger: user gives requirements but does not provide usable intent pages
  - role: product manager
  - optional: yes
- Stage 2 (`skills/02-intent-annotation.md`)
  - trigger: Stage 1 intent is ready and linkability needs better semantic anchors
  - role: developer reviewing intent
  - optional: yes
- Stage 3 (`skills/03-ir-implementation.md`)
  - trigger: intent is accepted for this session (user-authored or agent-authored)
  - role: developer implementing code
  - optional: no
- Stage 4 (`skills/04-link-alignment.md`)
  - trigger: code edits are done; align changed node ids to changed code neighborhood
  - role: developer aligning trace links
  - optional: no
- Stage 5 (`skills/05-reverse-review.md`)
  - trigger: links are aligned; verify node intent and code behavior match
  - role: reviewer
  - optional: no

## Entry Modes (Partial Handoff Supported)

User may complete earlier stages manually.
Agent must detect current state and continue from the right stage:

- If user already wrote valid page-first intent, start from Stage 3.
- If user asks agent to draft intent from raw requirements, start from Stage 1.
- If user asks for stronger trace semantics on freshly authored pages, include Stage 2.
- If user already updated `.iw` and `_ir` code, start from Stage 4.
- If user only needs validation/review, start from Stage 5.

Before execution, agent should resolve from artifacts first:

- what has already been completed in this session
- which stage is requested now
- which outputs are expected for this handoff
- prefer deterministic defaults and record assumptions in handoff note when artifacts are incomplete
- if artifact evidence is conflicting, stop stage transition and resolve conflict explicitly

## Non-Negotiable Rules

- Do not edit `.iwp/compiled/**` manually.
- Do not guess node ids in any stage.
- Do not hardcode runtime roots or command presets when `.iwp-lint.yaml` provides them.
- Stage 2 annotations must improve traceability, not enforce rigid authoring style.
- Stage 2 should prefer list-top single-line token for same-type list blocks.
- Stage 3 must focus on implementation quality and architecture fitness.
- Stage 4 link edits must stay near changed code boundaries; no link sink blocks.
- Stage 5 checks only "node intent vs code behavior match" for in-scope changed links.
- If mapping is unclear, output unresolved pairs explicitly and stop guessing.

## Stage Boundary Contract (Hard)

Apply this contract in every session:

- Stage 1 MUST NOT modify `_ir/**` runtime code.
- Stage 2 MUST NOT modify `_ir/**` runtime code.
- Stage 3 MUST NOT add/remove/update `@iwp.link` (except syntax-preserving edits required to keep file parseable).
- Stage 4 MUST focus on links; logic changes are not allowed unless a minimal unblock patch is required for valid mapping.
- Stage 5 MUST NOT change source code or links; review output only.

Handoff checks:

- Stage 1 -> Stage 2: page-first intent is readable and structurally valid.
- Stage 2 -> Stage 3: list-top token usage is preferred for same-type lists; annotation scope is minimal and intentional.
- Stage 3 -> Stage 4: implementation is complete and Stage 3 has no net new/changed `@iwp.link`.
- Stage 4 -> Stage 5: links are colocated and reconcile has no blocking link diagnostics.
- Stage 5 -> delivery: JSON review report is present and machine-readable.

On boundary conflict:

- stop current stage
- emit reason and unresolved items
- route to the correct stage instead of patching across boundaries
- unresolved mapping output should use exact `<source_path>::<node_id>` format

## Required Outputs by Stage

- Stage 1: page-first `.iw` intent markdown aligned with current protocol
- Stage 2: minimal `@iwp` annotation updates on necessary nodes only
- Stage 3: updated `_ir` code and tests, no mandatory link editing
- Stage 4: colocated link updates limited to changed code neighborhood
- Stage 5: JSON review report using template `templates/review-report.v1.json` unless project overrides

## Minimal Delivery Checklist

- Session has no blocking errors on reconcile/verify gate.
- Changed intent nodes have valid colocated links after Stage 4.
- Stage 5 JSON review report exists and marks pass/fail with reasons.
- If fail: include exact `<source_path>::<node_id>` and reason.
