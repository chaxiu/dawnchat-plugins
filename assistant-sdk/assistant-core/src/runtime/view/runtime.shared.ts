import type { GuideStateSnapshot } from "../guide/state";
import type { SessionStepRuntimeContext, StepActionResult } from "../contracts/sessionStep";
import { ASSISTANT_RUNTIME_EVENT_TYPES, type AssistantRuntimeEventInput } from "../events";
import { getViewRegistration } from "./registry";
import type { SetActiveViewStateInput, ViewStateSnapshot } from "./state";
import type {
  ViewCapabilityDefinition,
  ViewManifestSnapshot,
  ViewOpenResult,
  ViewRegistration,
  ViewResourceBinding,
} from "./manifest";
import { cloneViewInteractionHints } from "./manifest";
import type {
  ActiveResourceContext,
  SessionContinuation,
  SessionTaskProgress,
} from "../observation/types";

export type ViewActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;

export interface ViewRuntimeDeps {
  setActiveViewState: (state: SetActiveViewStateInput) => number;
  getViewStateSnapshot: () => ViewStateSnapshot;
  getGuideStateSnapshot?: () => GuideStateSnapshot;
  getTaskProgressSnapshot?: () => SessionTaskProgress;
  getActiveResourceContextSnapshot?: () => ActiveResourceContext | null;
  getContinuationSnapshot?: () => SessionContinuation;
  navigateToView: (viewId: string) => Promise<void> | void;
  emitRuntimeEvent?: (input: AssistantRuntimeEventInput) => void;
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
  const stateSummary = registration.getStateSummary(resource, activeAnchor);
  return {
    view_id: registration.view_id,
    resource_type: registration.resource_type,
    title: registration.title,
    route_name: registration.route.name,
    route_path: registration.route.full_path,
    state_mode: registration.state_mode,
    anchors: registration.anchors.map((anchor) => ({ ...anchor })),
    capabilities: registration.capabilities.map(cloneCapabilityDefinition),
    interaction_hints: cloneViewInteractionHints(registration.interaction_hints),
    state_summary: stateSummary,
  };
}

export function hasAnchor(registration: ViewRegistration, anchorId: string): boolean {
  return registration.anchors.some((anchor) => anchor.id === anchorId);
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
  activeAnchor?: string,
  options?: { trigger?: string; context?: SessionStepRuntimeContext }
): ViewManifestSnapshot {
  const manifest = createManifestSnapshot(registration, resource, activeAnchor);
  deps.setActiveViewState({
    viewId: registration.view_id,
    activeAnchor,
    resource,
    manifest,
  });
  deps.emitRuntimeEvent?.({
    type: ASSISTANT_RUNTIME_EVENT_TYPES.VIEW_STATE_APPLIED,
    source: "view",
    session_id: options?.context?.sessionId,
    step_id: options?.context?.stepId,
    payload: {
      trigger: options?.trigger,
      view_id: registration.view_id,
      active_anchor: activeAnchor || "",
      resource_type: resource.resource_type,
      resource_id: resource.resource_id,
    },
  });
  return manifest;
}
