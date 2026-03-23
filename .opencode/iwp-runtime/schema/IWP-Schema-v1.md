# IWP Semantic Schema v1 (Implementation Profile)

**Status:** Draft v1  
**Scope:** `InstructWare.iw` compatibility profile  
**Goal:** Define canonical node structures for markdown files so tools can validate node correctness and coverage.
**Normative Source:** `tools/schema/iwp-schema.v1.json` (machine-readable SSOT)  
**This Document:** Human-readable explanation and compatibility notes.

> Note: JSON v1 intentionally stays minimal and currently only carries
> `id`, `path_patterns`, `required_sections`, `optional_sections`.
> More constraints can be introduced in v1.x/v2 after linter integration stabilizes.

---

## 1. Validation Modes

Schema validation supports two modes:

- `compat` (default): aligned with current repository content; tolerates legacy wording.
- `strict`: enforces canonical section names and field constraints in this document.

---

## 2. Global Rules

1. Every markdown file MUST start with one H1 title (`# ...`).
2. H2 section names are schema nodes and MUST match the allowed section set of the file type.
3. If a section is marked **required**, it MUST appear exactly once.
4. If a section is marked **optional**, it MAY appear at most once unless stated otherwise.
5. Unknown H2 sections SHOULD fail in `strict` mode and warn in `compat` mode.

---

## 3. File Type Schemas

## 3.1 `views/pages/*.md` (Page Schema)

### Allowed H2 Sections

- `Layout Tree` (**required**)
- `Display Rules` (optional)
- `Interaction Hooks` (**required**)

### Node Expectations

- `Layout Tree` MUST describe page structure as nested list items.
- `Interaction Hooks` MUST describe event delegation (`delegates to`) or navigation (`navigates to`).
- `Display Rules`, when present, SHOULD use normative wording (`MUST`, `SHOULD`, etc.).

### Example Files (current alignment)

- `views/pages/home.md`
- `views/pages/docs/index.md`
- `views/pages/docs/manifesto.md`
- `views/pages/docs/protocol.md`

---

## 3.2 `views/components/*.md` (Component Schema)

### Allowed H2 Sections

- `Layout` (**required**)
- `Display Rules` (optional)
- `Interaction Hooks` (**required**)

### Node Expectations

- `Layout` MUST describe component zones, slots, or rendered substructures.
- `Interaction Hooks` MUST bind events to logic entries.
- `Display Rules` SHOULD contain rendering constraints and presentation invariants.

### Example Files (current alignment)

- `views/components/top_navbar.md`
- `views/components/doc_reader.md`
- `views/components/theme_switcher.md`
- `views/components/lang_switcher.md`
- `views/components/doc_card.md`

---

## 3.3 `logic/**/*.md` (Logic Flow Schema)

### Allowed H2 Sections

- `Trigger` (**required**)
- `Input` (optional)
- `Execution Flow` (**required**)
- `Guard Rules` (optional)
- `Post-Redirect Rules` (optional)

### Node Expectations

- `Trigger` MUST define event source or lifecycle source.
- `Execution Flow` MUST be ordered steps (`1.`, `2.`, ...).
- `Input`, when present, MUST define accepted payload fields or domain values.
- `Guard Rules` and `Post-Redirect Rules` are used by middleware-like files.

### Example Files (current alignment)

- `logic/docs/on_open_doc.md`
- `logic/docs/on_reader_scroll.md`
- `logic/ui/on_switch_language.md`
- `logic/ui/on_toggle_theme.md`
- `logic/system/on_app_start.md`
- `logic/middleware/route_fallback.md`

---

## 3.4 `state/*.md` (State Schema)

### Allowed H2 Sections

- `Fields` (**required**)
- `Initialization Rules` (optional)
- `Derivation Rules` (optional)
- `Update Rules` (optional)
- `Runtime Guarantees` (optional)

### Node Expectations

- `Fields` MUST enumerate state keys and expected type/domain constraints.
- Any rule section SHOULD state deterministic update or derivation behavior.

### Example Files (current alignment)

- `state/ui_prefs.md`
- `state/docs_runtime.md`

---

## 3.5 `models/**/*.md` (Data Model Schema)

### Allowed H2 Sections

- `Entity: ...` (**at least one required**)
- `Seed Data: ...` (optional, multiple allowed)
- `Purpose` (optional)
- `Canonical Extraction Rules` (optional)
- `Derived TOC Rules` (optional)

### Node Expectations

- Each `Entity: ...` section MUST define structured fields.
- `Seed Data` sections SHOULD match entity fields.
- Rule sections SHOULD be deterministic and tool-verifiable where possible.

### Example Files (current alignment)

- `models/content/doc_catalog.md`
- `models/content/home_content.md`

---

## 3.6 `tests/**/*.md` (NL-BDD Test Schema)

### Allowed H2 Sections

- `Scenario ...` (**at least one required**)

### Node Expectations

- Scenario body SHOULD use Given/When/Then narrative assertions.
- Each scenario SHOULD validate observable behavior, not implementation detail.

### Example Files (current alignment)

- `tests/docs/test_docs_reader.md`
- `tests/ui/test_route_guard.md`
- `tests/ui/test_theme_and_language.md`

---

## 3.7 `locales/*.md` (Locale Pack Schema)

### Allowed H2 Sections

- Free-form section groups are allowed in v1 (`compat` first).
- Recommended groups: `Navigation`, `Common Actions`, `Docs`, `Home`.

### Node Expectations

- Each list item SHOULD be key-value style: `` `key.path`: localized text ``.
- Key names SHOULD be stable across locales.

### Example Files (current alignment)

- `locales/common.zh-CN.md`
- `locales/common.en-US.md`

---

## 3.8 `styles/*.md` (Design System Schema)

### Allowed H2 Sections

- `Brand Intent` (optional)
- `Theme Tokens` (optional)
- `Typography` (optional)
- `Layout Rules` (optional)

### Node Expectations

- If `Theme Tokens` exists, entries SHOULD use token-key style.
- Rules SHOULD be implementation-agnostic and reusable.

### Example Files (current alignment)

- `styles/design_system.md`

---

## 3.9 `system.md` (System Context Schema)

### Allowed H2 Sections

- `Product Identity` (**required**)
- `Global Rules` (**required**)
- `Information Architecture` (**required**)
- `Runtime Guarantees` (**required**)

### Node Expectations

- `Global Rules` SHOULD use normative wording (`MUST`, `SHOULD`, etc.).
- `Information Architecture` SHOULD enumerate route topology.
- `Runtime Guarantees` SHOULD define initialization and fallback behavior.

### Example Files (current alignment)

- `system.md`

---

## 3.10 `architecture.md` (Architecture Blueprint Schema)

### Allowed H2 Sections

- `Architecture Scope` (**required**)
- `State Management` (**required**)
- `Rendering Strategy` (**required**)
- `Event Orchestration` (**required**)
- `Boundary Rules` (optional)

### Node Expectations

- `Architecture Scope` MUST define where architectural constraints apply.
- `State Management` MUST define authoritative ownership and mutation boundaries.
- `Rendering Strategy` MUST define rendering responsibilities for pages/components.
- `Event Orchestration` MUST define event delegation and cross-module coordination rules.
- `Boundary Rules`, when present, SHOULD declare prohibited coupling and side effects.

### Example Files (current alignment)

- `architecture.md`

---

## 4. Linter Integration Contract (Next Step)

A future schema validator in `tools/iwp_lint` SHOULD add rule families:

- `IWP201` missing required section
- `IWP202` illegal section for file type
- `IWP203` invalid section cardinality
- `IWP204` invalid section structure (e.g., non-ordered `Execution Flow`)
- `IWP205` invalid scenario grammar (tests)

This schema file is the normative source for those checks.

---

## 5. Compatibility Notes for Current Docs

1. This schema intentionally matches the current `InstructWare.iw` shape first.
2. Some wording in existing files is treated as `compat`-valid even if strict canonical wording will be introduced later.
3. When moving to strict mode, introduce migration patches file-by-file to avoid breaking all docs at once.

