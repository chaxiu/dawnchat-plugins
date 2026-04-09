import "fake-indexeddb/auto";

import { createViewPersistenceRuntime, DexieViewPersistenceAdapter } from "../persistence";
import { createManifestSnapshot, getViewRegistration, useViewState } from "../view";
import {
  BOARD_DEFAULT_RESOURCE,
  cloneBoardResource,
} from "../../views/pages/board/boardMain.view";
import {
  TICTACTOE_DEFAULT_RESOURCE,
  cloneTictactoeResource,
} from "../../views/pages/tictactoe/tictactoeMain.view";
import { cloneWordResource, WORD_DEFAULT_RESOURCE } from "../../views/pages/word/wordMain.view";

function createAdapter() {
  return new DexieViewPersistenceAdapter(`assistant-persistence-test-${crypto.randomUUID()}`);
}

describe("view persistence runtime", () => {
  afterEach(() => {
    useViewState().clearViewState();
  });

  it("autosaves the active stateful view through Dexie", async () => {
    const adapter = createAdapter();
    const viewState = useViewState();
    const navigateToView = vi.fn();
    const runtime = createViewPersistenceRuntime({
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView,
      adapter,
    });
    const registration = getViewRegistration("word.main");
    expect(registration).not.toBeNull();

    runtime.start();
    const resource = cloneWordResource(WORD_DEFAULT_RESOURCE);
    const manifest = createManifestSnapshot(registration!, resource, "word.header");
    viewState.setActiveViewState({
      viewId: "word.main",
      activeAnchor: "word.header",
      resource,
      manifest,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 220);
    });

    const latest = await adapter.getLatest();
    expect(latest).toEqual(expect.objectContaining({
      view_id: "word.main",
      resource_key: "word:assistant",
      version: 1,
    }));
    expect(latest?.payload).toEqual(expect.objectContaining({
      active_anchor: "word.header",
      resource: expect.objectContaining({
        resource_type: "word",
        resource_id: "word:assistant",
      }),
    }));

    runtime.dispose();
    await adapter.clear();
  });

  it("hydrates the latest persisted stateful view and navigates to it", async () => {
    const adapter = createAdapter();
    const viewState = useViewState();
    const navigateToView = vi.fn();
    await adapter.put({
      storage_key: "word.main::word:assistant",
      view_id: "word.main",
      resource_key: "word:assistant",
      version: 1,
      updated_at_ms: Date.now(),
      payload: {
        active_anchor: "word.etymology",
        resource: {
          resource_type: "word",
          resource_id: "word:assistant",
          title: "词汇讲解",
          data: {
            word: "Assistant",
            meaning: "你的自进化智能助理",
            etymology: ["支持富媒体呈现", "hydrated"],
          },
        },
      },
    });

    const runtime = createViewPersistenceRuntime({
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView,
      adapter,
    });

    await runtime.hydrate();

    expect(viewState.getViewStateSnapshot()).toEqual(expect.objectContaining({
      active_view_id: "word.main",
      active_anchor: "word.etymology",
      active_manifest: expect.objectContaining({
        state_summary: expect.objectContaining({
          etymology_count: 2,
          active_anchor: "word.etymology",
        }),
      }),
      current_resource: expect.objectContaining({
        resource_type: "word",
        resource_id: "word:assistant",
        data: expect.objectContaining({
          etymology: ["支持富媒体呈现", "hydrated"],
        }),
      }),
    }));
    expect(navigateToView).toHaveBeenCalledWith("word.main");

    runtime.dispose();
    await adapter.clear();
  });

  it("falls back to normalized defaults when persisted payload is malformed", async () => {
    const adapter = createAdapter();
    const viewState = useViewState();
    const runtime = createViewPersistenceRuntime({
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView: vi.fn(),
      adapter,
    });
    await adapter.put({
      storage_key: "word.main::word:broken",
      view_id: "word.main",
      resource_key: "word:broken",
      version: 1,
      updated_at_ms: Date.now(),
      payload: {
        active_anchor: "word.header",
        resource: {
          resource_type: "word",
          data: {
            word: "",
          },
        },
      },
    });

    await runtime.hydrate();

    expect(viewState.getViewStateSnapshot()).toEqual(expect.objectContaining({
      active_view_id: "word.main",
      current_resource: expect.objectContaining({
        resource_id: "word:assistant",
        title: "词汇讲解",
        data: expect.objectContaining({
          word: "Assistant",
        }),
      }),
    }));

    runtime.dispose();
    await adapter.clear();
  });

  it("restores the latest persisted tictactoe board snapshot", async () => {
    const adapter = createAdapter();
    const viewState = useViewState();
    const navigateToView = vi.fn();
    await adapter.put({
      storage_key: "tictactoe.main::tictactoe:neon-grid",
      view_id: "tictactoe.main",
      resource_key: "tictactoe:neon-grid",
      version: 1,
      updated_at_ms: Date.now(),
      payload: {
        active_anchor: "tictactoe.board",
        resource: {
          resource_type: "tictactoe.game",
          resource_id: "tictactoe:neon-grid",
          title: "Neon Grid",
          data: {
            board_size: 5,
            win_length: 4,
            cells: [
              "X", "O", "", "", "",
              "", "X", "", "", "",
              "", "", "X", "", "",
              "", "", "", "", "",
              "", "", "", "", "",
            ],
            current_player: "O",
            move_count: 3,
            winner: "",
            status: "playing",
            last_move: {
              index: 12,
              row: 2,
              col: 2,
              player: "X",
            },
            winning_cells: [],
          },
        },
      },
    });

    const runtime = createViewPersistenceRuntime({
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView,
      adapter,
    });

    await runtime.hydrate();

    expect(viewState.getViewStateSnapshot()).toEqual(expect.objectContaining({
      active_view_id: "tictactoe.main",
      active_anchor: "tictactoe.board",
      active_manifest: expect.objectContaining({
        state_summary: expect.objectContaining({
          status: "playing",
          current_player: "O",
          move_count: 3,
          last_move_index: 12,
        }),
      }),
      current_resource: expect.objectContaining({
        resource_type: "tictactoe.game",
        data: expect.objectContaining({
          current_player: "O",
          move_count: 3,
          cells: expect.arrayContaining(["X", "O"]),
        }),
      }),
    }));
    expect(navigateToView).toHaveBeenCalledWith("tictactoe.main");

    runtime.dispose();
    await adapter.clear();
  });

  it("autosaves updated tictactoe board state through Dexie", async () => {
    const adapter = createAdapter();
    const viewState = useViewState();
    const runtime = createViewPersistenceRuntime({
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView: vi.fn(),
      adapter,
    });
    const registration = getViewRegistration("tictactoe.main");
    expect(registration).not.toBeNull();

    runtime.start();
    const resource = cloneTictactoeResource(TICTACTOE_DEFAULT_RESOURCE);
    resource.data = {
      ...resource.data,
      cells: [
        "X", "", "", "", "",
        "", "", "", "", "",
        "", "", "", "", "",
        "", "", "", "", "",
        "", "", "", "", "",
      ],
      current_player: "O",
      move_count: 1,
      last_move: {
        index: 0,
        row: 0,
        col: 0,
        player: "X",
      },
    };
    const manifest = createManifestSnapshot(registration!, resource, "tictactoe.board");
    viewState.setActiveViewState({
      viewId: "tictactoe.main",
      activeAnchor: "tictactoe.board",
      resource,
      manifest,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 180);
    });

    const latest = await adapter.getLatest();
    expect(latest).toEqual(expect.objectContaining({
      view_id: "tictactoe.main",
      resource_key: "tictactoe:neon-grid",
      version: 1,
    }));
    expect(latest?.payload).toEqual(expect.objectContaining({
      active_anchor: "tictactoe.board",
      resource: expect.objectContaining({
        resource_type: "tictactoe.game",
        data: expect.objectContaining({
          current_player: "O",
          move_count: 1,
        }),
      }),
    }));

    runtime.dispose();
    await adapter.clear();
  });

  it("hydrates the latest persisted board scene and restores pinned node state", async () => {
    const adapter = createAdapter();
    const viewState = useViewState();
    const navigateToView = vi.fn();
    await adapter.put({
      storage_key: "board.main::board:holographic-clue-wall",
      view_id: "board.main",
      resource_key: "board:holographic-clue-wall",
      version: 1,
      updated_at_ms: Date.now(),
      payload: {
        active_anchor: "board.inspector",
        resource: {
          resource_type: "board.workspace",
          resource_id: "board:holographic-clue-wall",
          title: "Holographic Clue Wall",
          data: {
            board_id: "board:holographic-clue-wall",
            description: "Hydrated board payload",
            nodes: [
              {
                id: "node-case-brief",
                title: "Case Brief",
                description: "Hydrated clue",
                media_type: "text",
                semantic_type: "note",
                tags: ["hydrated"],
                position: { x: 144, y: 88 },
                size: { width: 240, height: 148 },
                pinned: true,
                data: {},
              },
            ],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            selection: {
              selected_node_ids: ["node-case-brief"],
              selected_edge_ids: [],
              focused_node_id: "node-case-brief",
            },
            layout_mode: "mixed",
          },
        },
      },
    });

    const runtime = createViewPersistenceRuntime({
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView,
      adapter,
    });

    await runtime.hydrate();

    expect(viewState.getViewStateSnapshot()).toEqual(expect.objectContaining({
      active_view_id: "board.main",
      active_anchor: "board.inspector",
      active_manifest: expect.objectContaining({
        state_summary: expect.objectContaining({
          node_count: 1,
          pinned_node_count: 1,
          focused_node_id: "node-case-brief",
        }),
      }),
      current_resource: expect.objectContaining({
        resource_type: "board.workspace",
        data: expect.objectContaining({
          layout_mode: "mixed",
          description: "Hydrated board payload",
        }),
      }),
    }));
    expect(navigateToView).toHaveBeenCalledWith("board.main");

    runtime.dispose();
    await adapter.clear();
  });

  it("autosaves updated board scene through Dexie", async () => {
    const adapter = createAdapter();
    const viewState = useViewState();
    const runtime = createViewPersistenceRuntime({
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView: vi.fn(),
      adapter,
    });
    const registration = getViewRegistration("board.main");
    expect(registration).not.toBeNull();

    runtime.start();
    const resource = cloneBoardResource(BOARD_DEFAULT_RESOURCE);
    resource.data = {
      ...(resource.data as Record<string, unknown>),
      selection: {
        selected_node_ids: ["node-web-report"],
        selected_edge_ids: [],
        focused_node_id: "node-web-report",
      },
      layout_mode: "mixed",
    };
    const manifest = createManifestSnapshot(registration!, resource, "board.inspector");
    viewState.setActiveViewState({
      viewId: "board.main",
      activeAnchor: "board.inspector",
      resource,
      manifest,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 240);
    });

    const latest = await adapter.getLatest();
    expect(latest).toEqual(expect.objectContaining({
      view_id: "board.main",
      resource_key: "board:holographic-clue-wall",
      version: 1,
    }));
    expect(latest?.payload).toEqual(expect.objectContaining({
      active_anchor: "board.inspector",
      resource: expect.objectContaining({
        resource_type: "board.workspace",
        data: expect.objectContaining({
          layout_mode: "mixed",
        }),
      }),
    }));

    runtime.dispose();
    await adapter.clear();
  });
});
