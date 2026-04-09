import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import { createManifestSnapshot } from "../../../../runtime/view";
import { useViewState } from "../../../../runtime/view/state";
import CoordinatePlaneMainView from "../CoordinatePlaneMainView.vue";
import {
  cloneCoordinatePlaneResource,
  coordinatePlaneMainView,
  normalizeCoordinatePlaneResource,
} from "../coordinatePlaneMain.view";

const { initBoardMock, freeBoardMock, emitAssistantRuntimeEventMock } = vi.hoisted(() => {
  const boardMock = {
    create: vi.fn(() => ({
      setAttribute: vi.fn(),
      moveTo: vi.fn(),
      coords: { usrCoords: [1, 0, 0] },
    })),
    removeObject: vi.fn(),
    setBoundingBox: vi.fn(),
    update: vi.fn(),
    resizeContainer: vi.fn(),
  };
  return {
    initBoardMock: vi.fn(() => boardMock),
    freeBoardMock: vi.fn(),
    emitAssistantRuntimeEventMock: vi.fn(),
  };
});

vi.mock("jsxgraph", () => ({
  default: {
    JSXGraph: {
      initBoard: initBoardMock,
      freeBoard: freeBoardMock,
    },
  },
}));

vi.mock("../../../../runtime/runtimeEventBridge", () => ({
  emitAssistantRuntimeEvent: emitAssistantRuntimeEventMock,
}));

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

function activateView(resource = cloneCoordinatePlaneResource(normalizeCoordinatePlaneResource({
  resource_type: "plane.scene",
  title: "Traffic Distance Demo",
  data: {
    viewport: {
      x_min: -50,
      x_max: 500,
      y_min: -50,
      y_max: 250,
      show_grid: false,
      show_axes: false,
    },
    objects: [
      { id: "point-a", type: "point", x: 200, y: 0, label: "A", size: 5 },
      { id: "car-a", type: "object", shape: "rect", x: 0, y: 1, label: "Car A" },
      { id: "circle-o", type: "circle", center_x: 0, center_y: 0, radius: 4, label: "Circle O" },
      { id: "arc-d", type: "arc", center_x: 100, center_y: 100, radius: 30, start_angle_deg: 0, end_angle_deg: 135, label: "∠D" },
      {
        id: "angle-bac",
        type: "angle_marker",
        ax: 220,
        ay: 0,
        vertex_x: 200,
        vertex_y: 0,
        bx: 214,
        by: 14,
        sweep_direction: "counterclockwise",
        marker_style: "right_angle_square",
        radius: 12,
        label: "∠BAC",
      },
      { id: "radius-oa", type: "segment", x1: 0, y1: 0, x2: 4, y2: 0, label: "OA" },
      { id: "formula-1", type: "formula_label", x: 1.2, y: 3.5, text: "r = 4" },
    ],
    highlights: [
      { id: "focus-1", target_ids: ["car-a"], label: "Keep distance" },
    ],
  },
}))) {
  useViewState().setActiveViewState({
    viewId: "plane.main",
    activeAnchor: "plane.stage",
    resource,
    manifest: createManifestSnapshot(coordinatePlaneMainView, resource, "plane.stage"),
  });
}

describe("CoordinatePlaneMainView", () => {
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    initBoardMock.mockClear();
    freeBoardMock.mockClear();
    emitAssistantRuntimeEventMock.mockClear();
    useViewState().clearViewState();
  });

  it("renders immersive coordinate stage and initializes JSXGraph board", async () => {
    activateView();
    const wrapper = mount(CoordinatePlaneMainView);
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toContain("Traffic Distance Demo");
    expect(wrapper.find(".coordinate-plane-scene").exists()).toBe(true);
    expect(wrapper.find(".plane-board").exists()).toBe(true);
    expect(wrapper.find(".highlight-ribbon").text()).toContain("Keep distance");
    expect(wrapper.find(".floating-title").exists()).toBe(true);
    expect(wrapper.find(".board-overlay.is-error").exists()).toBe(false);
  });

  it("shows idle copy when the coordinate plane scene is not active", () => {
    const wrapper = mount(CoordinatePlaneMainView);

    expect(wrapper.text()).toContain("Waiting for");
    expect(wrapper.text()).toContain("plane.scene");
    expect(wrapper.find(".plane-board").exists()).toBe(false);
  });
});
