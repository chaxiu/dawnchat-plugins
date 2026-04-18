import type { UiCapabilityHandler, UiCapabilityRegistration } from "../capabilities";
import { listViewRegistrations } from "./registry";
import {
  type ViewRuntimeDeps,
  toRecord,
} from "./runtime.shared";
import { cloneViewInteractionHints } from "./manifest";

function buildViewListSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {},
  };
}

function buildRuntimeBootstrapSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {},
  };
}

function buildViewDescribeSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      view_id: { type: "string" },
      max_nodes: { type: "number", minimum: 1 },
      max_edges: { type: "number", minimum: 1 },
    },
  };
}

function buildViewContractSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      view_id: { type: "string" },
    },
  };
}

function buildWorkspaceGetCurrentSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {},
  };
}

function buildWorkspaceOpenSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      surface_id: { type: "string" },
      workspace_id: { type: "string" },
    },
    required: ["surface_id", "workspace_id"],
  };
}

function buildWorkspaceCheckpointSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {},
  };
}

function buildViewOpenSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      view_id: { type: "string" },
      state_binding: { type: "object" },
      initial_anchor: { type: "string" },
    },
    required: ["view_id"],
  };
}

function buildRuntimeBootstrapData() {
  return {
    startup_sequence: [
      "dawnchat.ui.capability.invoke(function=assistant.runtime.bootstrap)",
      "dawnchat.ui.capability.invoke(function=assistant.view.list)",
      "dawnchat.ui.capability.invoke(function=view.open)",
      "dawnchat.ui.capability.invoke(function=assistant.view.describe)",
    ],
    global_rules: {
      entry_rule: "Open the target view before reading scene state or planning page-local mutations.",
      single_step_rule: "Direct view entry, pure reads, and simple mutations should not use session.start unless ordered orchestration is required.",
      session_rule: "Use dawnchat.ui.session.start only for ordered multi-step orchestration that combines guide, view, or flow actions.",
      wait_rule: "When the next move depends on runtime signals, use dawnchat.ui.event.wait. Use dawnchat.ui.session.wait_for_end only as a lifecycle observer.",
      state_rule: "Treat assistant.view.describe as the authoritative assistant-facing state surface for the active scene.",
      contract_rule: "Use assistant.view.contract only when schema, examples, or scene-specific interaction rules are needed.",
    },
    recommended_flow: [
      "dawnchat.ui.capability.invoke(function=view.open)",
      "dawnchat.ui.capability.invoke(function=assistant.view.describe)",
      "decide next action based on describe output",
    ],
    tools: {
      bootstrap: {
        tool: "dawnchat.ui.capability.invoke",
        function: "assistant.runtime.bootstrap",
        payload_example: {
          plugin_id: "<plugin_id>",
          function: "assistant.runtime.bootstrap",
          payload: {},
        },
      },
      list_views: {
        tool: "dawnchat.ui.capability.invoke",
        function: "assistant.view.list",
        payload_example: {
          plugin_id: "<plugin_id>",
          function: "assistant.view.list",
          payload: {},
        },
      },
      open_view: {
        tool: "dawnchat.ui.capability.invoke",
        function: "view.open",
        payload_example: {
          plugin_id: "<plugin_id>",
          function: "view.open",
          payload: {
            view_id: "<view_id>",
            state_binding: {},
            initial_anchor: "<anchor_id>",
          },
        },
      },
      describe_view: {
        tool: "dawnchat.ui.capability.invoke",
        function: "assistant.view.describe",
        payload_example: {
          plugin_id: "<plugin_id>",
          function: "assistant.view.describe",
          payload: {
            view_id: "<view_id_optional>",
            max_nodes: 20,
            max_edges: 20,
          },
        },
      },
      view_contract: {
        tool: "dawnchat.ui.capability.invoke",
        function: "assistant.view.contract",
        payload_example: {
          plugin_id: "<plugin_id>",
          function: "assistant.view.contract",
          payload: {
            view_id: "<view_id>",
          },
        },
      },
      workspace_get_current: {
        tool: "dawnchat.ui.capability.invoke",
        function: "assistant.workspace.get_current",
        payload_example: {
          plugin_id: "<plugin_id>",
          function: "assistant.workspace.get_current",
          payload: {},
        },
      },
      workspace_open: {
        tool: "dawnchat.ui.capability.invoke",
        function: "assistant.workspace.open",
        payload_example: {
          plugin_id: "<plugin_id>",
          function: "assistant.workspace.open",
          payload: {
            surface_id: "<surface_id>",
            workspace_id: "<workspace_id>",
          },
        },
      },
      checkpoint_workspace: {
        tool: "dawnchat.ui.capability.invoke",
        function: "assistant.workspace.checkpoint",
        payload_example: {
          plugin_id: "<plugin_id>",
          function: "assistant.workspace.checkpoint",
          payload: {},
        },
      },
      session_start: {
        tool: "dawnchat.ui.session.start",
        payload_example: {
          plugin_id: "<plugin_id>",
          steps: [
            {
              id: "step-1",
              action: {
                type: "view.capability.invoke",
                payload: {
                  view_id: "<view_id>",
                  capability_id: "<capability_id>",
                  input: {},
                },
              },
            },
          ],
        },
      },
      flow_wait: {
        action_type: "flow.wait",
        note: "Use inside dawnchat.ui.session.start steps when the next lesson or interaction step depends on a matched runtime event.",
        payload_example: {
          event_types: ["<event_type>"],
          match: {},
          timeout_ms: 15000,
        },
      },
      event_wait: {
        tool: "dawnchat.ui.event.wait",
        payload_example: {
          plugin_id: "<plugin_id>",
          event_types: ["<event_type>"],
          match: {},
        },
      },
      session_wait_for_end: {
        tool: "dawnchat.ui.session.wait_for_end",
        payload_example: {
          plugin_id: "<plugin_id>",
          session_id: "<session_id>",
        },
      },
    },
  };
}

function externalizeCapabilityDefinition(
  capability: ReturnType<typeof listViewRegistrations>[number]["capabilities"][number]
) {
  return {
    capability_id: capability.id,
    mode: capability.mode,
    title: capability.title,
    description: capability.description,
    assistant_hint: capability.assistant_hint,
    input_schema: capability.input_schema ? { ...capability.input_schema } : undefined,
    affected_anchors: capability.affected_anchors ? [...capability.affected_anchors] : undefined,
    error_codes: capability.error_codes ? [...capability.error_codes] : undefined,
  };
}

function summarizeCapabilityDefinition(
  capability: ReturnType<typeof listViewRegistrations>[number]["capabilities"][number]
) {
  return {
    capability_id: capability.id,
    mode: capability.mode,
    title: capability.title,
  };
}

function buildViewDefinition(registration: ReturnType<typeof listViewRegistrations>[number]) {
  return {
    view_id: registration.view_id,
    binding_type: registration.binding_type,
    title: registration.title,
    route_name: registration.route.name,
    route_path: registration.route.full_path,
    state_mode: registration.state_mode,
    anchors: registration.anchors.map((anchor) => ({ ...anchor })),
    capabilities: registration.capabilities.map(externalizeCapabilityDefinition),
  };
}

function buildViewContract(
  registration: ReturnType<typeof listViewRegistrations>[number]
) {
  const interactionHints = cloneViewInteractionHints(registration.interaction_hints);
  return {
    view_definition: buildViewDefinition(registration),
    recommended_mode: interactionHints?.recommended_mode,
    decision_rule: interactionHints?.decision_rule,
    wait_strategy: interactionHints?.wait_strategy ? { ...interactionHints.wait_strategy } : undefined,
    key_events: Array.isArray(interactionHints?.key_events)
      ? interactionHints.key_events.map((event) => ({
          ...event,
          match_fields: event.match_fields ? [...event.match_fields] : undefined,
        }))
      : [],
    examples: Array.isArray(interactionHints?.examples)
      ? interactionHints.examples.map((example) => ({
          ...example,
          call: {
            ...example.call,
            payload: JSON.parse(JSON.stringify(example.call.payload)) as Record<string, unknown>,
          },
          then: example.then
            ? {
                ...example.then,
                payload: JSON.parse(JSON.stringify(example.then.payload)) as Record<string, unknown>,
              }
            : undefined,
        }))
      : [],
  };
}

function buildViewCatalogItem(
  registration: ReturnType<typeof listViewRegistrations>[number],
  activeViewId: string,
  currentSummary: Record<string, unknown>
) {
  const interactionHints = cloneViewInteractionHints(registration.interaction_hints);
  const item: Record<string, unknown> = {
    view_id: registration.view_id,
    title: registration.title,
    binding_type: registration.binding_type,
    state_mode: registration.state_mode,
    description: interactionHints?.interaction_intent || registration.title,
    is_active: registration.view_id === activeViewId,
    capabilities: registration.capabilities.map(summarizeCapabilityDefinition),
  }
  if (item.is_active && Object.keys(currentSummary).length > 0) {
    item.current_state_summary = { ...currentSummary };
  }
  return item;
}

function clampPositiveInteger(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(1, Math.trunc(raw));
}

function buildDescribeSummary(
  deps: ViewRuntimeDeps,
  options: Record<string, unknown>
): Record<string, unknown> {
  const currentSnapshot = deps.getViewStateSnapshot();
  const activeViewId = currentSnapshot.active_view_id;
  const registrations = listViewRegistrations();
  const activeRegistration = activeViewId
    ? registrations.find((registration) => registration.view_id === activeViewId)
    : null;
  if (!activeRegistration || !currentSnapshot.current_state_binding) {
    return currentSnapshot.active_manifest?.state_summary || {};
  }
  const describeOptions = {
    max_nodes: clampPositiveInteger(options.max_nodes, 20),
    max_edges: clampPositiveInteger(options.max_edges, 20),
  };
  if (activeRegistration.describeState) {
    return activeRegistration.describeState(
      currentSnapshot.current_state_binding,
      currentSnapshot.active_anchor,
      describeOptions
    );
  }
  return activeRegistration.getStateSummary(
    currentSnapshot.current_state_binding,
    currentSnapshot.active_anchor
  );
}

export function createRuntimeBootstrapCapabilityRegistration(
  deps: ViewRuntimeDeps
): UiCapabilityRegistration {
  const handler: UiCapabilityHandler = async () => {
    const currentSnapshot = deps.getViewStateSnapshot();
    return {
      ok: true,
      data: {
        active_view_id: currentSnapshot.active_view_id,
        bootstrap: buildRuntimeBootstrapData(),
      },
    };
  };

  return {
    definition: {
      name: "assistant.runtime.bootstrap",
      description: "Return global assistant runtime rules, startup sequence, and tool contracts",
      input_schema: buildRuntimeBootstrapSchema(),
    },
    handler,
  };
}

export function createViewListCapabilityRegistration(
  deps: ViewRuntimeDeps
): UiCapabilityRegistration {
  const handler: UiCapabilityHandler = async () => {
    const currentSnapshot = deps.getViewStateSnapshot();
    const activeViewId = currentSnapshot.active_view_id;
    const currentSummary = currentSnapshot.active_manifest?.state_summary || {};
    const views = listViewRegistrations().map((registration) =>
      buildViewCatalogItem(registration, activeViewId, currentSummary)
    );

    return {
      ok: true,
      data: {
        views,
        active_view_id: activeViewId,
        functions: [
          {
            name: "view.open",
            description: "Open one registered assistant view and optionally bind its state binding payload.",
            input_schema: buildViewOpenSchema(),
          },
          {
            name: "assistant.view.describe",
            description: "Inspect the current active view state with a lightweight assistant-facing summary.",
            input_schema: buildViewDescribeSchema(),
          },
          {
            name: "assistant.view.contract",
            description: "Inspect one specific view definition, capability schemas, events, and examples.",
            input_schema: buildViewContractSchema(),
          },
          {
            name: "assistant.workspace.get_current",
            description: "Get the current active workspace context for the active stateful surface.",
            input_schema: buildWorkspaceGetCurrentSchema(),
          },
          {
            name: "assistant.workspace.open",
            description: "Restore one workspace head into the target surface.",
            input_schema: buildWorkspaceOpenSchema(),
          },
          {
            name: "assistant.workspace.checkpoint",
            description: "Append a manual checkpoint snapshot for the active workspace (stateful view).",
            input_schema: buildWorkspaceCheckpointSchema(),
          },
        ],
      },
    };
  };

  return {
    definition: {
      name: "assistant.view.list",
      description: "List all registered assistant view scenes as a feature catalog",
      input_schema: buildViewListSchema(),
    },
    handler,
  };
}

export function createViewDescribeCapabilityRegistration(
  deps: ViewRuntimeDeps
): UiCapabilityRegistration {
  const handler: UiCapabilityHandler = async (rawPayload) => {
    const payload = toRecord(rawPayload);
    const currentSnapshot = deps.getViewStateSnapshot();
    const taskProgress = deps.getTaskProgressSnapshot?.() || null;
    const activeStateBindingContext = deps.getActiveStateBindingContextSnapshot?.() || null;
    const continuation = deps.getContinuationSnapshot?.() || null;
    const activeWorkspace = await deps.getActiveWorkspaceSnapshot?.() || null;

    return {
      ok: true,
      data: {
        active_view_id: currentSnapshot.active_view_id,
        active_anchor: currentSnapshot.active_anchor,
        current_state_binding_summary: buildDescribeSummary(deps, payload),
        view_state_version: currentSnapshot.view_state_version,
        task_progress: taskProgress,
        active_state_binding: activeStateBindingContext,
        active_workspace: activeWorkspace,
        continuation,
      },
    };
  };

  return {
    definition: {
      name: "assistant.view.describe",
      description: "Return the current assistant-facing state for the active view",
      input_schema: buildViewDescribeSchema(),
    },
    handler,
  };
}

export function createViewContractCapabilityRegistration(
  deps: ViewRuntimeDeps
): UiCapabilityRegistration {
  const handler: UiCapabilityHandler = async (rawPayload) => {
    const payload = toRecord(rawPayload);
    const requestedViewId = typeof payload.view_id === "string" ? payload.view_id.trim() : "";
    const registrations = listViewRegistrations();
    const currentSnapshot = deps.getViewStateSnapshot();
    const targetRegistration = requestedViewId
      ? registrations.find((registration) => registration.view_id === requestedViewId)
      : registrations.find((registration) => registration.view_id === currentSnapshot.active_view_id);

    return {
      ok: true,
      data: targetRegistration
        ? buildViewContract(targetRegistration)
        : {
            view_definition: null,
            key_events: [],
            examples: [],
          },
    };
  };

  return {
    definition: {
      name: "assistant.view.contract",
      description: "Return one view definition, schemas, events, and scene-specific examples",
      input_schema: buildViewContractSchema(),
    },
    handler,
  };
}
