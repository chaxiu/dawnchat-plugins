import type { ViewPlaybookExample } from "../../../../runtime/view/manifest";
import { createCapabilityInvokeAction, createSessionStartExample } from "./shared";

export const sessionAddTwoObjectsAndMoveOneExample: ViewPlaybookExample = createSessionStartExample(
  "session_add_two_objects_and_move_one",
  [
    {
      id: "add-car-a",
      action: createCapabilityInvokeAction("plane.add_object", {
        id: "car-a",
        shape: "rect",
        x: 0,
        y: 1,
        label: "Car A",
        color: "#8eff9b",
      }),
    },
    {
      id: "add-car-b",
      action: createCapabilityInvokeAction("plane.add_object", {
        id: "car-b",
        shape: "rect",
        x: 4,
        y: 1,
        label: "Car B",
        color: "#8dd3ff",
      }),
    },
    {
      id: "animate-car-a",
      action: createCapabilityInvokeAction("plane.animate_object", {
        object_id: "car-a",
        to_x: 6,
        to_y: 1,
        duration_ms: 1800,
      }),
    },
    {
      id: "narrate-motion",
      action: {
        type: "guide.narrate",
        payload: {
          text: "你可以把横轴看成时间或距离，绿色物体正在沿着 x 轴向前移动。",
        },
      },
    },
  ]
);
