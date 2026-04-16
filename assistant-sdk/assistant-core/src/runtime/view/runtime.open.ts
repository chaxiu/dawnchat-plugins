import type { SessionStepRuntimeContext, StepActionResult } from "../contracts/sessionStep";
import { emitAssistantRuntimeEvent } from "../runtimeEventBridge";
import { getAssistantRouteNavigator } from "../hostAdapter";
import { getViewRegistration } from "./registry";
import type { UiCapabilityHandler, UiCapabilityRegistration } from "../capabilities";
import type { ViewStateBinding } from "./manifest";
import { useViewState } from "./state";
import {
  applyViewState,
  cloneStateBinding,
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
      state_binding: { type: "object" },
      initial_anchor: { type: "string" },
    },
    required: ["view_id"],
  };
}

export async function applyViewOpenFromInput(
  deps: ViewRuntimeDeps,
  input: Record<string, unknown>,
  context: SessionStepRuntimeContext
): Promise<StepActionResult> {
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
    | Awaited<ReturnType<NonNullable<typeof registration.normalizeStateBinding>>>
    | { state_binding: ReturnType<typeof cloneStateBinding> };
  if (registration.open) {
    openResult = await registration.open(input);
  } else if (registration.normalizeStateBinding) {
    const normalized = await registration.normalizeStateBinding(toRecord(input.state_binding));
    openResult = "ok" in normalized && normalized.ok === false
      ? normalized
      : { state_binding: normalized as ViewStateBinding };
  } else {
    openResult = { state_binding: cloneStateBinding(registration.default_state_binding) };
  }
  if (isOpenFailure(openResult)) {
    return openResult;
  }
  const stateBinding = cloneStateBinding(
    "state_binding" in openResult && openResult.state_binding
      ? openResult.state_binding
      : registration.default_state_binding
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
  const manifest = applyViewState(deps, registration, stateBinding, activeAnchor, {
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
      binding_type: stateBinding.binding_type,
      manifest,
      ...("data" in openResult ? toRecord(openResult.data) : {}),
    },
  };
}

const shellStepContext: SessionStepRuntimeContext = {
  sessionId: "",
  isCancelled: () => false,
  onCancel: () => undefined,
};

/**
 * Opens a registered view with the same binding resolution as `view.open` when
 * invoked from UI (launcher, deep links) outside a session step.
 */
export async function openAssistantViewFromShell(viewId: string): Promise<StepActionResult> {
  const trimmed = viewId.trim();
  if (!trimmed) {
    return {
      ok: false,
      error_code: "invalid_view_payload",
      message: "view_id is required",
    };
  }
  const { setActiveViewState, getViewStateSnapshot } = useViewState();
  const deps: ViewRuntimeDeps = {
    setActiveViewState,
    getViewStateSnapshot,
    navigateToView: async (vid: string) => {
      const reg = getViewRegistration(vid);
      const nav = getAssistantRouteNavigator();
      if (reg && nav) {
        await nav(reg.route.full_path);
      }
    },
    emitRuntimeEvent: (input) => {
      void emitAssistantRuntimeEvent(input);
    },
  };
  return applyViewOpenFromInput(deps, { view_id: trimmed }, shellStepContext);
}

export function createViewOpenHandler(deps: ViewRuntimeDeps): ViewActionHandler {
  return async (payload, context) => {
    const input = toRecord(payload);
    return applyViewOpenFromInput(deps, input, context);
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
      description: "Open one registered assistant view and bind its state binding payload.",
      input_schema: buildViewOpenSchema(),
    },
    handler,
  };
}
