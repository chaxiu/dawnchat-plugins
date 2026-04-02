import { createViewCapabilityInvokeHandler } from "./runtime.capability";
import { createViewDescribeCapabilityRegistration } from "./runtime.describe";
import { createViewFocusHandler } from "./runtime.focus";
import { createViewOpenHandler } from "./runtime.open";
import type { ViewRuntimeDeps, ViewRuntimeHandlers } from "./runtime.shared";

export type { ViewRuntimeDeps, ViewRuntimeHandlers } from "./runtime.shared";
export { createViewDescribeCapabilityRegistration } from "./runtime.describe";
export { useViewState, type SetActiveViewStateInput, type ViewStateSnapshot } from "./state";
export {
  getViewRegistration,
  getViewRouteDefinition,
  listViewRegistrations,
} from "./registry";
export type {
  ViewCapabilityDefinition,
  ViewCapabilityResult,
  ViewManifest,
  ViewManifestSnapshot,
  ViewOpenSuccess,
  ViewOpenResult,
  ViewOperationFailure,
  ViewRegistration,
  ViewResourceBinding,
  ViewRouteDefinition,
} from "./manifest";

export function createViewRuntime(deps: ViewRuntimeDeps): ViewRuntimeHandlers {
  return {
    open: createViewOpenHandler(deps),
    focus: createViewFocusHandler(deps),
    "capability.invoke": createViewCapabilityInvokeHandler(deps),
  };
}
