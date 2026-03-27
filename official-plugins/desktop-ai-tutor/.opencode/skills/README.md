# Skills Index

## Available Skills

- `tutor-intent-router`: Classify user request and choose Rich Display or Self-Evolving path.
- `tutor-capability-discovery`: Build runtime capability map from MCP list results.
- `tutor-rich-display-execution`: Render learning content via existing capabilities only.
- `tutor-evolution-implement`: Add or modify UI capabilities through code changes.
- `tutor-evolution-verify`: Enforce typecheck/unit/build and runtime capability checks.
- `tutor-delivery-report`: Produce delivery notes with capability changes and validation status.

## Recommended Order by Task

- Rich display request:
  - `tutor-intent-router` -> `tutor-capability-discovery` -> `tutor-rich-display-execution` -> `tutor-delivery-report`
- Capability gap request:
  - `tutor-intent-router` -> `tutor-capability-discovery` -> `tutor-evolution-implement` -> `tutor-evolution-verify` -> `tutor-delivery-report`
- Regression check:
  - `tutor-evolution-verify` -> `tutor-delivery-report`
