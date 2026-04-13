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
  getDefaultCoreViewRegistration,
  getDefaultCoreViewRouteDefinition,
  getViewRegistration,
  getViewRouteDefinition,
  installViewRegistryProvider,
  listDefaultCoreViewRegistrations,
  listViewRegistrations,
  uninstallViewRegistryProvider,
} from "./registry";
export type { ViewRegistryProvider } from "./registry";
export { default as RegisteredViewRoute } from "./RegisteredViewRoute.vue";
export { default as ViewHost } from "./ViewHost.vue";
export type {
  ViewAnchorDefinition,
  ViewCapabilityDefinition,
  ViewCapabilityMode,
  ViewCapabilitySuccess,
  DefineViewInput,
  ViewDescribeOptions,
  ViewEventHint,
  ViewInteractionHints,
  ViewPlaybookExample,
  ViewPlaybookExampleCall,
  ViewCapabilityResult,
  ViewManifestSnapshot,
  ViewOpenSuccess,
  ViewOpenResult,
  ViewOperationFailure,
  ViewPersistenceConfig,
  ViewPersistenceStateSnapshot,
  ViewRenderMode,
  ViewRecommendedMode,
  ViewRegistration,
  ViewStateBinding,
  ViewRouteDefinition,
  ViewStateMode,
  ViewWaitStrategy,
} from "./manifest";
export { defineView, buildViewRouteDefinition } from "./manifest";

export function createViewRuntime(deps: ViewRuntimeDeps): ViewRuntimeHandlers {
  return {
    open: createViewOpenHandler(deps),
    focus: createViewFocusHandler(deps),
    "capability.invoke": createViewCapabilityInvokeHandler(deps),
  };
}
