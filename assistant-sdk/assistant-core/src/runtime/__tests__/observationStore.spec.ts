import { createRuntimeObservationStore } from "../observation";
import { BOARD_DEFAULT_RESOURCE } from "../../views/pages/board/boardMain.view";

describe("runtime observation store", () => {
  it("returns minimal runtime observation snapshots", () => {
    const boardResource = JSON.parse(JSON.stringify(BOARD_DEFAULT_RESOURCE)) as typeof BOARD_DEFAULT_RESOURCE;
    const store = createRuntimeObservationStore({
      getViewStateSnapshot: () => ({
        active_view_id: "board.main",
        active_anchor: "board.canvas",
        current_resource: boardResource,
        active_manifest: {
          view_id: "board.main",
          resource_type: "board.workspace",
          title: "Holographic Clue Wall",
          route_name: "view-board-main",
          route_path: "/views/board/main",
          state_mode: "lightweight",
          anchors: [
            { id: "board.header", title: "Header" },
            { id: "board.canvas", title: "Canvas" },
          ],
          capabilities: [],
          state_summary: {
            node_count: 3,
            edge_count: 2,
            active_anchor: "board.canvas",
          },
        },
        view_state_version: 2,
      }),
    });

    store.setTaskProgress({
      status: "running",
      current_task_id: "task-1",
      completed_steps: 1,
      total_steps: 3,
      summary: "正在处理词义讲解",
    });
    store.setContinuation({
      last_completed_step_index: 1,
      last_completed_step_id: "step-2",
      pending_wait: {
        action_type: "flow.wait",
        session_id: "sess-1",
        step_id: "step-3",
        step_index: 2,
        total_steps: 4,
        event_types: ["assistant.view.form.submitted"],
        match: {
          form_id: "paper-form",
        },
        timeout_ms: 30000,
        waiting_since_ms: 200,
      },
    });

    expect(store.getTaskProgressSnapshot()).toEqual({
      status: "running",
      current_task_id: "task-1",
      completed_steps: 1,
      total_steps: 3,
      summary: "正在处理词义讲解",
    });
    expect(store.getActiveResourceContextSnapshot()).toEqual({
      resource_type: "board.workspace",
      resource_id: BOARD_DEFAULT_RESOURCE.resource_id,
      title: String(BOARD_DEFAULT_RESOURCE.title),
      view_id: "board.main",
      state_summary: {
        node_count: 3,
        edge_count: 2,
        active_anchor: "board.canvas",
      },
    });
    expect(store.getContinuationSnapshot()).toEqual({
      last_completed_step_index: 1,
      last_completed_step_id: "step-2",
      pending_wait: {
        action_type: "flow.wait",
        session_id: "sess-1",
        step_id: "step-3",
        step_index: 2,
        total_steps: 4,
        event_types: ["assistant.view.form.submitted"],
        match: {
          form_id: "paper-form",
        },
        timeout_ms: 30000,
        waiting_since_ms: 200,
      },
    });
  });

  it("returns cloned observation data and keeps internal state immutable", () => {
    const boardResource = JSON.parse(JSON.stringify(BOARD_DEFAULT_RESOURCE)) as typeof BOARD_DEFAULT_RESOURCE;
    const store = createRuntimeObservationStore({
      getViewStateSnapshot: () => ({
        active_view_id: "board.main",
        active_anchor: "board.canvas",
        current_resource: boardResource,
        active_manifest: {
          view_id: "board.main",
          resource_type: "board.workspace",
          title: "Holographic Clue Wall",
          route_name: "view-board-main",
          route_path: "/views/board/main",
          state_mode: "lightweight",
          anchors: [],
          capabilities: [],
          state_summary: {
            node_count: 3,
          },
        },
        view_state_version: 1,
      }),
    });

    const activeResourceContext = store.getActiveResourceContextSnapshot();
    const continuationSnapshot = store.getContinuationSnapshot();
    if (activeResourceContext) {
      (activeResourceContext.state_summary as Record<string, unknown>).node_count = 99;
    }
    continuationSnapshot.pending_wait = {
      action_type: "flow.wait",
      session_id: "sess-2",
      event_types: ["assistant.view.form.submitted"],
      waiting_since_ms: 1,
    };

    const nextActiveResourceContext = store.getActiveResourceContextSnapshot();
    expect(nextActiveResourceContext).toEqual(expect.objectContaining({
      state_summary: {
        node_count: 3,
      },
    }));
    expect(store.getContinuationSnapshot().pending_wait).toBeNull();
  });

  it("keeps active_resource_context bound to current active resource only", () => {
    let currentResourceId = "board:assistant";
    const store = createRuntimeObservationStore({
      getViewStateSnapshot: () => ({
        active_view_id: "board.main",
        active_anchor: "board.canvas",
        current_resource: {
          ...(JSON.parse(JSON.stringify(BOARD_DEFAULT_RESOURCE)) as typeof BOARD_DEFAULT_RESOURCE),
          resource_id: currentResourceId,
          title: currentResourceId,
        },
        active_manifest: {
          view_id: "board.main",
          resource_type: "board.workspace",
          title: "Holographic Clue Wall",
          route_name: "view-board-main",
          route_path: "/views/board/main",
          state_mode: "lightweight",
          anchors: [],
          capabilities: [],
          state_summary: {
            board_id: currentResourceId,
          },
        },
        view_state_version: 1,
      }),
    });

    const snapshotA = store.getActiveResourceContextSnapshot();
    expect(snapshotA).toEqual(expect.objectContaining({
      resource_id: "board:assistant",
      state_summary: {
        board_id: "board:assistant",
      },
    }));

    currentResourceId = "board:agent";
    const snapshotB = store.getActiveResourceContextSnapshot();
    expect(snapshotB).toEqual(expect.objectContaining({
      resource_id: "board:agent",
      state_summary: {
        board_id: "board:agent",
      },
    }));
  });
});
