# IWP Agent Runtime v2

This is the v2 runtime playbook for IWP coding agents.

Goal:

- keep user intent, `.iw` markdown, and `_ir` code aligned in one controlled loop
- separate "intent authoring", "code implementation", "link alignment", and "reverse review"
- avoid over-linking, guessed node ids, and mixed-stage responsibilities

## Design Principles

1. Stage isolation:
   - each stage has a single objective and explicit out-of-scope items
2. Runtime discovery first:
   - read `.iwp-lint.yaml` before any path or command decision
3. Artifact-grounded decisions:
   - rely on `session diff/reconcile` and compiled outputs, never memory guesses
4. Human-readable contracts:
   - keep markdown and review outputs concise and auditable

## Runtime Discovery (Do Not Hardcode)

Resolve from `.iwp-lint.yaml`:

- `iwp_root` as intent root
- `code_roots` as implementation roots
- `compiled.dir` as compiled artifact root
- `execution_presets` as command defaults

Fallback values are allowed only when config is missing and user confirms:

- `<iwp_root>`: `InstructWare.iw`
- `<code_roots>`: `_ir/`
- `<compiled_dir>`: `.iwp/compiled`

## Command Policy

Use runtime aliases:

- `<IWP_BUILD_CMD>` default `uv run iwp-build`
- `<IWP_LINT_CMD>` default `uv run iwp-lint`

Primary loop:

1. `<IWP_BUILD_CMD> session start --config .iwp-lint.yaml --preset agent-default --json out/session-start.json`
2. `<IWP_BUILD_CMD> session diff --config .iwp-lint.yaml --preset agent-default`
3. Run stage skills in order (Stage 1 -> 2 -> 3 -> 4)
4. `<IWP_BUILD_CMD> session reconcile --config .iwp-lint.yaml --preset agent-default`
5. `<IWP_BUILD_CMD> session commit --config .iwp-lint.yaml --preset ci-strict`

Session bootstrap guard:

- run `session current` first and start a new session only when no open session exists
- if `session start` returns "open session already exists", continue with `session diff` on current session

agent-default runtime notes:

- `session diff` uses `--format both` and writes `out/session-diff.json` on each run (replace mode).
- `session reconcile` uses `--format both` and writes `out/session-reconcile.json` on each run (replace mode).
- `session reconcile` uses `--min-severity error`, so warning-only diagnostics are hidden in text-first output by default.

## Stage Router

Use exactly one active stage at a time.

- Stage 1 (`skills/01-intent-authoring.md`)
  - trigger: user asks to change product intent or behavior in `.iw`
- Stage 2 (`skills/02-ir-implementation.md`)
  - trigger: `.iw` is accepted for this session; now implement `_ir` behavior only
- Stage 3 (`skills/03-link-alignment.md`)
  - trigger: `_ir` code edits are done; now add/update/remove `@iwp.link` near changed code
- Stage 4 (`skills/04-reverse-review.md`)
  - trigger: run reverse review on compiled code sidecar and emit JSON judgment

## Entry Modes (Partial Handoff Supported)

User may complete earlier stages manually.
Agent must detect current state and continue from the right stage:

- If user already updated `.iw`, start from Stage 2.
- If user already updated `.iw` and `_ir` code, start from Stage 3.
- If user only needs validation/review, start from Stage 4.

Before execution, agent should resolve from artifacts first:

- what has already been completed in this session
- which stage is now requested
- which outputs are expected for this handoff
- ask human confirmation only when artifact signals conflict or are incomplete

## Non-Negotiable Rules

- Do not edit `.iwp/compiled/**` manually.
- Do not add guessed node ids during Stage 2.
- Stage 3 link edits must stay near changed code boundaries.
- Reverse review in Stage 4 checks only "node intent vs code behavior match".
- If mapping is unclear, output unresolved pairs explicitly and stop guessing.

## Stage Boundary Contract (Hard)

Apply this contract in every session:

- Stage 1 MUST NOT modify `_ir/**` runtime code.
- Stage 2 MUST NOT add/remove/update `@iwp.link` (except syntax-preserving edits required to keep file parseable).
- Stage 3 MUST focus on links; logic changes are not allowed unless a minimal unblock patch is required for valid mapping.
- Stage 4 MUST NOT change source code or links; review output only.

Handoff checks:

- Stage 1 -> Stage 2: `.iw` structure is schema-valid for changed files.
- Stage 2 -> Stage 3: implementation is complete and Stage 2 has no net new/changed `@iwp.link`.
- Stage 3 -> Stage 4: links are colocated and reconcile has no blocking link diagnostics.
- Stage 4 -> delivery: JSON review report is present and machine-readable.

On boundary conflict:

- stop current stage
- emit reason and unresolved items
- route to the correct stage instead of patching across boundaries

## Required Outputs by Stage

- Stage 1: updated `.iw` markdown aligned with schema
- Stage 2: updated `_ir` code and tests, no mandatory link editing
- Stage 3: colocated link updates limited to changed code neighborhood
- Stage 4: JSON review report using template `templates/review-report.v1.json`

## Minimal Delivery Checklist

- Session has no blocking errors on reconcile/verify gate.
- Changed intent nodes have valid colocated links after Stage 3.
- Stage 4 JSON review report exists and marks pass/fail with reasons.
- If fail: include exact `<source_path>::<node_id>` and reason.

## Simulated User Prompt (Example)

`Please update homepage intent and implementation for a new long-term vision section, then align links for this session and return a reverse review JSON report.`

## Minimal Execution Example (Single Session, Non-Normative)

This example shows process shape only.
Always resolve real paths from `.iwp-lint.yaml` first.

Scenario (variable-first):

- intent file: `<iwp_root>/views/pages/home.md`
- code file: `<code_roots[0]>/src/views/pages/HomePage.vue`
- session node example: `views/pages/home.md::n.fddd`

### Stage 1 output (.iw intent)

- update `<iwp_root>/views/pages/home.md`
- add a structure item under `## Layout Tree`:
  - `- Long-term vision section:`
  - optional text bullets with `[text]` marker

### Stage 2 output (_ir implementation, no link edits)

- update `<code_roots[0]>/src/views/pages/HomePage.vue`
- implement or adjust the corresponding vision section rendering/behavior
- do not add `@iwp.link` in this stage

### Stage 3 output (link alignment, session-scoped)

- run `session diff` and map changed node to changed code neighborhood
- add colocated annotation near changed section:
  - `<!-- @iwp.link views/pages/home.md::n.fddd -->`
- run `session reconcile` and ensure no blocking link diagnostics

### Stage 4 output (reverse review JSON)

- run build and read sidecar:
  - `<compiled_dir>/code/<code_roots[0]>/src/views/pages/HomePage.vue`
- compare `IWP_NODE_CONTEXT` text with adjacent code behavior
- output JSON report (shape from `agent/v2/templates/review-report.v1.json`):
  - `result.qualified`
  - `checks[]` with `status/source_path/node_id/code_path/reason/evidence_snippet`
