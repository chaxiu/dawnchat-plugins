import type { UiCapabilityHandler, UiCapabilityRegistration } from "../capabilities";
import { listViewRegistrations } from "./registry";
import {
  cloneCapabilityDefinition,
  cloneResource,
  cloneSchema,
  type ViewRuntimeDeps,
  toRecord,
} from "./runtime.shared";
import { cloneViewStateSummarySchema } from "./manifest";

function buildViewDescribeSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      view_id: { type: "string" },
    },
  };
}

function buildViewDescribeItem(registration: ReturnType<typeof listViewRegistrations>[number]) {
  return {
    view_id: registration.manifest.view_id,
    resource_type: registration.manifest.resource_type,
    title: registration.manifest.title,
    route_name: registration.manifest.route_name,
    route_path: registration.manifest.route_path,
    state_mode: registration.manifest.state_mode,
    anchors: registration.manifest.anchors.map((anchor) => ({ ...anchor })),
    capabilities: registration.manifest.capabilities.map(cloneCapabilityDefinition),
    resource_contract: {
      resource_schema: cloneSchema(registration.manifest.resource_contract.resource_schema),
      open_payload_schema: cloneSchema(registration.manifest.resource_contract.open_payload_schema),
      default_resource: cloneResource(registration.manifest.resource_contract.default_resource),
      error_codes: registration.manifest.resource_contract.error_codes
        ? [...registration.manifest.resource_contract.error_codes]
        : undefined,
    },
    state_summary_schema: cloneViewStateSummarySchema(registration.manifest.state_summary_schema),
  };
}

export function createViewDescribeCapabilityRegistration(
  deps: ViewRuntimeDeps
): UiCapabilityRegistration {
  const handler: UiCapabilityHandler = async (rawPayload) => {
    const payload = toRecord(rawPayload);
    const requestedViewId = typeof payload.view_id === "string" ? payload.view_id.trim() : "";
    const availableViews = listViewRegistrations().map(buildViewDescribeItem);
    const currentSnapshot = deps.getViewStateSnapshot();
    const guideState = deps.getGuideStateSnapshot?.() || null;
    const taskProgress = deps.getTaskProgressSnapshot?.() || null;
    const activeResourceContext = deps.getActiveResourceContextSnapshot?.() || null;
    const continuation = deps.getContinuationSnapshot?.() || null;
    const requestedManifest = requestedViewId
      ? availableViews.find((view) => view.view_id === requestedViewId) || null
      : null;

    return {
      ok: true,
      data: {
        active_view_id: currentSnapshot.active_view_id,
        active_route_name: currentSnapshot.active_manifest?.route_name || "",
        active_route_path: currentSnapshot.active_manifest?.route_path || "",
        active_anchor: currentSnapshot.active_anchor,
        current_resource: currentSnapshot.current_resource,
        current_resource_summary: currentSnapshot.active_manifest?.state_summary || {},
        active_manifest: currentSnapshot.active_manifest,
        view_state_version: currentSnapshot.view_state_version,
        guide_state: guideState,
        task_progress: taskProgress,
        active_resource_context: activeResourceContext,
        continuation,
        available_views: availableViews,
        requested_view: requestedManifest,
      },
    };
  };

  return {
    definition: {
      name: "assistant.view.describe",
      description: "Describe registered views and return the current assistant-facing runtime observation",
      input_schema: buildViewDescribeSchema(),
    },
    handler,
  };
}
