import {
  buildWordMainStateSummary,
  invokeWordMainCapability,
} from "../../views/pages/word/wordMain.capabilities";
import {
  openWordMainView,
  normalizeWordResource,
  WORD_DEFAULT_RESOURCE,
  wordMainView,
} from "../../views/pages/word/wordMain.view";
import {
  buildTictactoeMainStateSummary,
  invokeTictactoeMainCapability,
} from "../../views/pages/tictactoe/tictactoeMain.capabilities";
import {
  openTictactoeMainView,
  TICTACTOE_DEFAULT_RESOURCE,
  tictactoeMainView,
  validateTictactoeResource,
} from "../../views/pages/tictactoe/tictactoeMain.view";

describe("scene definitions", () => {
  it("exposes compact view definitions for registered scenes", () => {
    expect(wordMainView.route.full_path).toBe("/views/word/main");
    expect(tictactoeMainView.route.full_path).toBe("/views/tictactoe/main");
    expect(wordMainView.capabilities.map((item) => [item.id, item.mode])).toEqual([
      ["highlight_meaning", "read"],
      ["append_etymology", "write"],
      ["set_title", "write"],
    ]);
    expect(tictactoeMainView.capabilities.map((item) => item.id)).toEqual([
      "game.place_mark",
      "game.reset",
    ]);
  });

  it("opens word.main with normalized resource payload", () => {
    const result = openWordMainView({
      resource: {
        resource_type: "word",
        data: {
          word: "Evolution",
          meaning: "逐步演化",
          etymology: ["e- + volvere"],
        },
      },
    });

    expect(result).toEqual({
      resource: {
        resource_type: "word",
        resource_id: "word:evolution",
        title: "Evolution Workspace",
        data: {
          word: "Evolution",
          meaning: "逐步演化",
          etymology: ["e- + volvere"],
        },
      },
      activeAnchor: "word.header",
      data: {
        status: "applied",
        resource_id: "word:evolution",
      },
    });
  });

  it("rejects invalid word resource payload", () => {
    const result = normalizeWordResource({
      resource_type: "word",
      data: {
        word: "",
      },
    });

    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_resource",
      message: "word.main requires resource.data.word to be a non-empty string",
      data: undefined,
    });
  });

  it("appends etymology entries and updates active anchor", () => {
    const result = invokeWordMainCapability("append_etymology", {
      items: ["来自拉丁语演化"],
    }, WORD_DEFAULT_RESOURCE);

    expect(result).toEqual({
      resource: {
        resource_type: "word",
        resource_id: "word:assistant",
        title: "词汇讲解",
        data: {
          word: "Assistant",
          meaning: "你的自进化智能助理",
          etymology: ["支持富媒体呈现", "支持代码级进化", "来自拉丁语演化"],
        },
      },
      activeAnchor: "word.etymology",
      data: {
        status: "applied",
        appended_count: 1,
        appended_items: ["来自拉丁语演化"],
      },
    });
  });

  it("returns capability input error for empty title", () => {
    const result = invokeWordMainCapability("set_title", {
      title: "   ",
    }, WORD_DEFAULT_RESOURCE);

    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_capability_input",
      message: "set_title requires input.title to be a non-empty string",
      data: undefined,
    });
  });

  it("builds word state summary from current resource", () => {
    const summary = buildWordMainStateSummary({
      resource_type: "word",
      resource_id: "word:reference",
      title: "Checkpoint Workspace",
      data: {
        word: "Checkpoint",
        meaning: "恢复点",
        etymology: ["check + point"],
      },
    }, "word.meaning");

    expect(summary).toEqual({
      resource_title: "Checkpoint Workspace",
      word: "Checkpoint",
      has_meaning: true,
      etymology_count: 1,
      active_anchor: "word.meaning",
    });
  });

  it("opens tictactoe.main with normalized board payload", () => {
    const result = openTictactoeMainView({
      resource: {
        resource_type: "tictactoe.game",
        title: "Flow Wait Arena",
        data: {
          cells: [
            "X", "", "", "", "",
            "", "", "", "", "",
            "", "", "", "", "",
            "", "", "", "", "",
            "", "", "", "", "",
          ],
          current_player: "O",
          move_count: 1,
          winner: "",
          status: "playing",
          last_move: {
            index: 0,
            row: 0,
            col: 0,
            player: "X",
          },
          winning_cells: [],
        },
      },
    });

    expect(result).toEqual({
      resource: {
        resource_type: "tictactoe.game",
        resource_id: "tictactoe:neon-grid",
        title: "Flow Wait Arena",
        data: {
          board_size: 5,
          win_length: 4,
          cells: [
            "X", "", "", "", "",
            "", "", "", "", "",
            "", "", "", "", "",
            "", "", "", "", "",
            "", "", "", "", "",
          ],
          current_player: "O",
          move_count: 1,
          winner: "",
          status: "playing",
          last_move: {
            index: 0,
            row: 0,
            col: 0,
            player: "X",
          },
          winning_cells: [],
        },
      },
      activeAnchor: "tictactoe.board",
      data: {
        status: "applied",
        resource_id: "tictactoe:neon-grid",
      },
    });
  });

  it("rejects invalid tictactoe resource payload", () => {
    const result = validateTictactoeResource({
      resource_type: "wrong.type",
      data: {},
    });

    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_resource",
      message: "tictactoe.main requires resource.resource_type to be 'tictactoe.game'",
      data: undefined,
    });
  });

  it("places a mark, resolves 4-line wins, and supports reset", () => {
    const midgame = {
      ...TICTACTOE_DEFAULT_RESOURCE,
      data: {
        ...TICTACTOE_DEFAULT_RESOURCE.data,
        cells: [
          "X", "X", "X", "", "",
          "O", "O", "", "", "",
          "", "", "", "", "",
          "", "", "", "", "",
          "", "", "", "", "",
        ],
        current_player: "X",
        move_count: 5,
      },
    };
    const placeResult = invokeTictactoeMainCapability("game.place_mark", {
      index: 3,
    }, midgame);

    expect(placeResult).toEqual({
      resource: {
        resource_type: "tictactoe.game",
        resource_id: "tictactoe:neon-grid",
        title: "Neon Grid",
        data: {
          board_size: 5,
          win_length: 4,
          cells: [
            "X", "X", "X", "X", "",
            "O", "O", "", "", "",
            "", "", "", "", "",
            "", "", "", "", "",
            "", "", "", "", "",
          ],
          current_player: "",
          move_count: 6,
          winner: "X",
          status: "won",
          last_move: {
            index: 3,
            row: 0,
            col: 3,
            player: "X",
          },
          winning_cells: [0, 1, 2, 3],
        },
      },
      activeAnchor: "tictactoe.board",
      data: {
        status: "applied",
        player: "X",
        move_index: 3,
        row: 0,
        col: 3,
        move_count: 6,
        game_status: "won",
        winner: "X",
        round_finished: true,
        winning_cells: [0, 1, 2, 3],
      },
    });

    const resetResult = invokeTictactoeMainCapability("game.reset", {}, midgame);
    expect(resetResult).toEqual({
      resource: expect.objectContaining({
        resource_type: "tictactoe.game",
        data: expect.objectContaining({
          current_player: "X",
          move_count: 0,
          winner: "",
          status: "playing",
          winning_cells: [],
        }),
      }),
      activeAnchor: "tictactoe.board",
      data: {
        status: "applied",
        game_status: "playing",
        current_player: "X",
      },
    });
  });

  it("builds tictactoe state summary from current resource", () => {
    const summary = buildTictactoeMainStateSummary({
      resource_type: "tictactoe.game",
      resource_id: "tictactoe:demo",
      title: "Realtime Arena",
      data: {
        board_size: 5,
        win_length: 4,
        cells: Array.from({ length: 25 }, (_, index) => (index === 0 ? "X" : "")),
        current_player: "O",
        move_count: 1,
        winner: "",
        status: "playing",
        last_move: {
          index: 0,
          row: 0,
          col: 0,
          player: "X",
        },
        winning_cells: [],
      },
    }, "tictactoe.board");

    expect(summary).toEqual({
      resource_title: "Realtime Arena",
      status: "playing",
      current_player: "O",
      winner: "",
      move_count: 1,
      last_move_index: 0,
      active_anchor: "tictactoe.board",
    });
  });
});
