import { mount } from "@vue/test-utils";

import { createManifestSnapshot } from "../../../../runtime/view";
import { useViewState } from "../../../../runtime/view/state";
import TictactoeMainView from "../TictactoeMainView.vue";
import {
  cloneTictactoeStateBinding,
  TICTACTOE_DEFAULT_RESOURCE,
  tictactoeMainView,
} from "../tictactoeMain.view";

const { emitAssistantRuntimeEvent } = vi.hoisted(() => ({
  emitAssistantRuntimeEvent: vi.fn(() => true),
}));

vi.mock("../../../../runtime/runtimeEventBridge", () => ({
  emitAssistantRuntimeEvent,
}));

function activateView(resource = cloneTictactoeStateBinding(TICTACTOE_DEFAULT_RESOURCE)) {
  useViewState().setActiveViewState({
    viewId: "tictactoe.main",
    activeAnchor: "tictactoe.board",
    state_binding: resource,
    manifest: createManifestSnapshot(tictactoeMainView, resource, "tictactoe.board"),
  });
}

describe("TictactoeMainView", () => {
  afterEach(() => {
    emitAssistantRuntimeEvent.mockClear();
    useViewState().clearViewState();
  });

  it("updates the local board and emits cell_selected on click", async () => {
    activateView();
    const wrapper = mount(TictactoeMainView);

    await wrapper.get('[data-cell-index="0"]').trigger("click");

    const snapshot = useViewState().getViewStateSnapshot();
    expect(snapshot.current_state_binding?.data).toEqual(expect.objectContaining({
      current_player: "O",
      move_count: 1,
      status: "playing",
      winner: "",
      cells: expect.arrayContaining(["X"]),
    }));
    expect((snapshot.current_state_binding?.data.cells as string[])[0]).toBe("X");
    expect(emitAssistantRuntimeEvent).toHaveBeenCalledWith({
      type: "assistant.game.tictactoe.cell_selected",
      source: "view",
      payload: expect.objectContaining({
        move_index: 0,
        row: 0,
        col: 0,
        player: "X",
        move_count: 1,
        game_status: "playing",
      }),
    });
  });

  it("emits round_finished when the local move closes a 4-line", async () => {
    const resource = cloneTictactoeStateBinding(TICTACTOE_DEFAULT_RESOURCE);
    resource.data = {
      ...resource.data,
      cells: [
        "X", "X", "X", "", "",
        "O", "O", "", "", "",
        "", "", "", "", "",
        "", "", "", "", "",
        "", "", "", "", "",
      ],
      current_player: "X",
      move_count: 5,
      winner: "",
      status: "playing",
      last_move: null,
      winning_cells: [],
    };
    activateView(resource);
    const wrapper = mount(TictactoeMainView);

    await wrapper.get('[data-cell-index="3"]').trigger("click");

    const snapshot = useViewState().getViewStateSnapshot();
    expect(snapshot.current_state_binding?.data).toEqual(expect.objectContaining({
      current_player: "",
      move_count: 6,
      status: "won",
      winner: "X",
      winning_cells: [0, 1, 2, 3],
    }));
    expect(emitAssistantRuntimeEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      type: "assistant.game.tictactoe.cell_selected",
    }));
    expect(emitAssistantRuntimeEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      type: "assistant.game.tictactoe.round_finished",
      payload: expect.objectContaining({
        winner: "X",
        move_index: 3,
        game_status: "won",
        winning_cells: [0, 1, 2, 3],
      }),
    }));
  });
});
