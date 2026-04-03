import type { UiCapabilityHandler, UiCapabilityRegistration } from "../capabilities";
import { listViewRegistrations } from "./registry";
import type { ViewManifestSnapshot } from "./manifest";
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

function buildViewDescribeSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      view_id: { type: "string" },
    },
  };
}

function buildViewCapabilityInvokeContract(viewId: string) {
  return {
    action_type: "view.capability.invoke",
    payload_example: {
      view_id: viewId,
      capability_id: "<capability_id>",
      input: {},
    },
    note: "Use capabilities[].capability_id as the identifier and place business parameters inside payload.input.",
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

function externalizeActiveManifest(activeManifest: ViewManifestSnapshot | null) {
  if (!activeManifest) {
    return null;
  }
  return {
    ...activeManifest,
    capabilities: activeManifest.capabilities.map(externalizeCapabilityDefinition),
  };
}

function buildViewDescribeItem(registration: ReturnType<typeof listViewRegistrations>[number]) {
  return {
    view_id: registration.view_id,
    resource_type: registration.resource_type,
    title: registration.title,
    route_name: registration.route.name,
    route_path: registration.route.full_path,
    state_mode: registration.state_mode,
    anchors: registration.anchors.map((anchor) => ({ ...anchor })),
    capabilities: registration.capabilities.map(externalizeCapabilityDefinition),
    capability_invoke_contract: buildViewCapabilityInvokeContract(registration.view_id),
    interaction_hints: cloneViewInteractionHints(registration.interaction_hints),
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
    resource_type: registration.resource_type,
    state_mode: registration.state_mode,
    description: interactionHints?.interaction_intent || registration.title,
    is_active: registration.view_id === activeViewId,
    capabilities: registration.capabilities.map(externalizeCapabilityDefinition),
    capability_invoke_contract: buildViewCapabilityInvokeContract(registration.view_id),
  };
  if (Array.isArray(interactionHints?.recommended_flow) && interactionHints.recommended_flow.length > 0) {
    item.recommended_flow = [...interactionHints.recommended_flow];
  }
  if (item.is_active && Object.keys(currentSummary).length > 0) {
    item.current_state_summary = { ...currentSummary };
  }
  return item;
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
            name: "assistant.view.describe",
            description: "Inspect one specific view definition or the current active view state.",
            input_schema: buildViewDescribeSchema(),
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
    const requestedViewId = typeof payload.view_id === "string" ? payload.view_id.trim() : "";
    const currentSnapshot = deps.getViewStateSnapshot();
    const guideState = deps.getGuideStateSnapshot?.() || null;
    const taskProgress = deps.getTaskProgressSnapshot?.() || null;
    const activeResourceContext = deps.getActiveResourceContextSnapshot?.() || null;
    const continuation = deps.getContinuationSnapshot?.() || null;
    const requestedRegistration = requestedViewId
      ? listViewRegistrations().find((registration) => registration.view_id === requestedViewId)
      : null;
    const requestedView = requestedRegistration ? buildViewDescribeItem(requestedRegistration) : null;

    return {
      ok: true,
      data: {
        active_view_id: currentSnapshot.active_view_id,
        active_route_name: currentSnapshot.active_manifest?.route_name || "",
        active_route_path: currentSnapshot.active_manifest?.route_path || "",
        active_anchor: currentSnapshot.active_anchor,
        current_resource: currentSnapshot.current_resource,
        current_resource_summary: currentSnapshot.active_manifest?.state_summary || {},
        active_manifest: externalizeActiveManifest(currentSnapshot.active_manifest),
        view_state_version: currentSnapshot.view_state_version,
        guide_state: guideState,
        task_progress: taskProgress,
        active_resource_context: activeResourceContext,
        continuation,
        requested_view: requestedView,
      },
    };
  };

  return {
    definition: {
      name: "assistant.view.describe",
      description: "Describe registered views and return the current assistant-facing runtime state",
      input_schema: buildViewDescribeSchema(),
    },
    handler,
  };
}
