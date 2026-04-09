import type { ViewPlaybookExample } from "../../../../runtime/view/manifest";
import { createCapabilityInvokeAction, createSessionStartExample } from "./shared";

export const sessionDrawPolygonAndFocusVertexExample: ViewPlaybookExample = createSessionStartExample(
  "session_draw_polygon_and_focus_vertex",
  [
    {
      id: "add-polygon",
      action: createCapabilityInvokeAction("plane.add_polygon", {
        id: "triangle-abc",
        points: [
          { x: -1, y: -1 },
          { x: 3, y: -1 },
          { x: 1, y: 2 },
        ],
        color: "#f5b861",
        fill_color: "rgba(245, 184, 97, 0.14)",
      }),
    },
    {
      id: "mark-point-a",
      action: createCapabilityInvokeAction("plane.add_point", {
        id: "point-a",
        x: -1,
        y: -1,
        label: "A",
      }),
    },
    {
      id: "mark-point-b",
      action: createCapabilityInvokeAction("plane.add_point", {
        id: "point-b",
        x: 3,
        y: -1,
        label: "B",
      }),
    },
    {
      id: "mark-point-c",
      action: createCapabilityInvokeAction("plane.add_point", {
        id: "point-c",
        x: 1,
        y: 2,
        label: "C",
      }),
    },
    {
      id: "label-triangle",
      action: createCapabilityInvokeAction("plane.set_label", {
        target_id: "triangle-abc",
        label: "Triangle ABC",
        label_anchor: "top",
        label_offset_dy: 0.45,
      }),
    },
    {
      id: "focus-vertex-c",
      action: createCapabilityInvokeAction("plane.focus_region", {
        center_x: 1,
        center_y: 2,
        x_span: 4,
        y_span: 4,
      }),
    },
    {
      id: "highlight-vertex-c",
      action: createCapabilityInvokeAction("plane.highlight", {
        target_ids: ["triangle-abc", "point-c"],
        label: "Focus on vertex C",
      }),
    },
    {
      id: "narrate-vertex",
      action: {
        type: "guide.narrate",
        payload: {
          text: "先画出三角形，再明确标出 A、B、C。现在聚焦顶点 C，后续就能稳定解释顶角和邻边 AC、BC 的关系。",
        },
      },
    },
  ]
);
