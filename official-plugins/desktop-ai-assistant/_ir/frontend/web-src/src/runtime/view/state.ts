import { ref } from "vue";

import { cloneViewStateSummarySchema } from "./manifest";
import type { ViewManifestSnapshot, ViewResourceBinding } from "./manifest";

export interface ViewStateSnapshot {
  active_view_id: string;
  active_anchor: string;
  current_resource: ViewResourceBinding | null;
  active_manifest: ViewManifestSnapshot | null;
  view_state_version: number;
}

export interface SetActiveViewStateInput {
  viewId: string;
  activeAnchor?: string;
  resource: ViewResourceBinding;
  manifest: ViewManifestSnapshot;
}

const activeViewId = ref("");
const activeAnchor = ref("");
const currentResource = ref<ViewResourceBinding | null>(null);
const activeManifest = ref<ViewManifestSnapshot | null>(null);
const viewStateVersion = ref(0);

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneRecord(raw: Record<string, unknown>): Record<string, unknown> {
  return cloneJsonValue(raw);
}

function cloneResource(resource: ViewResourceBinding): ViewResourceBinding {
  return {
    resource_type: resource.resource_type,
    resource_id: resource.resource_id,
    title: resource.title,
    data: cloneRecord(resource.data),
  };
}

function cloneManifest(manifest: ViewManifestSnapshot): ViewManifestSnapshot {
  return {
    view_id: manifest.view_id,
    resource_type: manifest.resource_type,
    title: manifest.title,
    route_name: manifest.route_name,
    route_path: manifest.route_path,
    state_mode: manifest.state_mode,
    anchors: manifest.anchors.map((anchor) => ({ ...anchor })),
    capabilities: manifest.capabilities.map((capability) => ({
      ...capability,
      input_schema: capability.input_schema ? cloneRecord(capability.input_schema) : undefined,
      output_schema: capability.output_schema ? cloneRecord(capability.output_schema) : undefined,
      affected_anchors: capability.affected_anchors ? [...capability.affected_anchors] : undefined,
      error_codes: capability.error_codes ? [...capability.error_codes] : undefined,
    })),
    resource_contract: {
      resource_schema: cloneRecord(manifest.resource_contract.resource_schema),
      open_payload_schema: cloneRecord(manifest.resource_contract.open_payload_schema),
      default_resource: cloneResource(manifest.resource_contract.default_resource),
      error_codes: manifest.resource_contract.error_codes ? [...manifest.resource_contract.error_codes] : undefined,
    },
    state_summary_schema: cloneViewStateSummarySchema(manifest.state_summary_schema),
    state_summary: cloneRecord(manifest.state_summary),
  };
}

export function useViewState() {
  const setActiveViewState = (nextState: SetActiveViewStateInput) => {
    activeViewId.value = nextState.viewId;
    activeAnchor.value = nextState.activeAnchor || "";
    currentResource.value = cloneResource(nextState.resource);
    activeManifest.value = cloneManifest(nextState.manifest);
    viewStateVersion.value += 1;
    return viewStateVersion.value;
  };

  const clearViewState = () => {
    activeViewId.value = "";
    activeAnchor.value = "";
    currentResource.value = null;
    activeManifest.value = null;
    viewStateVersion.value += 1;
  };

  const restoreViewState = (snapshot: ViewStateSnapshot) => {
    // This only restores the assistant runtime's current view snapshot.
    // Stateful views must still own their actual business persistence.
    activeViewId.value = snapshot.active_view_id;
    activeAnchor.value = snapshot.active_anchor;
    currentResource.value = snapshot.current_resource ? cloneResource(snapshot.current_resource) : null;
    activeManifest.value = snapshot.active_manifest ? cloneManifest(snapshot.active_manifest) : null;
    viewStateVersion.value += 1;
    return viewStateVersion.value;
  };

  const getViewStateSnapshot = (): ViewStateSnapshot => {
    return {
      active_view_id: activeViewId.value,
      active_anchor: activeAnchor.value,
      current_resource: currentResource.value ? cloneResource(currentResource.value) : null,
      active_manifest: activeManifest.value ? cloneManifest(activeManifest.value) : null,
      view_state_version: viewStateVersion.value,
    };
  };

  return {
    activeViewId,
    activeAnchor,
    currentResource,
    activeManifest,
    viewStateVersion,
    setActiveViewState,
    clearViewState,
    restoreViewState,
    getViewStateSnapshot,
  };
}
