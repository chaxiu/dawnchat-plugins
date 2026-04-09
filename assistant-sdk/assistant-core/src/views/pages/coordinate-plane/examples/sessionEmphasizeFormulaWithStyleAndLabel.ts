import type { ViewPlaybookExample } from "../../../../runtime/view/manifest";
import { createCapabilityInvokeAction, createSessionStartExample } from "./shared";

export const sessionEmphasizeFormulaWithStyleAndLabelExample: ViewPlaybookExample = createSessionStartExample(
  "session_emphasize_formula_with_style_and_label",
  [
    {
      id: "add-vector",
      action: createCapabilityInvokeAction("plane.add_vector", {
        id: "vector-ab",
        x1: 0,
        y1: 0,
        x2: 4,
        y2: 3,
        color: "#9cffb1",
      }),
    },
    {
      id: "label-vector",
      action: createCapabilityInvokeAction("plane.set_label", {
        target_id: "vector-ab",
        label: "AB",
        label_anchor: "midpoint",
        label_offset_dy: 0.45,
      }),
    },
    {
      id: "emphasize-vector",
      action: createCapabilityInvokeAction("plane.set_style", {
        target_ids: ["vector-ab"],
        color: "#ffe08a",
        width: 4,
      }),
    },
    {
      id: "show-formula",
      action: createCapabilityInvokeAction("plane.show_formula_label", {
        id: "formula-1",
        x: 2.2,
        y: 3.4,
        text: "|AB| = sqrt(4^2 + 3^2) = 5",
      }),
    },
    {
      id: "narrate-formula",
      action: {
        type: "guide.narrate",
        payload: {
          text: "这里我先把向量 AB 强调出来，再把结论公式直接贴到画面上，便于用户跟着视觉焦点理解。",
        },
      },
    },
  ]
);
