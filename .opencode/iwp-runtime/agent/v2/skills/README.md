# Agent v2 Skills

Stage-ordered skills for the IWP runtime loop:

1. `01-intent-authoring.md`
   - convert chat intent into schema-valid `.iw` markdown
2. `02-ir-implementation.md`
   - implement `_ir` behavior for session changes (hard boundary: no net link edits)
3. `03-link-alignment.md`
   - align changed `.iw` nodes with changed `_ir` code via colocated links (minimal unblock patch only)
4. `04-reverse-review.md`
   - semantic reverse review via sidecar and output JSON judgment (read-only stage)

Use stages in order and keep responsibilities isolated.
