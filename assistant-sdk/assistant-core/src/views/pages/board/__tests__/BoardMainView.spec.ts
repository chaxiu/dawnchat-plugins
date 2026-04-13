import { mount } from "@vue/test-utils";

import { createManifestSnapshot } from "../../../../runtime/view";
import { useViewState } from "../../../../runtime/view/state";
import BoardMainView from "../BoardMainView.vue";
import {
  boardMainView,
  BOARD_DEFAULT_RESOURCE,
  cloneBoardStateBinding,
} from "../boardMain.view";

const { emitAssistantRuntimeEvent } = vi.hoisted(() => ({
  emitAssistantRuntimeEvent: vi.fn(() => true),
}));

vi.mock("../../../../runtime/runtimeEventBridge", () => ({
  emitAssistantRuntimeEvent,
}));

vi.mock("@vue-flow/core", async () => {
  const vue = await import("vue");
  return {
    VueFlow: vue.defineComponent({
      name: "VueFlowStub",
      template: "<div class='vue-flow-stub'><slot /></div>",
    }),
    MarkerType: {
      ArrowClosed: "arrowclosed",
    },
  };
});

vi.mock("@vue-flow/background", async () => {
  const vue = await import("vue");
  return {
    Background: vue.defineComponent({
      name: "BackgroundStub",
      template: "<div class='background-stub' />",
    }),
  };
});

vi.mock("@vue-flow/controls", async () => {
  const vue = await import("vue");
  return {
    Controls: vue.defineComponent({
      name: "ControlsStub",
      template: "<div class='controls-stub' />",
    }),
  };
});

function activateView(resource = cloneBoardStateBinding(BOARD_DEFAULT_RESOURCE)) {
  useViewState().setActiveViewState({
    viewId: "board.main",
    activeAnchor: "board.canvas",
    state_binding: resource,
    manifest: createManifestSnapshot(boardMainView, resource, "board.canvas"),
  });
}

async function waitForBoardUi() {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

describe("BoardMainView", () => {
  afterEach(() => {
    emitAssistantRuntimeEvent.mockClear();
    useViewState().clearViewState();
  });

  it("renders the active board scene with floating toolbar and inspector", () => {
    activateView();
    const wrapper = mount(BoardMainView);

    expect(wrapper.text()).toContain("Workspace");
    expect(wrapper.text()).toContain("Properties");
    expect(wrapper.text()).toContain("Case Brief");
    expect(wrapper.findAll(".node-list__item")).toHaveLength(3);
    expect(wrapper.findAll(".capability-list span")).toHaveLength(9);
    expect(wrapper.find(".board-overlay-top").exists()).toBe(true);
    expect(wrapper.find(".board-canvas").exists()).toBe(true);
  });

  it("shows idle copy when the board scene is not active", async () => {
    const wrapper = mount(BoardMainView);
    await waitForBoardUi();

    expect(wrapper.text()).toContain("Waiting for");
    expect(wrapper.text()).toContain("board.workspace");
    expect(wrapper.find(".board-canvas").exists()).toBe(false);
  });
});
