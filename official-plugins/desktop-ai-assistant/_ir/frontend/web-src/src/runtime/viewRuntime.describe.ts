import type { UiCapabilityHandler, UiCapabilityRegistration } from "./capabilities";
import { listViewRegistrations } from "./viewRegistry";
import {
  cloneCapabilityDefinition,
  cloneResource,
  cloneSchema,
  toRecord,
  type ViewRuntimeDeps,
} from "./viewRuntime.shared";

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
    const workspaceSnapshot = deps.getWorkspaceSnapshot?.() || null;
    const checkpointSummary = deps.getCheckpointSummary?.() || null;
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
        available_views: availableViews,
        requested_view: requestedManifest,
        workspace_snapshot: workspaceSnapshot,
        checkpoint_summary: checkpointSummary,
        resume_available: Boolean(checkpointSummary),
        resume_token: checkpointSummary?.resume_token || "",
        recovery_hints: checkpointSummary
          ? [
              "checkpoint_available",
              "resume_requires_explicit_token",
              "do_not_auto_resume_without_current_task_intent",
            ]
          : [],
      },
    };
  };

  return {
    definition: {
      name: "assistant.view.describe",
      description: "Describe registered views and return the current active workspace snapshot",
      input_schema: buildViewDescribeSchema(),
    },
    handler,
  };
}
