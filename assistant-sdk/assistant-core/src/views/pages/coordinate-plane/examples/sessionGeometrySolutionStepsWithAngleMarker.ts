import type { ViewPlaybookExample } from "../../../../runtime/view/manifest";
import { createCapabilityInvokeAction, createSessionStartExample } from "./shared";

export const sessionGeometrySolutionStepsWithAngleMarkerExample: ViewPlaybookExample = createSessionStartExample(
  "session_geometry_solution_steps_with_angle_marker",
  [
    {
      id: "set-viewport",
      action: createCapabilityInvokeAction("plane.set_viewport", {
        x_min: -1,
        x_max: 6,
        y_min: -1,
        y_max: 4,
        show_grid: true,
        show_axes: true,
      }),
    },
    {
      id: "draw-triangle",
      action: createCapabilityInvokeAction("plane.add_polygon", {
        id: "triangle-abc",
        points: [
          { x: 0, y: 2 },
          { x: 0, y: 0 },
          { x: 3, y: 0 },
        ],
        color: "#69b7ff",
        fill_color: "rgba(105, 183, 255, 0.10)",
      }),
    },
    {
      id: "draw-ab",
      action: createCapabilityInvokeAction("plane.add_line", {
        id: "segment-ab",
        line_type: "segment",
        x1: 0,
        y1: 2,
        x2: 0,
        y2: 0,
        label: "AB",
        color: "#ffd36f",
        width: 3,
      }),
    },
    {
      id: "draw-bc",
      action: createCapabilityInvokeAction("plane.add_line", {
        id: "segment-bc",
        line_type: "segment",
        x1: 0,
        y1: 0,
        x2: 3,
        y2: 0,
        label: "BC",
        color: "#9cffb1",
        width: 3,
      }),
    },
    {
      id: "mark-point-b",
      action: createCapabilityInvokeAction("plane.add_point", {
        id: "point-b",
        x: 0,
        y: 0,
        label: "B",
      }),
    },
    {
      id: "mark-point-a",
      action: createCapabilityInvokeAction("plane.add_point", {
        id: "point-a",
        x: 0,
        y: 2,
        label: "A",
      }),
    },
    {
      id: "mark-point-c",
      action: createCapabilityInvokeAction("plane.add_point", {
        id: "point-c",
        x: 3,
        y: 0,
        label: "C",
      }),
    },
    {
      id: "show-step-1",
      action: createCapabilityInvokeAction("plane.show_formula_label", {
        id: "solution-step",
        x: 2,
        y: 3.1,
        text: "Step 1: Observe that AB is vertical and BC is horizontal",
      }),
    },
    {
      id: "mark-right-angle",
      action: createCapabilityInvokeAction("plane.add_angle_marker", {
        id: "angle-abc",
        ax: 0,
        ay: 2,
        vertex_x: 0,
        vertex_y: 0,
        bx: 3,
        by: 0,
        sweep_direction: "counterclockwise",
        marker_style: "right_angle_square",
        radius: 0.75,
        label: "∠ABC",
        color: "#ffb86b",
        width: 3,
      }),
    },
    {
      id: "focus-b",
      action: createCapabilityInvokeAction("plane.focus_region", {
        center_x: 0.7,
        center_y: 0.7,
        x_span: 3.2,
        y_span: 3.2,
      }),
    },
    {
      id: "highlight-step-1",
      action: createCapabilityInvokeAction("plane.highlight", {
        target_ids: ["point-b", "segment-ab", "segment-bc", "angle-abc"],
        label: "Right angle at B",
      }),
    },
    {
      id: "narrate-step-1",
      action: {
        type: "guide.narrate",
        payload: {
          text: "第一步先把两条边 AB、BC 画清楚，再在顶点 B 用 plane.add_angle_marker 标出直角方块。这里使用 right_angle_square，是为了让 90 度关系在教学里更直观。",
        },
      },
    },
    {
      id: "show-step-2",
      action: createCapabilityInvokeAction("plane.show_formula_label", {
        id: "solution-step",
        x: 1.7,
        y: 2,
        text: "Step 2: Therefore AB ⟂ BC, so ∠ABC = 90°",
      }),
    },
    {
      id: "style-angle",
      action: createCapabilityInvokeAction("plane.set_style", {
        target_ids: ["angle-abc"],
        color: "#ffe08a",
        width: 4,
      }),
    },
    {
      id: "show-conclusion",
      action: createCapabilityInvokeAction("plane.show_formula_label", {
        id: "solution-conclusion",
        x: 1.7,
        y: 1.35,
        text: "Conclusion: ∠ABC = 90°",
      }),
    },
    {
      id: "narrate-step-2",
      action: {
        type: "guide.narrate",
        payload: {
          text: "第二步把直角关系转成文字结论。这个 example 够轻，但已经能让 Agent 学会：先作图、再标角、再聚焦、最后给出证明结论。",
        },
      },
    },
  ]
);
