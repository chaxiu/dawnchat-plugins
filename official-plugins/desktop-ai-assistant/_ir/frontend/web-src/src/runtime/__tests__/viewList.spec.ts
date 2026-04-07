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
            view_id: "plane.main",
            title: "Coordinate Lab",
            resource_type: "plane.scene",
            state_mode: "stateful",
            description: expect.any(String),
            is_active: false,
            capabilities: expect.arrayContaining([
              expect.objectContaining({
                capability_id: "plane.set_viewport",
                mode: "write",
                title: "Set Viewport",
              }),
            ]),
          }),
          expect.objectContaining({
            view_id: "image.explainer",
            title: "AI Visual Explainer",
            resource_type: "image.deck",
            state_mode: "stateful",
            description: expect.any(String),
            is_active: false,
            capabilities: expect.arrayContaining([
              expect.objectContaining({
                capability_id: "image.set_pages",
                mode: "write",
                title: "Set Pages",
              }),
            ]),
          }),
          expect.objectContaining({
            view_id: "word.main",
            title: "Word Workspace",
            resource_type: "word",
            state_mode: "stateful",
            description: expect.any(String),
            is_active: false,
            capabilities: expect.arrayContaining([
              expect.objectContaining({
                capability_id: "append_etymology",
                mode: "write",
                title: "Append Etymology",
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
            name: "view.open",
            description: "Open one registered assistant view and optionally bind its resource payload.",
            input_schema: {
              type: "object",
              properties: {
                view_id: { type: "string" },
                resource: { type: "object" },
                initial_anchor: { type: "string" },
              },
              required: ["view_id"],
            },
          },
          {
            name: "assistant.view.describe",
            description: "Inspect the current active view state with a lightweight assistant-facing summary.",
            input_schema: {
              type: "object",
              properties: {
                view_id: { type: "string" },
                max_nodes: { type: "number", minimum: 1 },
                max_edges: { type: "number", minimum: 1 },
              },
            },
          },
          {
            name: "assistant.view.contract",
            description: "Inspect one specific view definition, capability schemas, events, and examples.",
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
