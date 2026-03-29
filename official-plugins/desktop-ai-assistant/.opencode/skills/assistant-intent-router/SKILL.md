---
name: assistant-intent-router
description: Route DawnChat Assistant requests into Capability-First mode or Self-Evolving mode based on current capability fit.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: routing
---

## What I do

- Parse user intent for Q&A, productivity, and automation-oriented assistant tasks.
- Decide whether existing UI capabilities are sufficient.
- Select one of two execution paths: Capability-First or Self-Evolving.

## Decision Rules

- Choose Capability-First when existing capability can satisfy user intent and quality targets.
- Choose Self-Evolving when no listed capability can meet rendering needs.
- Prefer smallest viable path that preserves user outcome quality.

## Output Contract

- Return selected mode.
- Return reason in one concise paragraph.
- Return required next skill.

## Checklist

- Mode choice is tied to capability availability, not guesswork.
- Routing result is explicit and reproducible.
