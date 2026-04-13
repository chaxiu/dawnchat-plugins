import type { ViewPlaybookExample } from "../../../../runtime/view/manifest";
import { createViewCapabilityCall, PLANE_MAIN_VIEW_ID } from "./shared";

export const openThenDescribeExample: ViewPlaybookExample = {
  name: "open_then_describe",
  mode: "entry",
  call: createViewCapabilityCall("view.open", {
    view_id: PLANE_MAIN_VIEW_ID,
    state_binding: {},
    initial_anchor: "plane.stage",
  }),
  then: createViewCapabilityCall("assistant.view.describe", {
    view_id: PLANE_MAIN_VIEW_ID,
  }),
};
