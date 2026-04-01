import type { GuideStateSnapshot } from "./guideState";
import type { SessionStepRuntimeContext } from "./sessionStepExecutor";
import { getViewRegistration } from "./viewRegistry";
import type { SetActiveViewStateInput, ViewStateSnapshot } from "./viewState";
import type {
  ViewCapabilityDefinition,
  ViewManifestSnapshot,
  ViewOpenResult,
  ViewRegistration,
  ViewResourceBinding,
} from "./viewManifest";
import type { WorkspaceCheckpointSummary } from "./checkpointTypes";
import type { WorkspaceSnapshot } from "./workspaceTypes";

export type StepActionResult = {
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

export type ViewActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;

export interface ViewRuntimeDeps {
  setActiveViewState: (state: SetActiveViewStateInput) => number;
  getViewStateSnapshot: () => ViewStateSnapshot;
  getGuideStateSnapshot?: () => GuideStateSnapshot;
  getWorkspaceSnapshot?: () => WorkspaceSnapshot;
  getCheckpointSummary?: () => WorkspaceCheckpointSummary | null;
  navigateToView: (viewId: string) => Promise<void> | void;
}

export type ViewRuntimeHandlers = Record<string, ViewActionHandler>;

export function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

export function cloneResource(resource: ViewResourceBinding): ViewResourceBinding {
  return {
    resource_type: resource.resource_type,
    resource_id: resource.resource_id,
    title: resource.title,
    data: JSON.parse(JSON.stringify(resource.data)) as Record<string, unknown>,
  };
}

export function cloneSchema(schema: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
}

export function cloneCapabilityDefinition(capability: ViewCapabilityDefinition): ViewCapabilityDefinition {
  return {
    ...capability,
    input_schema: capability.input_schema ? cloneSchema(capability.input_schema) : undefined,
    output_schema: capability.output_schema ? cloneSchema(capability.output_schema) : undefined,
    affected_anchors: capability.affected_anchors ? [...capability.affected_anchors] : undefined,
    error_codes: capability.error_codes ? [...capability.error_codes] : undefined,
  };
}

export function isOpenFailure(
  result: ViewOpenResult
): result is Extract<ViewOpenResult, { ok: false }> {
  return "ok" in result && result.ok === false;
}

export function createManifestSnapshot(
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

export function hasAnchor(registration: ViewRegistration, anchorId: string): boolean {
  return registration.manifest.anchors.some((anchor) => anchor.id === anchorId);
}

export function hasCapability(
  capabilities: ViewCapabilityDefinition[],
  capabilityId: string
): boolean {
  return capabilities.some((capability) => capability.id === capabilityId);
}

export function resolveActiveViewState(
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

export function applyViewState(
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
