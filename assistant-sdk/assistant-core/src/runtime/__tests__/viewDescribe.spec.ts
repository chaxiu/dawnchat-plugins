import { createViewDescribeCapabilityRegistration } from "../view";
import { BOARD_DEFAULT_RESOURCE } from "../../views/pages/board/boardMain.view";

describe("assistant.view.describe", () => {
  it("returns only the current active view state", async () => {
    const registration = createViewDescribeCapabilityRegistration({
      setActiveViewState: vi.fn(() => 1),
      getViewStateSnapshot: vi.fn(() => ({
        active_view_id: "board.main",
        active_anchor: "board.canvas",
        current_state_binding: BOARD_DEFAULT_RESOURCE,
        active_manifest: {
          view_id: "board.main",
          binding_type: "board.workspace",
          title: "Holographic Clue Wall",
          route_name: "view-board-main",
          route_path: "/views/board/main",
          state_mode: "stateful" as const,
          anchors: [],
          capabilities: [],
          interaction_hints: {
            interaction_intent: "Best for arranging notes into a graph.",
          },
          state_summary: {
            node_count: 3,
            edge_count: 2,
          },
        },
        view_state_version: 4,
      })),
      getTaskProgressSnapshot: vi.fn(() => ({
        status: "running" as const,
        current_task_id: "task-1",
      })),
      getActiveStateBindingContextSnapshot: vi.fn(() => ({
        binding_type: "board.workspace",
        binding_label: BOARD_DEFAULT_RESOURCE.binding_label,
        title: String(BOARD_DEFAULT_RESOURCE.title),
        view_id: "board.main",
        state_summary: {
          node_count: 3,
          edge_count: 2,
        },
      })),
      getContinuationSnapshot: vi.fn(() => ({
        pending_wait: null,
      })),
      navigateToView: vi.fn(),
    });

    const result = await registration.handler({
      view_id: "board.main",
    }, {});

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        active_view_id: "board.main",
        active_anchor: "board.canvas",
        view_state_version: 4,
        current_state_binding_summary: expect.objectContaining({
          node_count: 3,
          edge_count: 2,
          active_anchor: "board.canvas",
        }),
        task_progress: expect.objectContaining({
          status: "running",
          current_task_id: "task-1",
        }),
        active_state_binding: expect.objectContaining({
          binding_type: "board.workspace",
          binding_label: BOARD_DEFAULT_RESOURCE.binding_label,
          view_id: "board.main",
        }),
        continuation: expect.objectContaining({
          pending_wait: null,
        }),
      }),
    });
    expect(result.data).not.toHaveProperty("runtime_contracts");
    expect(result.data).not.toHaveProperty("view_definition");
    expect(result.data).not.toHaveProperty("view_playbook");
  });

  it("still returns the active scene state when a non-active view_id is passed", async () => {
    const registration = createViewDescribeCapabilityRegistration({
      setActiveViewState: vi.fn(() => 1),
      getViewStateSnapshot: vi.fn(() => ({
        active_view_id: "tictactoe.main",
        active_anchor: "tictactoe.board",
        current_state_binding: null,
        active_manifest: {
          view_id: "tictactoe.main",
          binding_type: "tictactoe.game",
          title: "TicTacToe Arena",
          route_name: "view-tictactoe-main",
          route_path: "/views/tictactoe/main",
          state_mode: "stateful" as const,
          anchors: [],
          capabilities: [],
          interaction_hints: {
            interaction_intent: "Best for validating the default wait-aware orchestration path.",
          },
          state_summary: {
            status: "playing",
            current_player: "X",
          },
        },
        view_state_version: 7,
      })),
      getTaskProgressSnapshot: vi.fn(() => ({
        status: "idle" as const,
      })),
      getActiveStateBindingContextSnapshot: vi.fn(() => null),
      getContinuationSnapshot: vi.fn(() => ({
        pending_wait: null,
      })),
      navigateToView: vi.fn(),
    });

    const result = await registration.handler({
      view_id: "music.main",
    }, {});

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        active_view_id: "tictactoe.main",
        active_anchor: "tictactoe.board",
        current_state_binding_summary: {
          status: "playing",
          current_player: "X",
        },
      }),
    });
    expect(result.data).not.toHaveProperty("view_definition");
  });

  it("supports board-specific lightweight summary limits", async () => {
    const registration = createViewDescribeCapabilityRegistration({
      setActiveViewState: vi.fn(() => 1),
      getViewStateSnapshot: vi.fn(() => ({
        active_view_id: "board.main",
        active_anchor: "board.canvas",
        current_state_binding: {
          binding_type: "board.workspace",
          binding_label: "board:test",
          title: "Test Board",
          data: {
            board_id: "board:test",
            description: "board",
            nodes: [
              {
                id: "node-1",
                title: "Node 1",
                description: "",
                media_type: "text",
                semantic_type: "note",
                tags: [],
                position: { x: 0, y: 0 },
                size: { width: 240, height: 148 },
                pinned: false,
                data: {},
              },
              {
                id: "node-2",
                title: "Node 2",
                description: "",
                media_type: "text",
                semantic_type: "note",
                tags: [],
                position: { x: 10, y: 10 },
                size: { width: 240, height: 148 },
                pinned: false,
                data: {},
              },
            ],
            edges: [
              {
                id: "edge-1",
                source: "node-1",
                target: "node-2",
                ports_mode: "auto",
                directed: true,
                label: "relates_to",
              },
            ],
            viewport: { x: 0, y: 0, zoom: 1 },
            selection: {
              selected_node_ids: ["node-1"],
              selected_edge_ids: [],
              focused_node_id: "node-1",
            },
            layout_mode: "auto",
            style_settings: {
              layout_algorithm: "stress",
              layout_direction: "LR",
              edge_style: "bezier",
              edge_curvature: 0.5,
              handles_mode: "eight-points",
              auto_layout_on_add: true,
              avoid_overlap_strength: "medium",
            },
          },
        },
        active_manifest: {
          view_id: "board.main",
          binding_type: "board.workspace",
          title: "Holographic Clue Wall",
          route_name: "view-board-main",
          route_path: "/views/board/main",
          state_mode: "stateful" as const,
          anchors: [],
          capabilities: [],
          interaction_hints: {
            interaction_intent: "Best for arranging notes into a graph.",
          },
          state_summary: {
            node_count: 2,
          },
        },
        view_state_version: 9,
      })),
      getTaskProgressSnapshot: vi.fn(() => ({
        status: "idle" as const,
      })),
      getActiveStateBindingContextSnapshot: vi.fn(() => null),
      getContinuationSnapshot: vi.fn(() => ({
        pending_wait: null,
      })),
      navigateToView: vi.fn(),
    });

    const boardResult = await registration.handler({ max_nodes: 1, max_edges: 1 }, {});

    expect(boardResult).toEqual({
      ok: true,
      data: expect.objectContaining({
        active_view_id: "board.main",
        current_state_binding_summary: expect.objectContaining({
          node_count: 2,
          edge_count: 1,
          nodes_brief: [
            expect.objectContaining({
              id: "node-1",
              title: "Node 1",
            }),
          ],
          edges_brief: [
            expect.objectContaining({
              id: "edge-1",
              source: "node-1",
              target: "node-2",
            }),
          ],
          summary_limits: expect.objectContaining({
            applied_max_nodes: 1,
            applied_max_edges: 1,
            has_more_nodes: true,
            has_more_edges: false,
          }),
        }),
      }),
    });
  });
});
