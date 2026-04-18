import {
  createDexieWorkspaceStore,
  createWorkspaceCapabilityRegistrations,
  createWorkspacePersistenceRuntime,
} from "../workspace";
import { createManifestSnapshot, getViewRegistration, useViewState } from "../view";
import {
  BOARD_DEFAULT_RESOURCE,
  cloneBoardStateBinding,
} from "../../views/pages/board/boardMain.view";

function createStore() {
  return createDexieWorkspaceStore(`assistant-workspace-contract-${crypto.randomUUID()}`);
}

function getRegistrationMap() {
  const viewState = useViewState();
  const store = createStore();
  const runtime = createWorkspacePersistenceRuntime({
    store,
    getViewStateSnapshot: viewState.getViewStateSnapshot,
    setActiveViewState: viewState.setActiveViewState,
    navigateToView: vi.fn(),
  });
  const registrations = createWorkspaceCapabilityRegistrations(runtime);
  const map = new Map(registrations.map((item) => [item.definition.name, item]));
  return { store, runtime, viewState, map };
}

describe("assistant.workspace.*", () => {
  afterEach(() => {
    useViewState().clearViewState();
  });

  it("registers the Phase 2A workspace capability set", () => {
    const { map } = getRegistrationMap();
    expect(Array.from(map.keys())).toEqual([
      "assistant.workspace.list",
      "assistant.workspace.describe",
      "assistant.workspace.get_current",
      "assistant.workspace.list_history",
      "assistant.workspace.create",
      "assistant.workspace.open",
      "assistant.workspace.rename",
      "assistant.workspace.checkpoint",
      "assistant.workspace.checkout_snapshot",
    ]);
  });

  it("supports open/get_current/list_history/checkout_snapshot flows", async () => {
    const { store, viewState, map } = getRegistrationMap();
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
      head_payload: headPayload,
    });
    await store.appendSnapshot(wid, {
      reason: "manual_checkpoint",
      payload: {
        ...headPayload,
        state_binding: {
          ...(headPayload.state_binding as Record<string, unknown>),
          title: "checkpoint-title",
        },
      },
    });

    const openResult = await map.get("assistant.workspace.open")!.handler({
      surface_id: "board.main",
      workspace_id: wid,
    }, {});
    expect(openResult).toEqual({
      ok: true,
      data: {
        surface_id: "board.main",
        workspace_id: wid,
        status: "opened",
      },
    });

    const manifest = createManifestSnapshot(registration!, resource, "board.canvas");
    viewState.setActiveViewState({
      viewId: "board.main",
      activeAnchor: "board.canvas",
      state_binding: resource,
      manifest,
    });

    const currentResult = await map.get("assistant.workspace.get_current")!.handler({}, {});
    expect(currentResult).toEqual({
      ok: true,
      data: {
        workspace: {
          workspace_id: wid,
          surface_id: "board.main",
          title: undefined,
          view_id: "board.main",
        },
      },
    });

    const historyResult = await map.get("assistant.workspace.list_history")!.handler({
      workspace_id: wid,
    }, {});
    expect(historyResult).toEqual({
      ok: true,
      data: {
        snapshots: [
          expect.objectContaining({
            workspace_id: wid,
            seq: 1,
            reason: "manual_checkpoint",
          }),
        ],
      },
    });

    const checkoutResult = await map.get("assistant.workspace.checkout_snapshot")!.handler({
      workspace_id: wid,
      snapshot_seq: 1,
    }, {});
    expect(checkoutResult).toEqual({
      ok: true,
      data: {
        workspace_id: wid,
        snapshot_seq: 1,
        status: "opened",
      },
    });

    await store.clearAll();
  });
});
