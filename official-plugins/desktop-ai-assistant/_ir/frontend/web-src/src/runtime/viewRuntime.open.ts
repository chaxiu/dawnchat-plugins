import { getViewRegistration } from "./viewRegistry";
import {
  applyViewState,
  cloneResource,
  hasAnchor,
  isOpenFailure,
  toRecord,
  type ViewActionHandler,
  type ViewRuntimeDeps,
} from "./viewRuntime.shared";

export function createViewOpenHandler(deps: ViewRuntimeDeps): ViewActionHandler {
  return async (payload, context) => {
    const input = toRecord(payload);
    const viewId = typeof input.view_id === "string" ? input.view_id.trim() : "";
    if (!viewId) {
      return {
        ok: false,
        error_code: "invalid_view_payload",
        message: "view.open requires payload.view_id",
      };
    }
    const registration = getViewRegistration(viewId);
    if (!registration) {
      return {
        ok: false,
        error_code: "view_not_found",
        message: `View not found: ${viewId}`,
      };
    }
    const openResult = registration.open
      ? await registration.open(input)
      : { resource: registration.createDefaultResource() };
    if (isOpenFailure(openResult)) {
      return openResult;
    }
    const resource = cloneResource(openResult.resource || registration.createDefaultResource());
    const requestedAnchor = typeof input.initial_anchor === "string" ? input.initial_anchor.trim() : "";
    const activeAnchor =
      requestedAnchor
      || openResult.activeAnchor
      || registration.manifest.anchors[0]?.id
      || "";
    if (activeAnchor && !hasAnchor(registration, activeAnchor)) {
      return {
        ok: false,
        error_code: "anchor_not_found",
        message: `Anchor not found: ${activeAnchor}`,
      };
    }
    const manifest = applyViewState(deps, registration, resource, activeAnchor, {
      trigger: "view.open",
      context,
    });
    await deps.navigateToView(viewId);
    return {
      ok: true,
      data: {
        status: "applied",
        view_id: viewId,
        active_anchor: activeAnchor,
        route_path: registration.manifest.route_path,
        resource_type: resource.resource_type,
        manifest,
        ...toRecord(openResult.data),
      },
    };
  };
}
