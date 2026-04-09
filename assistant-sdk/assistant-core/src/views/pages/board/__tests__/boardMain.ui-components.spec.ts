import { mount } from "@vue/test-utils";

import BoardInspector from "../components/BoardInspector.vue";
import BoardToolbar from "../components/BoardToolbar.vue";
import BoardGlobalPanel from "../components/BoardGlobalPanel.vue";
import { BOARD_DEFAULT_RESOURCE } from "../boardMain.view";
import type { BoardNode } from "../model/types";

const boardNodes = ((BOARD_DEFAULT_RESOURCE.data as Record<string, unknown>).nodes || []) as BoardNode[];

describe("board scene ui components", () => {
  it("renders toolbar actions and emits scene intents", async () => {
    const wrapper = mount(BoardToolbar, {
      props: {
        isMutating: false,
        globalPanelOpen: false,
      },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(3);
    expect(wrapper.text()).toContain("Workspace");

    await buttons[0].trigger("click");
    await buttons[1].trigger("click");
    await buttons[2].trigger("click");

    expect(wrapper.emitted("addNote")).toHaveLength(1);
    expect(wrapper.emitted("arrangeLayout")).toHaveLength(1);
    expect(wrapper.emitted("toggleGlobalPanel")).toHaveLength(1);
  });

  it("renders inspector state and emits focus and pin actions", async () => {
    const selectedNode = boardNodes[0];
    const wrapper = mount(BoardInspector, {
      props: {
        activeAnchor: "board.inspector",
        isMutating: false,
        selectedNode,
        focusedNodeId: selectedNode.id,
      },
    });

    expect(wrapper.text()).toContain("Properties");
    expect(wrapper.text()).toContain(selectedNode.title);

    await wrapper.find(".pin-btn").trigger("click");
    await wrapper.find(".close-btn").trigger("click");

    expect(wrapper.emitted("togglePinNode")).toEqual([[selectedNode]]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("renders global panel state and emits focus actions", async () => {
    const selectedNode = boardNodes[0];
    const wrapper = mount(BoardGlobalPanel, {
      props: {
        activeAnchor: "board.global",
        capabilityTitles: ["Add Node", "Arrange Layout"],
        edgeCount: 2,
        isMutating: false,
        nodes: boardNodes,
        pinnedCount: 1,
        focusedNodeId: selectedNode.id,
        debugEnabled: false,
        theme: "dark",
        styleSettings: {
          layout_algorithm: "stress",
          layout_direction: "LR",
          edge_style: "bezier",
          edge_curvature: 0.5,
          handles_mode: "eight-points",
          auto_layout_on_add: true,
          avoid_overlap_strength: "medium",
        },
      },
    });

    expect(wrapper.text()).toContain("Node Index");
    expect(wrapper.findAll(".node-list__item")).toHaveLength(boardNodes.length);
    expect(wrapper.text()).toContain("Stress");
    expect(wrapper.text()).toContain("Eight-Points");
    expect(wrapper.text()).toContain("Auto Layout On Node Add");

    await wrapper.findAll(".node-list__item")[1].trigger("click");
    expect(wrapper.emitted("focusNode")).toEqual([[boardNodes[1].id]]);
  });
});
