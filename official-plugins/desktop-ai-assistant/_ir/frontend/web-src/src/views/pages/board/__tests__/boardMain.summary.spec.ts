import {
  BOARD_DEFAULT_RESOURCE,
  buildBoardMainStateSummary,
} from "../boardMain.view";

describe("board.main summary", () => {
  it("builds board state summary from current resource", () => {
    const summary = buildBoardMainStateSummary(BOARD_DEFAULT_RESOURCE, "board.canvas");

    expect(summary).toEqual(expect.objectContaining({
      resource_title: "Holographic Clue Wall",
      board_id: "board:holographic-clue-wall",
      node_count: 3,
      edge_count: 2,
      pinned_node_count: 0,
      selected_node_count: 1,
      focused_node_id: "node-case-brief",
      layout_mode: "auto",
      active_anchor: "board.canvas",
    }));
  });
});
