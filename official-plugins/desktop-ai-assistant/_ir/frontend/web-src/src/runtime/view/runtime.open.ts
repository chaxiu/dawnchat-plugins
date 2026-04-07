import { getViewRegistration } from "./registry";
import type { UiCapabilityHandler, UiCapabilityRegistration } from "../capabilities";
import {
  applyViewState,
  cloneResource,
  hasAnchor,
  isOpenFailure,
  toRecord,
  type ViewActionHandler,
  type ViewRuntimeDeps,
} from "./runtime.shared";

function buildViewOpenSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      view_id: { type: "string" },
      resource: { type: "object" },
      initial_anchor: { type: "string" },
    },
    required: ["view_id"],
  };
}

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
    let openResult:
      | Awaited<ReturnType<NonNullable<typeof registration.open>>>
      | Awaited<ReturnType<NonNullable<typeof registration.normalizeResource>>>
      | { resource: ReturnType<typeof cloneResource> };
    if (registration.open) {
      openResult = await registration.open(input);
    } else if (registration.normalizeResource) {
      const normalized = await registration.normalizeResource(toRecord(input.resource));
      openResult = "resource_type" in normalized ? { resource: normalized } : normalized;
    } else {
      openResult = { resource: cloneResource(registration.default_resource) };
    }
    if (isOpenFailure(openResult)) {
      return openResult;
    }
    const resource = cloneResource(
      "resource" in openResult && openResult.resource
        ? openResult.resource
        : registration.default_resource
    );
    const requestedAnchor = typeof input.initial_anchor === "string" ? input.initial_anchor.trim() : "";
    const activeAnchor =
      requestedAnchor
      || ("activeAnchor" in openResult ? openResult.activeAnchor : "")
      || registration.anchors[0]?.id
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
        route_path: registration.route.full_path,
        resource_type: resource.resource_type,
        manifest,
        ...("data" in openResult ? toRecord(openResult.data) : {}),
      },
    };
  };
}

export function createViewOpenCapabilityRegistration(
  deps: ViewRuntimeDeps
): UiCapabilityRegistration {
  const openHandler = createViewOpenHandler(deps);
  const handler: UiCapabilityHandler = async (rawPayload) =>
    openHandler(rawPayload, {
      sessionId: "",
      isCancelled: () => false,
      onCancel: () => undefined,
    });

  return {
    definition: {
      name: "view.open",
      description: "Open one registered assistant view and bind its resource payload.",
      input_schema: buildViewOpenSchema(),
    },
    handler,
  };
}
