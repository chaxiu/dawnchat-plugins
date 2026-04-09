import type { ViewPlaybookExample } from "../../../../runtime/view/manifest";
import { createCapabilityInvokeAction, createSessionStartExample } from "./shared";

export const sessionDrawCircleAndRadiusExample: ViewPlaybookExample = createSessionStartExample(
  "session_draw_circle_and_radius",
  [
    {
      id: "set-viewport",
      action: createCapabilityInvokeAction("plane.set_viewport", {
        x_min: -2,
        x_max: 8,
        y_min: -2,
        y_max: 8,
        show_grid: true,
        show_axes: true,
      }),
    },
    {
      id: "draw-circle",
      action: createCapabilityInvokeAction("plane.add_circle", {
        id: "circle-o",
        center_x: 0,
        center_y: 0,
        radius: 4,
        color: "#69b7ff",
        fill_color: "rgba(105, 183, 255, 0.1)",
      }),
    },
    {
      id: "draw-radius",
      action: createCapabilityInvokeAction("plane.add_line", {
        id: "radius-oa",
        line_type: "segment",
        x1: 0,
        y1: 0,
        x2: 4,
        y2: 0,
        color: "#ffd36f",
        width: 3,
      }),
    },
    {
      id: "mark-center-o",
      action: createCapabilityInvokeAction("plane.add_point", {
        id: "center-o",
        x: 0,
        y: 0,
        label: "O",
      }),
    },
    {
      id: "mark-point-a",
      action: createCapabilityInvokeAction("plane.add_point", {
        id: "point-a",
        x: 4,
        y: 0,
        label: "A",
      }),
    },
    {
      id: "label-circle",
      action: createCapabilityInvokeAction("plane.set_label", {
        target_id: "circle-o",
        label: "Circle O",
        label_anchor: "top",
        label_offset_dy: 0.6,
      }),
    },
    {
      id: "label-radius",
      action: createCapabilityInvokeAction("plane.set_label", {
        target_id: "radius-oa",
        label: "OA",
        label_anchor: "midpoint",
        label_offset_dy: 0.45,
      }),
    },
    {
      id: "highlight-radius",
      action: createCapabilityInvokeAction("plane.highlight", {
        target_ids: ["circle-o", "radius-oa", "center-o"],
        label: "Radius OA",
      }),
    },
    {
      id: "narrate-circle",
      action: {
        type: "guide.narrate",
        payload: {
          text: "这是一个以 O 为圆心、半径为 4 的圆。线段 OA 就是一条半径，它从圆心连到圆周。",
        },
      },
    },
  ]
);
