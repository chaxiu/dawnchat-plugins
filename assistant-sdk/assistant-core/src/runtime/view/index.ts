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
export {
  applyViewOpenFromInput,
  createViewOpenCapabilityRegistration,
  openAssistantViewFromShell,
} from "./runtime.open";
export {
  ASSISTANT_LAUNCHER_ROUTE,
  ASSISTANT_SPLASH_ROUTE,
  ASSISTANT_WELCOME_ROUTE,
} from "./assistantNavigationRoutes";
export {
  getLauncherContentExitFullPath,
  goBackFromAssistantLauncher,
  hasLauncherBackTarget,
  installAssistantLauncherNavigation,
  launcherContentExitFullPath,
  normalizeAssistantNavKey,
  resetLauncherContentExitForTests,
} from "./launcherNavigation";
export type { InstallAssistantLauncherNavigationOptions } from "./launcherNavigation";
export {
  LAUNCHER_FAB_STORAGE_VERSION,
  launcherFabPixelsToRatios,
  launcherFabRatiosToPixels,
  launcherFabStorageKey,
  parseLauncherFabPosition,
} from "./launcherFabPosition";
export type { LauncherFabPositionV1 } from "./launcherFabPosition";
export {
  filterRegistrationsForLauncher,
  resolveLauncherIconComponent,
} from "./launcherResolve";
export { default as AssistantLauncherPage } from "../../views/pages/launcher/AssistantLauncherPage.vue";
export { default as AssistantLauncherFab } from "../../views/shared/AssistantLauncherFab.vue";
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
