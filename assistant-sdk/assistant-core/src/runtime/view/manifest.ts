import type { Component } from "vue";

export interface ViewAnchorDefinition {
  id: string;
  title: string;
  description?: string;
}

export interface ViewStateBinding {
  binding_type: string;
  binding_label?: string;
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

export type ViewRecommendedMode = "direct_capability" | "session_start" | "hybrid";

export interface ViewPlaybookExampleCall {
  tool: string;
  payload: Record<string, unknown>;
}

export interface ViewPlaybookExample {
  name: string;
  mode: string;
  call: ViewPlaybookExampleCall;
  then?: ViewPlaybookExampleCall;
}

export interface ViewWaitStrategy {
  preferred_tools?: string[];
  rule: string;
}

export interface ViewInteractionHints {
  interaction_intent: string;
  key_events?: ViewEventHint[];
  recommended_mode?: ViewRecommendedMode;
  decision_rule?: string;
  wait_strategy?: ViewWaitStrategy;
  examples?: ViewPlaybookExample[];
}

export interface ViewDescribeOptions {
  max_nodes?: number;
  max_edges?: number;
}

export type ViewStateMode = "stateful" | "lightweight";

export interface ViewPersistenceStateSnapshot {
  state_binding: ViewStateBinding;
  activeAnchor?: string;
}

export interface ViewPersistenceConfig {
  version: number;
  debounce_ms?: number;
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

export type ViewRenderMode = "light-dom" | "shadow-dom";

export interface DefineViewInput {
  view_id: string;
  binding_type: string;
  title: string;
  component: Component;
  render_mode?: ViewRenderMode;
  style_texts?: string[];
  theme_vars?: string[];
  state_mode: ViewStateMode;
  default_state_binding: ViewStateBinding;
  anchors?: ViewAnchorDefinition[];
  capabilities?: ViewCapabilityDefinition[];
  interaction_hints?: ViewInteractionHints;
  persistence?: ViewPersistenceConfig;
  normalizeStateBinding?: (
    payload: Record<string, unknown>
  ) => Promise<ViewStateBinding | ViewOperationFailure> | ViewStateBinding | ViewOperationFailure;
  open?: (payload: Record<string, unknown>) => Promise<ViewOpenResult> | ViewOpenResult;
  invokeCapability?: (
    capabilityId: string,
    input: Record<string, unknown>,
    stateBinding: ViewStateBinding
  ) => Promise<ViewCapabilityResult> | ViewCapabilityResult;
  describeState?: (
    stateBinding: ViewStateBinding,
    activeAnchor: string | undefined,
    options: ViewDescribeOptions
  ) => Record<string, unknown>;
  getStateSummary: (
    stateBinding: ViewStateBinding,
    activeAnchor?: string
  ) => Record<string, unknown>;
}

export interface ViewRegistration {
  view_id: string;
  binding_type: string;
  title: string;
  component: Component;
  render_mode: ViewRenderMode;
  style_texts: string[];
  theme_vars: string[];
  route: ViewRouteDefinition;
  state_mode: ViewStateMode;
  default_state_binding: ViewStateBinding;
  anchors: ViewAnchorDefinition[];
  capabilities: ViewCapabilityDefinition[];
  interaction_hints?: ViewInteractionHints;
  persistence?: ViewPersistenceConfig;
  normalizeStateBinding?: (
    payload: Record<string, unknown>
  ) => Promise<ViewStateBinding | ViewOperationFailure> | ViewStateBinding | ViewOperationFailure;
  open?: (payload: Record<string, unknown>) => Promise<ViewOpenResult> | ViewOpenResult;
  invokeCapability?: (
    capabilityId: string,
    input: Record<string, unknown>,
    stateBinding: ViewStateBinding
  ) => Promise<ViewCapabilityResult> | ViewCapabilityResult;
  describeState?: (
    stateBinding: ViewStateBinding,
    activeAnchor: string | undefined,
    options: ViewDescribeOptions
  ) => Record<string, unknown>;
  getStateSummary: (
    stateBinding: ViewStateBinding,
    activeAnchor?: string
  ) => Record<string, unknown>;
}

export interface ViewManifestSnapshot {
  view_id: string;
  binding_type: string;
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
  state_binding: ViewStateBinding;
  activeAnchor?: string;
  data?: Record<string, unknown>;
}

export type ViewOpenResult = ViewOpenSuccess | ViewOperationFailure;

export interface ViewCapabilitySuccess {
  ok?: true;
  state_binding?: ViewStateBinding;
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
    binding_type: input.binding_type,
    title: input.title,
    component: input.component,
    render_mode: input.render_mode || "light-dom",
    style_texts: input.style_texts ? [...input.style_texts] : [],
    theme_vars: input.theme_vars ? [...input.theme_vars] : [],
    route: buildViewRouteDefinition(input.view_id),
    state_mode: input.state_mode,
    default_state_binding: JSON.parse(JSON.stringify(input.default_state_binding)) as ViewStateBinding,
    anchors: input.anchors ? JSON.parse(JSON.stringify(input.anchors)) as ViewAnchorDefinition[] : [],
    capabilities: input.capabilities
      ? JSON.parse(JSON.stringify(input.capabilities)) as ViewCapabilityDefinition[]
      : [],
    interaction_hints: cloneViewInteractionHints(input.interaction_hints),
    persistence: input.persistence,
    normalizeStateBinding: input.normalizeStateBinding,
    open: input.open,
    invokeCapability: input.invokeCapability,
    describeState: input.describeState,
    getStateSummary: input.getStateSummary,
  };
}
