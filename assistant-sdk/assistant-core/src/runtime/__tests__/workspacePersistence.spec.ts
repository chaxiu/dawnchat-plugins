import {
  createDexieWorkspaceStore,
  createWorkspacePersistenceRuntime,
} from "../workspace";
import { createManifestSnapshot, getViewRegistration, useViewState } from "../view";
import {
  BOARD_DEFAULT_RESOURCE,
  cloneBoardStateBinding,
} from "../../views/pages/board/boardMain.view";
import {
  TICTACTOE_DEFAULT_RESOURCE,
  cloneTictactoeStateBinding,
} from "../../views/pages/tictactoe/tictactoeMain.view";

function createStore(historyLimit?: number) {
  return createDexieWorkspaceStore(`assistant-workspace-test-${crypto.randomUUID()}`, {
    historyLimit,
  });
}

describe("workspace persistence runtime", () => {
  afterEach(() => {
    useViewState().clearViewState();
  });

  it("debounces head writes into the workspace store", async () => {
    const store = createStore();
    const viewState = useViewState();
    const navigateToView = vi.fn();
    const runtime = createWorkspacePersistenceRuntime({
      store,
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView,
    });
    const registration = getViewRegistration("board.main");
    expect(registration).not.toBeNull();

    runtime.start();
    const resource = cloneBoardStateBinding(BOARD_DEFAULT_RESOURCE);
    const manifest = createManifestSnapshot(registration!, resource, "board.canvas");
    viewState.setActiveViewState({
      viewId: "board.main",
      activeAnchor: "board.canvas",
      state_binding: resource,
      manifest,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 220);
    });

    const wid = await store.getActiveWorkspaceId("board.main");
    expect(wid).toBeTruthy();
    const head = await store.getWorkspaceHead(wid!);
    expect(head?.head_payload).toEqual(
      expect.objectContaining({
        active_anchor: "board.canvas",
        state_binding: expect.objectContaining({
          binding_type: "board.workspace",
        }),
      })
    );

    runtime.dispose();
    await store.clearAll();
  });

  it("hydrates from workspace head and navigates", async () => {
    const store = createStore();
    const viewState = useViewState();
    const navigateToView = vi.fn();
    const registration = getViewRegistration("tictactoe.main");
    expect(registration).not.toBeNull();
    const wid = crypto.randomUUID();
    const resource = cloneTictactoeStateBinding(TICTACTOE_DEFAULT_RESOURCE);
    const payload = registration!.persistence!.serialize({
      state_binding: resource,
      activeAnchor: "tictactoe.board",
    });
    await store.createWorkspaceWithHead({
      workspace_id: wid,
      surface_id: "tictactoe.main",
      persistence_version: registration!.persistence!.version,
      view_id: "tictactoe.main",
      head_payload: payload as Record<string, unknown>,
    });
    await store.setActiveWorkspace("tictactoe.main", wid);
    await store.setLastActiveSurfaceId("tictactoe.main");

    const runtime = createWorkspacePersistenceRuntime({
      store,
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView,
    });
    await runtime.hydrate();

    expect(viewState.getViewStateSnapshot().active_view_id).toBe("tictactoe.main");
    expect(viewState.getViewStateSnapshot().active_anchor).toBe("tictactoe.board");
    expect(navigateToView).toHaveBeenCalledWith("tictactoe.main");

    runtime.dispose();
    await store.clearAll();
  });

  it("appends snapshots and trims history beyond the limit", async () => {
    const smallLimit = 12;
    const store = createStore(smallLimit);
    const registration = getViewRegistration("board.main");
    expect(registration).not.toBeNull();
    const wid = crypto.randomUUID();
    const resource = cloneBoardStateBinding(BOARD_DEFAULT_RESOURCE);
    const basePayload = registration!.persistence!.serialize({
      state_binding: resource,
      activeAnchor: "board.canvas",
    }) as Record<string, unknown>;

    await store.createWorkspaceWithHead({
      workspace_id: wid,
      surface_id: "board.main",
      persistence_version: registration!.persistence!.version,
      view_id: "board.main",
      head_payload: { ...basePayload },
    });

    const extra = smallLimit + 8;
    for (let i = 0; i < extra; i += 1) {
      await store.appendSnapshot(wid, {
        reason: "manual_checkpoint",
        payload: { ...basePayload, tag: i },
      });
    }

    const count = await store.countHistorySnapshots(wid);
    expect(count).toBe(smallLimit);

    await store.clearAll();
  });

  it("invokes session_completed append when snapshotOnSessionEnd is enabled", async () => {
    const store = createStore();
    const viewState = useViewState();
    const registration = getViewRegistration("board.main");
    expect(registration).not.toBeNull();
    const wid = crypto.randomUUID();
    const resource = cloneBoardStateBinding(BOARD_DEFAULT_RESOURCE);
    const headPayload = registration!.persistence!.serialize({
      state_binding: resource,
      activeAnchor: "board.canvas",
    }) as Record<string, unknown>;
    await store.createWorkspaceWithHead({
      workspace_id: wid,
      surface_id: "board.main",
      persistence_version: registration!.persistence!.version,
      view_id: "board.main",
      head_payload: { ...headPayload },
    });
    await store.setActiveWorkspace("board.main", wid);

    const manifest = createManifestSnapshot(registration!, resource, "board.canvas");
    viewState.setActiveViewState({
      viewId: "board.main",
      activeAnchor: "board.canvas",
      state_binding: resource,
      manifest,
    });

    const runtime = createWorkspacePersistenceRuntime({
      store,
      getViewStateSnapshot: viewState.getViewStateSnapshot,
      setActiveViewState: viewState.setActiveViewState,
      navigateToView: vi.fn(),
      snapshotOnSessionEnd: true,
    });

    await runtime.handleSessionStepApplied({
      sessionId: "s1",
      stepIndex: 2,
      totalSteps: 3,
      actionType: "view.open",
    });

    expect(await store.countHistorySnapshots(wid)).toBe(1);

    await store.clearAll();
  });
});
