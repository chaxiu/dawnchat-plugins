import { ref } from "vue";

import { cloneViewInteractionHints } from "./manifest";
import type { ViewManifestSnapshot, ViewStateBinding } from "./manifest";

export interface ViewStateSnapshot {
  active_view_id: string;
  active_anchor: string;
  current_state_binding: ViewStateBinding | null;
  active_manifest: ViewManifestSnapshot | null;
  view_state_version: number;
}

export interface SetActiveViewStateInput {
  viewId: string;
  activeAnchor?: string;
  state_binding: ViewStateBinding;
  manifest: ViewManifestSnapshot;
}

const activeViewId = ref("");
const activeAnchor = ref("");
const currentStateBinding = ref<ViewStateBinding | null>(null);
const activeManifest = ref<ViewManifestSnapshot | null>(null);
const viewStateVersion = ref(0);

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneRecord(raw: Record<string, unknown>): Record<string, unknown> {
  return cloneJsonValue(raw);
}

function cloneStateBinding(binding: ViewStateBinding): ViewStateBinding {
  return {
    binding_type: binding.binding_type,
    binding_label: binding.binding_label,
    title: binding.title,
    data: cloneRecord(binding.data),
  };
}

function cloneManifest(manifest: ViewManifestSnapshot): ViewManifestSnapshot {
  return {
    view_id: manifest.view_id,
    binding_type: manifest.binding_type,
    title: manifest.title,
    route_name: manifest.route_name,
    route_path: manifest.route_path,
    state_mode: manifest.state_mode,
    anchors: manifest.anchors.map((anchor) => ({ ...anchor })),
    capabilities: manifest.capabilities.map((capability) => ({
      ...capability,
      input_schema: capability.input_schema ? cloneRecord(capability.input_schema) : undefined,
      affected_anchors: capability.affected_anchors ? [...capability.affected_anchors] : undefined,
      error_codes: capability.error_codes ? [...capability.error_codes] : undefined,
    })),
    interaction_hints: cloneViewInteractionHints(manifest.interaction_hints),
    state_summary: cloneRecord(manifest.state_summary),
  };
}

export function useViewState() {
  const setActiveViewState = (nextState: SetActiveViewStateInput) => {
    activeViewId.value = nextState.viewId;
    activeAnchor.value = nextState.activeAnchor || "";
    currentStateBinding.value = cloneStateBinding(nextState.state_binding);
    activeManifest.value = cloneManifest(nextState.manifest);
    viewStateVersion.value += 1;
    return viewStateVersion.value;
  };

  const clearViewState = () => {
    activeViewId.value = "";
    activeAnchor.value = "";
    currentStateBinding.value = null;
    activeManifest.value = null;
    viewStateVersion.value += 1;
  };

  const restoreViewState = (snapshot: ViewStateSnapshot) => {
    // This only restores the assistant runtime's current view snapshot.
    // Stateful views must still own their actual business persistence.
    activeViewId.value = snapshot.active_view_id;
    activeAnchor.value = snapshot.active_anchor;
    currentStateBinding.value = snapshot.current_state_binding
      ? cloneStateBinding(snapshot.current_state_binding)
      : null;
    activeManifest.value = snapshot.active_manifest ? cloneManifest(snapshot.active_manifest) : null;
    viewStateVersion.value += 1;
    return viewStateVersion.value;
  };

  const getViewStateSnapshot = (): ViewStateSnapshot => {
    return {
      active_view_id: activeViewId.value,
      active_anchor: activeAnchor.value,
      current_state_binding: currentStateBinding.value
        ? cloneStateBinding(currentStateBinding.value)
        : null,
      active_manifest: activeManifest.value ? cloneManifest(activeManifest.value) : null,
      view_state_version: viewStateVersion.value,
    };
  };

  return {
    activeViewId,
    activeAnchor,
    currentStateBinding,
    activeManifest,
    viewStateVersion,
    setActiveViewState,
    clearViewState,
    restoreViewState,
    getViewStateSnapshot,
  };
}
