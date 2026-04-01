import { createViewCapabilityInvokeHandler } from "./viewRuntime.capability";
import { createViewDescribeCapabilityRegistration } from "./viewRuntime.describe";
import { createViewFocusHandler } from "./viewRuntime.focus";
import { createViewOpenHandler } from "./viewRuntime.open";
import type { ViewRuntimeDeps, ViewRuntimeHandlers } from "./viewRuntime.shared";

export type { ViewRuntimeDeps, ViewRuntimeHandlers } from "./viewRuntime.shared";
export { createViewDescribeCapabilityRegistration } from "./viewRuntime.describe";

export function createViewRuntime(deps: ViewRuntimeDeps): ViewRuntimeHandlers {
  return {
    open: createViewOpenHandler(deps),
    focus: createViewFocusHandler(deps),
    "capability.invoke": createViewCapabilityInvokeHandler(deps),
  };
}
