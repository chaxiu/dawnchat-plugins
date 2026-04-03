import { createViewListCapabilityRegistration } from "../view";

describe("assistant.view.list", () => {
  it("returns registered view scenes as a feature catalog", async () => {
    const registration = createViewListCapabilityRegistration({
      setActiveViewState: vi.fn(() => 1),
      getViewStateSnapshot: vi.fn(() => ({
        active_view_id: "tictactoe.main",
        active_anchor: "tictactoe.board",
        current_resource: null,
        active_manifest: {
          view_id: "tictactoe.main",
          resource_type: "tictactoe.game",
          title: "TicTacToe Arena",
          route_name: "view-tictactoe-main",
          route_path: "/views/tictactoe/main",
          state_mode: "stateful" as const,
          anchors: [],
          capabilities: [],
          interaction_hints: {
            interaction_intent: "Best for validating the full realtime chain.",
          },
          state_summary: {
            status: "playing",
            current_player: "X",
            move_count: 2,
          },
        },
        view_state_version: 3,
      })),
      getGuideStateSnapshot: vi.fn(() => ({
        current_card: null,
        active_tip: null,
        narration_state: {
          status: "idle" as const,
          text: "",
          updatedAtMs: 0,
        },
        guide_state_version: 1,
      })),
      getTaskProgressSnapshot: vi.fn(() => ({
        status: "idle" as const,
        current_task_id: "",
      })),
      getActiveResourceContextSnapshot: vi.fn(() => null),
      getContinuationSnapshot: vi.fn(() => ({
        pending_wait: null,
      })),
      navigateToView: vi.fn(),
    });

    const result = await registration.handler({}, {});

    expect(result).toEqual({
      ok: true,
      data: {
        active_view_id: "tictactoe.main",
        views: expect.arrayContaining([
          expect.objectContaining({
            view_id: "word.main",
            title: "Word Workspace",
            resource_type: "word",
            state_mode: "stateful",
            description: expect.any(String),
            is_active: false,
            capability_invoke_contract: expect.objectContaining({
              action_type: "view.capability.invoke",
              payload_example: expect.objectContaining({
                view_id: "word.main",
                capability_id: "<capability_id>",
              }),
            }),
            capabilities: expect.arrayContaining([
              expect.objectContaining({
                capability_id: "append_etymology",
                mode: "write",
              }),
            ]),
          }),
          expect.objectContaining({
            view_id: "tictactoe.main",
            title: "TicTacToe Arena",
            resource_type: "tictactoe.game",
            state_mode: "stateful",
            description: expect.any(String),
            is_active: true,
            current_state_summary: {
              status: "playing",
              current_player: "X",
              move_count: 2,
            },
          }),
        ]),
        functions: [
          {
            name: "assistant.view.describe",
            description: "Inspect one specific view definition or the current active view state.",
            input_schema: {
              type: "object",
              properties: {
                view_id: { type: "string" },
              },
            },
          },
        ],
      },
    });
  });
});
