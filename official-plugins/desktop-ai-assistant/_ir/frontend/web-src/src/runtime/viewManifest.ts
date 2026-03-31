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

export interface ViewResourceContract {
  resource_schema: Record<string, unknown>;
  open_payload_schema: Record<string, unknown>;
  default_resource: ViewResourceBinding;
  error_codes?: string[];
}

export interface ViewCapabilityDefinition {
  id: string;
  title: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  affected_anchors?: string[];
  error_codes?: string[];
}

export interface ViewManifest {
  view_id: string;
  resource_type: string;
  title: string;
  route_name: string;
  route_path: string;
  anchors: ViewAnchorDefinition[];
  capabilities: ViewCapabilityDefinition[];
  resource_contract: ViewResourceContract;
}

export interface ViewManifestSnapshot extends ViewManifest {
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

export interface ViewRouteDefinition {
  path: string;
  name: string;
  component: Component;
}

export interface ViewRegistration {
  manifest: ViewManifest;
  route: ViewRouteDefinition;
  createDefaultResource: () => ViewResourceBinding;
  open?: (payload: Record<string, unknown>) => Promise<ViewOpenResult> | ViewOpenResult;
  invokeCapability?: (
    capabilityId: string,
    input: Record<string, unknown>,
    resource: ViewResourceBinding
  ) => Promise<ViewCapabilityResult> | ViewCapabilityResult;
  buildStateSummary: (
    resource: ViewResourceBinding,
    activeAnchor?: string
  ) => Record<string, unknown>;
}
