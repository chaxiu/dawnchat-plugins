# DawnChat Assistant Operating Contract

## Scope

These rules apply to the `desktop-ai-assistant` template workspace only.

## Mission

- Build a self-evolving DawnChat Assistant plugin template for broad desktop use cases.
- Keep Q&A quality strong by default while supporting task execution and automation needs.
- Expand capabilities through safe code evolution when existing functions cannot satisfy requests.
- Keep outputs concise, accurate, and directly actionable.

## Operating modes

- **Capability-First:** reuse existing UI capabilities before changing code.
- **Self-Evolving:** add or update capability code only when required.

## Agent main path (read this first)

Work in this order; **`assistant.runtime.bootstrap`** is the canonical guide for global rules, recommended flow, and tool examples.

```mermaid
flowchart LR
  pluginId[plugin_id]
  runtimeInfo[runtime.info]
  bootstrapNode[bootstrap]
  sceneWork[list_open_describe]
  pluginId --> runtimeInfo --> bootstrapNode --> sceneWork
```

1. **`plugin_id`**
   - In this workspace, use **`manifest.json` → top-level `id`** for every `dawnchat.ui.*` call unless the host session injects another authoritative id.
   - Never infer `plugin_id` from folder names or path shapes; on `plugin_not_found`, re-read `manifest.json` and the host plugin list.

2. **`dawnchat.ui.runtime.info`**
   - Call with the same `plugin_id` to confirm the host recognizes the plugin and to read preview/HMR/MCP diagnostics.
   - This call **does not** discover `plugin_id` from nothing.

3. **`dawnchat.ui.capability.invoke(function=assistant.runtime.bootstrap)`**
   - Parse the result (responses may be wrapped in nested `ok` / `data`; normalize until you see `bootstrap` or equivalent).
   - Apply **`bootstrap.global_rules`**, **`bootstrap.recommended_flow`**, and **`bootstrap.tools`** before improvising call order.
   - Default cold-start order (same intent as `bootstrap.startup_sequence`): `assistant.runtime.bootstrap` → `assistant.view.list` → `view.open` → `assistant.view.describe` (skip steps that are not needed for the task, but do not skip describe before writes).

4. **Typical scene flow (after bootstrap)**
   - **`assistant.view.list`** — pick a scene / view and read catalog metadata.
   - **`view.open`** — enter the target page (`state_binding` + optional `initial_anchor` per contract).
   - **`assistant.view.describe`** — **before any write** or before steps that depend on live binding/board/cells; `view.list` is **not** a substitute for live state.

## After bootstrap: when to use which tool

| Need | Tool |
|------|------|
| Global rules, startup order, payload examples | `assistant.runtime.bootstrap` (already in main path) |
| Choose or compare scenes | `assistant.view.list` |
| Enter a scene | `view.open` |
| Live page state, anchors, `active_state_binding`, summaries, continuation | `assistant.view.describe` |
| Schema, examples, interaction hints for **one** view | `assistant.view.contract` |
| Ordered multi-step guide + view + flow | `dawnchat.ui.session.start` |
| Next move depends on a runtime event | `dawnchat.ui.event.wait` |
| Observe session lifecycle / terminal state | `dawnchat.ui.session.wait_for_end` (not a substitute for `event.wait`) |
| Inspect or stop a session | `dawnchat.ui.session.status` / `dawnchat.ui.session.stop` |

**Describe-before-write:** after the relevant `view.open`, call **`assistant.view.describe`** before any **write** `view.capability.invoke` or before `session.start` steps that depend on live state (`binding_label`, board cells, etc.). Skipping describe is high risk unless the path is provably read-only.

**Continuation:** treat `continuation` as a planning hint for the next `session.start`, `event.wait`, or `session.wait_for_end` — not as an instruction to replay stale steps. For heavy continuation recovery, prefer the **`assistant-wait-continuation-handoff`** skill.

## Host tool shape: `dawnchat.ui.capability.invoke`

The host expects **`plugin_id`**, **`function`**, and optional **`payload`** (object). Do **not** put the inner capability arguments under a top-level **`input`** on this tool.

Example (`view.open`):

```json
{
  "plugin_id": "<plugin_id>",
  "function": "view.open",
  "payload": {
    "view_id": "<view_id>",
    "state_binding": {},
    "initial_anchor": "<anchor_id>"
  }
}
```

**Legacy naming:** some catalog or older payloads may still show `resource` instead of `state_binding`. Prefer **`state_binding`**; follow `assistant.view.list` / `assistant.view.contract` for the live field names.

## Session and wait invariants

- Invoke UI functions through **`dawnchat.ui.capability.invoke`** unless the tool is explicitly `session.*` or `event.wait`.
- Prefer **direct** `capability.invoke` for single-step entry, reads, or simple mutations; use **`session.start`** only for ordered multi-step orchestration.
- **`dawnchat.ui.session.start`** does not use `idempotency_key`.
- Keep voice/narration inside **`steps[].action.payload`**; treat that payload as opaque at the host.
- On **`session_busy`**, use `session.status` or `session.stop` before starting another session.
- Primary observation fields from describe: **`task_progress`**, **`active_state_binding`**, **`current_state_binding_summary`**, **`continuation`** (legacy logs may still say `active_resource_context`).
- Do not treat runtime observation as durable truth; stateful persistence is a view/runtime concern and is not re-exposed wholesale through describe.

## Payload cheatsheet

**A. Host `dawnchat.ui.capability.invoke`** — use **`payload`** as above.

**B. `view.capability.invoke` inside `session.start.steps[].action`:**

```json
{
  "type": "view.capability.invoke",
  "payload": {
    "view_id": "tictactoe.main",
    "capability_id": "game.place_mark",
    "input": {
      "index": 6
    }
  }
}
```

- Use **`capability_id`**, not `capability`.
- Put **only** business parameters inside **`payload.input`**; keep `view_id` and `capability_id` as siblings of `input` at the action payload root.
- **Invalid:** nesting `view_id` / `capability_id` inside `input`, or duplicating identifiers.

**Event + session:** if both a runtime event and session completion matter, do not serialize `session.wait_for_end` as a stand-in for `event.wait`; overlap or parallelize observation as appropriate.

## Runtime recovery policy

Preview is usually HMR, not a full production build. If the UI is stale after edits (same `plugin_id` as `manifest.json` unless the host overrides):

1. `dawnchat.ui.runtime.info`
2. `dawnchat.ui.capability.invoke(function=assistant.view.list)`
3. `dawnchat.ui.runtime.refresh`
4. If still stale: `dawnchat.ui.runtime.restart` (dev session)
5. If Python MCP is required: confirm `python_sidecar.state=running` in runtime info
6. Re-list capabilities and invoke one capability to verify

Do not jump to a full rebuild before this sequence.

## Capability rules (plugin authors)

- Capabilities are stable and namespaced; each exposes a clear **`input_schema`** and structured success/failure.
- New scenes must appear in **`assistant.view.list`** after HMR.
- Keep **`view.open`** as the top-level page entry; treat `view.focus`, `guide.*`, and `assistant.session_step_*` as runtime execution details, not the main catalog.
- Do not reintroduce legacy card-only capabilities such as `assistant.render_card` / `assistant.clear_cards`.
- Prefer page-local mutations via **`view.capability.invoke`** and scene semantics via **`assistant.view.describe`**.
- Prefer view-embedded **interaction hints** over a new skill per view.

## Evolution guardrails (MVP)

- Allowed edit scope: `_ir/frontend/web-src/src/**`, `_ir/frontend/web-src/package.json`, `_ir/backend/**`, `_ir/python/**`.
- No duplicated orchestration paths; do not change host-level routing/protocol contracts from this workspace.

## Prompt, skills, and media

- This plugin uses workspace **`AGENTS.md`** and **`.opencode/skills`**; keep them aligned with runtime behavior.
- Separate workflow skills from evaluation skills (evaluation = self-check / acceptance only).
- New view work: **`assistant-new-view-authoring`**; broader evolution: **`assistant-evolution-implement`**.
- Python sidecar is available via host-injected `dawnchat_plugin_python`; validate sidecar state before relying on Python tools.
- **Media:** do not pass local absolute paths to the iframe UI as render sources; use web-accessible URLs or brokered assets.

## Verification and delivery

- Before delivery: frontend `typecheck`, `test:unit`, `build`; backend `typecheck`, `test:unit` when backend changed.
- Smoke at least one flow: list capabilities → invoke one → confirm UI outcome.
- Delivery notes: what changed, what was verified, remaining risks.

## Implementation reference (optional)

- Bootstrap data and describe schemas: `assistant-core` view runtime (e.g. `runtime.describe.ts`).
- Desktop wiring: `_ir/frontend/web-src/src/runtime/bootstrap/`, `view/registry.ts`, guide runtime/actions, `cards/registry.ts`, reference registration e.g. `views/pages/word/wordMainViewRegistration.ts`.
