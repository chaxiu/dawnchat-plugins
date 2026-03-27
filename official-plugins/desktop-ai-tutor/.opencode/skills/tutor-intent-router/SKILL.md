---
name: tutor-intent-router
description: Route tutor requests into Rich Display mode or Self-Evolving mode based on current capability fit.
compatibility: opencode
metadata:
  audience: plugin-developers
  workflow: routing
---

## What I do

- Parse user intent for knowledge Q&A and coaching tasks.
- Decide whether existing UI capabilities are sufficient.
- Select one of two execution paths: Rich Display or Self-Evolving.

## Decision Rules

- Choose Rich Display when existing capability can satisfy presentation quality.
- Choose Self-Evolving when no listed capability can meet rendering needs.
- Prefer smallest viable path that preserves user understanding quality.

## Output Contract

- Return selected mode.
- Return reason in one concise paragraph.
- Return required next skill.

## Checklist

- Mode choice is tied to capability availability, not guesswork.
- Routing result is explicit and reproducible.
