import { createViewCapabilityInvokeHandler } from "./runtime.capability";
import { createViewDescribeCapabilityRegistration, createViewListCapabilityRegistration } from "./runtime.describe";
import { createViewFocusHandler } from "./runtime.focus";
import { createViewOpenHandler } from "./runtime.open";
import type { ViewRuntimeDeps, ViewRuntimeHandlers } from "./runtime.shared";

export {
  createManifestSnapshot,
  type ViewRuntimeDeps,
  type ViewRuntimeHandlers,
} from "./runtime.shared";
export { createViewDescribeCapabilityRegistration, createViewListCapabilityRegistration } from "./runtime.describe";
export { useViewState, type SetActiveViewStateInput, type ViewStateSnapshot } from "./state";
export {
  getViewRegistration,
  getViewRouteDefinition,
  listViewRegistrations,
} from "./registry";
export type {
  ViewCapabilityDefinition,
  ViewCapabilityMode,
  DefineViewInput,
  ViewEventHint,
  ViewInteractionHints,
  ViewCapabilityResult,
  ViewManifestSnapshot,
  ViewOpenSuccess,
  ViewOpenResult,
  ViewOperationFailure,
  ViewPersistenceConfig,
  ViewPersistenceStateSnapshot,
  ViewRegistration,
  ViewResourceBinding,
  ViewRouteDefinition,
} from "./manifest";
export { defineView, buildViewRouteDefinition } from "./manifest";

export function createViewRuntime(deps: ViewRuntimeDeps): ViewRuntimeHandlers {
  return {
    open: createViewOpenHandler(deps),
    focus: createViewFocusHandler(deps),
    "capability.invoke": createViewCapabilityInvokeHandler(deps),
  };
}
