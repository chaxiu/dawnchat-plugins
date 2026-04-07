import { createViewCapabilityInvokeHandler } from "./runtime.capability";
import {
  createRuntimeBootstrapCapabilityRegistration,
  createViewContractCapabilityRegistration,
  createViewDescribeCapabilityRegistration,
  createViewListCapabilityRegistration,
} from "./runtime.describe";
import { createViewFocusHandler } from "./runtime.focus";
import { createViewOpenCapabilityRegistration, createViewOpenHandler } from "./runtime.open";
import type { ViewRuntimeDeps, ViewRuntimeHandlers } from "./runtime.shared";

export {
  createManifestSnapshot,
  type ViewRuntimeDeps,
  type ViewRuntimeHandlers,
} from "./runtime.shared";
export {
  createRuntimeBootstrapCapabilityRegistration,
  createViewContractCapabilityRegistration,
  createViewDescribeCapabilityRegistration,
  createViewListCapabilityRegistration,
} from "./runtime.describe";
export { createViewOpenCapabilityRegistration } from "./runtime.open";
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
  ViewDescribeOptions,
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
