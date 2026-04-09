import type { ViewPlaybookExample, ViewPlaybookExampleCall } from "../../../../runtime/view/manifest";

export const PLANE_MAIN_VIEW_ID = "plane.main";

export function createCapabilityInvokeAction(capabilityId: string, input: Record<string, unknown>) {
  return {
    type: "view.capability.invoke",
    payload: {
      view_id: PLANE_MAIN_VIEW_ID,
      capability_id: capabilityId,
      input,
    },
  };
}

export function createSessionStartExample(
  name: string,
  steps: Array<{ id: string; action: Record<string, unknown> }>
): ViewPlaybookExample {
  return {
    name,
    mode: "session_start",
    call: {
      tool: "dawnchat.ui.session.start",
      payload: {
        plugin_id: "<plugin_id>",
        steps,
      },
    },
  };
}

export function createViewCapabilityCall(functionName: string, input: Record<string, unknown>): ViewPlaybookExampleCall {
  return {
    tool: "dawnchat.ui.capability.invoke",
    payload: {
      plugin_id: "<plugin_id>",
      function: functionName,
      input,
    },
  };
}
