import {
  applyViewState,
  cloneStateBinding,
  hasAnchor,
  hasCapability,
  resolveActiveViewState,
  toRecord,
  type ViewActionHandler,
  type ViewRuntimeDeps,
} from "./runtime.shared";

export function createViewCapabilityInvokeHandler(deps: ViewRuntimeDeps): ViewActionHandler {
  return async (payload, context) => {
    const input = toRecord(payload);
    const viewId = typeof input.view_id === "string" ? input.view_id.trim() : "";
    const capabilityId = typeof input.capability_id === "string"
      ? input.capability_id.trim()
      : typeof input.capability === "string"
        ? input.capability.trim()
        : "";
    const rawCapabilityInput = input.input;
    const capabilityInput = toRecord(rawCapabilityInput);
    if (!viewId || !capabilityId) {
      return {
        ok: false,
        error_code: "invalid_view_payload",
        message: "view.capability.invoke requires payload.view_id and payload.capability_id",
      };
    }
    if (rawCapabilityInput !== undefined && (!rawCapabilityInput || typeof rawCapabilityInput !== "object" || Array.isArray(rawCapabilityInput))) {
      return {
        ok: false,
        error_code: "invalid_view_payload",
        message: "view.capability.invoke requires payload.input to be an object",
      };
    }
    if (rawCapabilityInput === undefined) {
      const hasTopLevelBusinessFields = Object.keys(input).some((key) =>
        key !== "view_id" && key !== "capability_id" && key !== "capability"
      );
      if (hasTopLevelBusinessFields) {
        return {
          ok: false,
          error_code: "invalid_view_payload",
          message: "view.capability.invoke requires business parameters inside payload.input",
        };
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
    if (!hasCapability(activeState.registration.capabilities, capabilityId)) {
      return {
        ok: false,
        error_code: "view_capability_not_found",
        message: `View capability not found: ${capabilityId}`,
      };
    }
    const capabilityResult = activeState.registration.invokeCapability
      ? await activeState.registration.invokeCapability(capabilityId, capabilityInput, activeState.stateBinding)
      : {};
    if ("ok" in capabilityResult && capabilityResult.ok === false) {
      return capabilityResult;
    }
    const nextStateBinding = capabilityResult.state_binding
      ? cloneStateBinding(capabilityResult.state_binding)
      : activeState.stateBinding;
    const nextAnchor = capabilityResult.activeAnchor || activeState.activeAnchor;
    if (nextAnchor && !hasAnchor(activeState.registration, nextAnchor)) {
      return {
        ok: false,
        error_code: "anchor_not_found",
        message: `Anchor not found: ${nextAnchor}`,
      };
    }
    const manifest = applyViewState(deps, activeState.registration, nextStateBinding, nextAnchor, {
      trigger: "view.capability.invoke",
      context,
    });
    return {
      ok: true,
      data: {
        status: "applied",
        view_id: viewId,
        capability_id: capabilityId,
        active_anchor: nextAnchor,
        manifest,
        ...toRecord(capabilityResult.data),
      },
    };
  };
}
