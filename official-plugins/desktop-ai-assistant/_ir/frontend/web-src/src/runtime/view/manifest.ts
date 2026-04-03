import type { Component } from "vue";

export interface ViewAnchorDefinition {
  id: string;
  title: string;
  description?: string;
}

export interface ViewResourceBinding {
  resource_type: string;
  resource_id?: string;
  title?: string;
  data: Record<string, unknown>;
}

export type ViewCapabilityMode = "read" | "write";

export interface ViewCapabilityDefinition {
  id: string;
  mode: ViewCapabilityMode;
  title?: string;
  description?: string;
  assistant_hint?: string;
  input_schema?: Record<string, unknown>;
  affected_anchors?: string[];
  error_codes?: string[];
}

export interface ViewEventHint {
  type: string;
  description: string;
  match_fields?: string[];
}

export interface ViewInteractionHints {
  interaction_intent: string;
  recommended_flow?: string[];
  key_events?: ViewEventHint[];
}

export type ViewStateMode = "stateful" | "lightweight";

export interface ViewPersistenceStateSnapshot {
  resource: ViewResourceBinding;
  activeAnchor?: string;
}

export interface ViewPersistenceConfig {
  version: number;
  debounce_ms?: number;
  getResourceKey: (resource: ViewResourceBinding) => string;
  serialize: (snapshot: ViewPersistenceStateSnapshot) => Record<string, unknown>;
  deserialize: (payload: Record<string, unknown>) => ViewPersistenceStateSnapshot;
  migrate?: (raw: Record<string, unknown>, fromVersion: number) => Record<string, unknown>;
}

export function cloneViewInteractionHints(
  hints?: ViewInteractionHints
): ViewInteractionHints | undefined {
  return hints ? JSON.parse(JSON.stringify(hints)) as ViewInteractionHints : undefined;
}

export interface ViewRouteDefinition {
  path: string;
  name: string;
  full_path: string;
}

export interface DefineViewInput {
  view_id: string;
  resource_type: string;
  title: string;
  component: Component;
  state_mode: ViewStateMode;
  default_resource: ViewResourceBinding;
  anchors?: ViewAnchorDefinition[];
  capabilities?: ViewCapabilityDefinition[];
  interaction_hints?: ViewInteractionHints;
  persistence?: ViewPersistenceConfig;
  normalizeResource?: (
    payload: Record<string, unknown>
  ) => Promise<ViewResourceBinding | ViewOperationFailure> | ViewResourceBinding | ViewOperationFailure;
  open?: (payload: Record<string, unknown>) => Promise<ViewOpenResult> | ViewOpenResult;
  invokeCapability?: (
    capabilityId: string,
    input: Record<string, unknown>,
    resource: ViewResourceBinding
  ) => Promise<ViewCapabilityResult> | ViewCapabilityResult;
  getStateSummary: (
    resource: ViewResourceBinding,
    activeAnchor?: string
  ) => Record<string, unknown>;
}

export interface ViewRegistration {
  view_id: string;
  resource_type: string;
  title: string;
  component: Component;
  route: ViewRouteDefinition;
  state_mode: ViewStateMode;
  default_resource: ViewResourceBinding;
  anchors: ViewAnchorDefinition[];
  capabilities: ViewCapabilityDefinition[];
  interaction_hints?: ViewInteractionHints;
  persistence?: ViewPersistenceConfig;
  normalizeResource?: (
    payload: Record<string, unknown>
  ) => Promise<ViewResourceBinding | ViewOperationFailure> | ViewResourceBinding | ViewOperationFailure;
  open?: (payload: Record<string, unknown>) => Promise<ViewOpenResult> | ViewOpenResult;
  invokeCapability?: (
    capabilityId: string,
    input: Record<string, unknown>,
    resource: ViewResourceBinding
  ) => Promise<ViewCapabilityResult> | ViewCapabilityResult;
  getStateSummary: (
    resource: ViewResourceBinding,
    activeAnchor?: string
  ) => Record<string, unknown>;
}

export interface ViewManifestSnapshot {
  view_id: string;
  resource_type: string;
  title: string;
  route_name: string;
  route_path: string;
  state_mode: ViewStateMode;
  anchors: ViewAnchorDefinition[];
  capabilities: ViewCapabilityDefinition[];
  interaction_hints?: ViewInteractionHints;
  state_summary: Record<string, unknown>;
}

export interface ViewOperationFailure {
  ok: false;
  error_code: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ViewOpenSuccess {
  ok?: true;
  resource: ViewResourceBinding;
  activeAnchor?: string;
  data?: Record<string, unknown>;
}

export type ViewOpenResult = ViewOpenSuccess | ViewOperationFailure;

export interface ViewCapabilitySuccess {
  ok?: true;
  resource?: ViewResourceBinding;
  activeAnchor?: string;
  data?: Record<string, unknown>;
}

export type ViewCapabilityResult = ViewCapabilitySuccess | ViewOperationFailure;

export function buildViewRouteDefinition(
  viewId: string
): ViewRouteDefinition {
  const normalized = viewId.trim();
  const path = normalized.replace(/\./g, "/");
  return {
    path,
    name: `view-${normalized.replace(/\./g, "-")}`,
    full_path: `/views/${path}`,
  };
}

export function defineView(
  input: DefineViewInput
): ViewRegistration {
  return {
    view_id: input.view_id,
    resource_type: input.resource_type,
    title: input.title,
    component: input.component,
    route: buildViewRouteDefinition(input.view_id),
    state_mode: input.state_mode,
    default_resource: JSON.parse(JSON.stringify(input.default_resource)) as ViewResourceBinding,
    anchors: input.anchors ? JSON.parse(JSON.stringify(input.anchors)) as ViewAnchorDefinition[] : [],
    capabilities: input.capabilities
      ? JSON.parse(JSON.stringify(input.capabilities)) as ViewCapabilityDefinition[]
      : [],
    interaction_hints: cloneViewInteractionHints(input.interaction_hints),
    persistence: input.persistence,
    normalizeResource: input.normalizeResource,
    open: input.open,
    invokeCapability: input.invokeCapability,
    getStateSummary: input.getStateSummary,
  };
}
