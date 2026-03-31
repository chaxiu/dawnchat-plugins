import type { UiCapabilityHandler, UiCapabilityRegistration } from "./capabilities";
import type { GuideStateSnapshot } from "./guideState";
import type { SessionStepRuntimeContext } from "./sessionStepExecutor";
import { getViewRegistration, listViewRegistrations } from "./viewRegistry";
import type { SetActiveViewStateInput, ViewStateSnapshot } from "./viewState";
import type {
  ViewCapabilityDefinition,
  ViewManifestSnapshot,
  ViewOpenResult,
  ViewRegistration,
  ViewResourceBinding,
} from "./viewManifest";

type StepActionResult = {
  ok: boolean;
  data?: Record<string, unknown>;
  error_code?: string;
  message?: string;
} | Promise<{
  ok: boolean;
  data?: Record<string, unknown>;
  error_code?: string;
  message?: string;
}>;
type ViewActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;

export interface ViewRuntimeDeps {
  setActiveViewState: (state: SetActiveViewStateInput) => number;
  getViewStateSnapshot: () => ViewStateSnapshot;
  getGuideStateSnapshot?: () => GuideStateSnapshot;
  navigateToView: (viewId: string) => Promise<void> | void;
}

type ViewRuntimeHandlers = Record<string, ViewActionHandler>;

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function cloneResource(resource: ViewResourceBinding): ViewResourceBinding {
  return {
    resource_type: resource.resource_type,
    resource_id: resource.resource_id,
    title: resource.title,
    data: JSON.parse(JSON.stringify(resource.data)) as Record<string, unknown>,
  };
}

function cloneSchema(schema: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
}

function cloneCapabilityDefinition(capability: ViewCapabilityDefinition): ViewCapabilityDefinition {
  return {
    ...capability,
    input_schema: capability.input_schema ? cloneSchema(capability.input_schema) : undefined,
    output_schema: capability.output_schema ? cloneSchema(capability.output_schema) : undefined,
    affected_anchors: capability.affected_anchors ? [...capability.affected_anchors] : undefined,
    error_codes: capability.error_codes ? [...capability.error_codes] : undefined,
  };
}

function isOpenFailure(result: ViewOpenResult): result is Extract<ViewOpenResult, { ok: false }> {
  return "ok" in result && result.ok === false;
}

function createManifestSnapshot(
  registration: ViewRegistration,
  resource: ViewResourceBinding,
  activeAnchor?: string
): ViewManifestSnapshot {
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
    state_summary: registration.buildStateSummary(resource, activeAnchor),
  };
}

function hasAnchor(registration: ViewRegistration, anchorId: string): boolean {
  return registration.manifest.anchors.some((anchor) => anchor.id === anchorId);
}

function hasCapability(capabilities: ViewCapabilityDefinition[], capabilityId: string): boolean {
  return capabilities.some((capability) => capability.id === capabilityId);
}

function resolveActiveViewState(
  deps: ViewRuntimeDeps,
  viewId?: string
): {
  viewId: string;
  registration: ViewRegistration;
  resource: ViewResourceBinding;
  activeAnchor: string;
} | null {
  const snapshot = deps.getViewStateSnapshot();
  const requestedViewId = typeof viewId === "string" ? viewId.trim() : "";
  const resolvedViewId = requestedViewId || snapshot.active_view_id;
  if (!resolvedViewId || snapshot.active_view_id !== resolvedViewId || !snapshot.current_resource) {
    return null;
  }
  const registration = getViewRegistration(resolvedViewId);
  if (!registration) {
    return null;
  }
  return {
    viewId: resolvedViewId,
    registration,
    resource: cloneResource(snapshot.current_resource),
    activeAnchor: snapshot.active_anchor,
  };
}

function applyViewState(
  deps: ViewRuntimeDeps,
  registration: ViewRegistration,
  resource: ViewResourceBinding,
  activeAnchor?: string
): ViewManifestSnapshot {
  const manifest = createManifestSnapshot(registration, resource, activeAnchor);
  deps.setActiveViewState({
    viewId: registration.manifest.view_id,
    activeAnchor,
    resource,
    manifest,
  });
  return manifest;
}

function buildViewDescribeSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      view_id: { type: "string" },
    },
  };
}

function buildViewDescribeItem(registration: ViewRegistration) {
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
      },
    };
  };

  return {
    definition: {
      name: "assistant.view.describe",
      description: "Describe registered views and return the current active view snapshot",
      input_schema: buildViewDescribeSchema(),
    },
    handler,
  };
}

export function createViewRuntime(deps: ViewRuntimeDeps): ViewRuntimeHandlers {
  return {
    open: async (payload) => {
      const input = toRecord(payload);
      const viewId = typeof input.view_id === "string" ? input.view_id.trim() : "";
      if (!viewId) {
        return {
          ok: false,
          error_code: "invalid_view_payload",
          message: "view.open requires payload.view_id",
        };
      }
      const registration = getViewRegistration(viewId);
      if (!registration) {
        return {
          ok: false,
          error_code: "view_not_found",
          message: `View not found: ${viewId}`,
        };
      }
      const openResult = registration.open
        ? await registration.open(input)
        : { resource: registration.createDefaultResource() };
      if (isOpenFailure(openResult)) {
        return openResult;
      }
      const resource = cloneResource(openResult.resource || registration.createDefaultResource());
      const requestedAnchor = typeof input.initial_anchor === "string" ? input.initial_anchor.trim() : "";
      const activeAnchor =
        requestedAnchor
        || openResult.activeAnchor
        || registration.manifest.anchors[0]?.id
        || "";
      if (activeAnchor && !hasAnchor(registration, activeAnchor)) {
        return {
          ok: false,
          error_code: "anchor_not_found",
          message: `Anchor not found: ${activeAnchor}`,
        };
      }
      const manifest = applyViewState(deps, registration, resource, activeAnchor);
      await deps.navigateToView(viewId);
      return {
        ok: true,
        data: {
          status: "applied",
          view_id: viewId,
          active_anchor: activeAnchor,
          route_path: registration.manifest.route_path,
          resource_type: resource.resource_type,
          manifest,
          ...toRecord(openResult.data),
        },
      };
    },
    focus: async (payload) => {
      const input = toRecord(payload);
      const viewId = typeof input.view_id === "string" ? input.view_id.trim() : "";
      const anchorFromAnchor = typeof input.anchor === "string" ? input.anchor.trim() : "";
      const anchorFromAnchorId = typeof input.anchor_id === "string" ? input.anchor_id.trim() : "";
      const anchor = anchorFromAnchor || anchorFromAnchorId;
      if (!anchor) {
        return {
          ok: false,
          error_code: "invalid_view_payload",
          message: "view.focus requires payload.anchor or payload.anchor_id",
        };
      }
      const activeState = resolveActiveViewState(deps, viewId);
      if (!activeState) {
        return {
          ok: false,
          error_code: "view_not_active",
          message: viewId ? `View is not active: ${viewId}` : "No active view is available for view.focus",
        };
      }
      if (!hasAnchor(activeState.registration, anchor)) {
        return {
          ok: false,
          error_code: "anchor_not_found",
          message: `Anchor not found: ${anchor}`,
        };
      }
      const manifest = applyViewState(deps, activeState.registration, activeState.resource, anchor);
      return {
        ok: true,
        data: {
          status: "applied",
          view_id: activeState.viewId,
          active_anchor: anchor,
          manifest,
        },
      };
    },
    "capability.invoke": async (payload) => {
      const input = toRecord(payload);
      const viewId = typeof input.view_id === "string" ? input.view_id.trim() : "";
      const capabilityId = typeof input.capability === "string" ? input.capability.trim() : "";
      const capabilityInput = toRecord(input.input);
      if (!viewId || !capabilityId) {
        return {
          ok: false,
          error_code: "invalid_view_payload",
          message: "view.capability.invoke requires payload.view_id and payload.capability",
        };
      }
      const activeState = resolveActiveViewState(deps, viewId);
      if (!activeState) {
        return {
          ok: false,
          error_code: "view_not_active",
          message: `View is not active: ${viewId}`,
        };
      }
      if (!hasCapability(activeState.registration.manifest.capabilities, capabilityId)) {
        return {
          ok: false,
          error_code: "view_capability_not_found",
          message: `View capability not found: ${capabilityId}`,
        };
      }
      const capabilityResult = activeState.registration.invokeCapability
        ? await activeState.registration.invokeCapability(capabilityId, capabilityInput, activeState.resource)
        : {};
      if ("ok" in capabilityResult && capabilityResult.ok === false) {
        return capabilityResult;
      }
      const nextResource = capabilityResult.resource
        ? cloneResource(capabilityResult.resource)
        : activeState.resource;
      const nextAnchor = capabilityResult.activeAnchor || activeState.activeAnchor;
      if (nextAnchor && !hasAnchor(activeState.registration, nextAnchor)) {
        return {
          ok: false,
          error_code: "anchor_not_found",
          message: `Anchor not found: ${nextAnchor}`,
        };
      }
      const manifest = applyViewState(deps, activeState.registration, nextResource, nextAnchor);
      return {
        ok: true,
        data: {
          status: "applied",
          view_id: viewId,
          capability: capabilityId,
          active_anchor: nextAnchor,
          manifest,
          ...toRecord(capabilityResult.data),
        },
      };
    },
  };
}
