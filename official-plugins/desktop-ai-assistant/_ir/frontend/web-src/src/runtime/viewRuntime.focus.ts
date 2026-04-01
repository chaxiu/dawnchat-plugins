import {
  applyViewState,
  hasAnchor,
  resolveActiveViewState,
  toRecord,
  type ViewActionHandler,
  type ViewRuntimeDeps,
} from "./viewRuntime.shared";

export function createViewFocusHandler(deps: ViewRuntimeDeps): ViewActionHandler {
  return async (payload) => {
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
  };
}
