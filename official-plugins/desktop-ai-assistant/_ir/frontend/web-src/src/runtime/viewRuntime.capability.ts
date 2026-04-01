import {
  applyViewState,
  cloneResource,
  hasAnchor,
  hasCapability,
  resolveActiveViewState,
  toRecord,
  type ViewActionHandler,
  type ViewRuntimeDeps,
} from "./viewRuntime.shared";

export function createViewCapabilityInvokeHandler(deps: ViewRuntimeDeps): ViewActionHandler {
  return async (payload) => {
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
  };
}
