import { createViewContractCapabilityRegistration, getViewRegistration } from "../view";

describe("assistant.view.contract", () => {
  it("returns one view definition with scene-specific hints and examples", async () => {
    const registration = createViewContractCapabilityRegistration({
      setActiveViewState: vi.fn(() => 1),
      getViewStateSnapshot: vi.fn(() => ({
        active_view_id: "word.main",
        active_anchor: "word.header",
        current_resource: null,
        active_manifest: null,
        view_state_version: 1,
      })),
      navigateToView: vi.fn(),
    });

    const result = await registration.handler({ view_id: "board.main" }, {});

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        view_definition: expect.objectContaining({
          view_id: "board.main",
          route_path: "/views/board/main",
          capabilities: expect.arrayContaining([
            expect.objectContaining({
              capability_id: "board.add_node",
              input_schema: expect.any(Object),
            }),
          ]),
        }),
        recommended_mode: "hybrid",
        decision_rule: expect.stringContaining("node_id"),
        key_events: expect.arrayContaining([
          expect.objectContaining({
            type: "assistant.board.node_selected",
          }),
        ]),
        examples: expect.arrayContaining([
          expect.objectContaining({
            name: "open_then_describe",
          }),
          expect.objectContaining({
            name: "describe_then_connect_by_confirmed_ids",
          }),
        ]),
      }),
    });
    expect(result.data).not.toHaveProperty("runtime_contracts");
    expect(result.data).not.toHaveProperty("current_resource_summary");
  });

  it("exposes image.explainer narration-oriented examples", async () => {
    const registration = createViewContractCapabilityRegistration({
      setActiveViewState: vi.fn(() => 1),
      getViewStateSnapshot: vi.fn(() => ({
        active_view_id: "image.explainer",
        active_anchor: "image.stage",
        current_resource: null,
        active_manifest: null,
        view_state_version: 1,
      })),
      navigateToView: vi.fn(),
    });

    const result = await registration.handler({ view_id: "image.explainer" }, {});

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        view_definition: expect.objectContaining({
          view_id: "image.explainer",
          route_path: "/views/image/explainer",
          capabilities: expect.arrayContaining([
            expect.objectContaining({
              capability_id: "image.set_pages",
            }),
          ]),
        }),
        recommended_mode: "session_start",
        decision_rule: expect.stringContaining("guide.narrate"),
        examples: expect.arrayContaining([
          expect.objectContaining({
            name: "session_narrate_show_page_highlight",
            call: expect.objectContaining({
              payload: expect.objectContaining({
                steps: expect.arrayContaining([
                  expect.objectContaining({
                    action: expect.objectContaining({
                      type: "guide.narrate",
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    });
  });

  it("exposes plane.main motion-oriented examples", async () => {
    const registration = createViewContractCapabilityRegistration({
      setActiveViewState: vi.fn(() => 1),
      getViewStateSnapshot: vi.fn(() => ({
        active_view_id: "plane.main",
        active_anchor: "plane.stage",
        current_resource: null,
        active_manifest: null,
        view_state_version: 1,
      })),
      navigateToView: vi.fn(),
    });

    const result = await registration.handler({ view_id: "plane.main" }, {});

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        view_definition: expect.objectContaining({
          view_id: "plane.main",
          route_path: "/views/plane/main",
          capabilities: expect.arrayContaining([
            expect.objectContaining({
              capability_id: "plane.add_circle",
            }),
            expect.objectContaining({
              capability_id: "plane.set_label",
            }),
            expect.objectContaining({
              capability_id: "plane.set_style",
            }),
            expect.objectContaining({
              capability_id: "plane.add_angle_marker",
            }),
          ]),
        }),
        recommended_mode: "session_start",
        decision_rule: expect.stringContaining("guide.narrate"),
        key_events: expect.arrayContaining([
          expect.objectContaining({
            type: "assistant.plane.animation_completed",
          }),
        ]),
        examples: expect.arrayContaining([
          expect.objectContaining({
            name: "session_draw_circle_and_radius",
            call: expect.objectContaining({
              payload: expect.objectContaining({
                steps: expect.arrayContaining([
                  expect.objectContaining({
                    action: expect.objectContaining({
                      type: "view.capability.invoke",
                      payload: expect.objectContaining({
                        capability_id: "plane.add_circle",
                        input: expect.objectContaining({
                          radius: 4,
                        }),
                      }),
                    }),
                  }),
                expect.objectContaining({
                  action: expect.objectContaining({
                    type: "view.capability.invoke",
                    payload: expect.objectContaining({
                      capability_id: "plane.set_label",
                    }),
                  }),
                }),
                ]),
              }),
            }),
          }),
          expect.objectContaining({
            name: "session_geometry_solution_steps_with_angle_marker",
            call: expect.objectContaining({
              payload: expect.objectContaining({
                steps: expect.arrayContaining([
                  expect.objectContaining({
                    action: expect.objectContaining({
                      type: "view.capability.invoke",
                      payload: expect.objectContaining({
                        capability_id: "plane.add_angle_marker",
                        input: expect.objectContaining({
                          marker_style: "right_angle_square",
                        }),
                      }),
                    }),
                  }),
                ]),
              }),
            }),
          }),
          expect.objectContaining({
            name: "session_emphasize_formula_with_style_and_label",
          }),
        ]),
      }),
    });
  });
});
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

function getTictactoeMainRegistration() {
  const registration = getViewRegistration("tictactoe.main");
  expect(registration).not.toBeNull();
  return registration!;
}

describe("scene definitions", () => {
  it("exposes compact view definitions for registered scenes", () => {
    const tictactoeMainView = getTictactoeMainRegistration();
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
    const tictactoeMainView = getTictactoeMainRegistration();
    const result = tictactoeMainView.open!({
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
    const tictactoeMainView = getTictactoeMainRegistration();
    const result = tictactoeMainView.normalizeResource!({
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
    const tictactoeMainView = getTictactoeMainRegistration();
    const defaultResource = JSON.parse(JSON.stringify(tictactoeMainView.default_resource)) as typeof tictactoeMainView.default_resource;
    const midgame = {
      ...defaultResource,
      data: {
        ...defaultResource.data,
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
    const placeResult = tictactoeMainView.invokeCapability!("game.place_mark", {
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

    const resetResult = tictactoeMainView.invokeCapability!("game.reset", {}, midgame);
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
    const tictactoeMainView = getTictactoeMainRegistration();
    const summary = tictactoeMainView.getStateSummary({
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
