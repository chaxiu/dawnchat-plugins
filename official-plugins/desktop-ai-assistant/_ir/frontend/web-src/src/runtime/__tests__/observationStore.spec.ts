import { createRuntimeObservationStore } from "../observation";

describe("runtime observation store", () => {
  it("returns minimal runtime observation snapshots", () => {
    const store = createRuntimeObservationStore({
      getViewStateSnapshot: () => ({
        active_view_id: "word.main",
        active_anchor: "word.header",
        current_state_binding: {
          binding_type: "word",
          binding_label: "word:assistant",
          title: "词汇讲解",
          data: {
            word: "Assistant",
            meaning: "你的自进化智能助理",
            etymology: ["支持富媒体呈现"],
          },
        },
        active_manifest: {
          view_id: "word.main",
          binding_type: "word",
          title: "Word Workspace",
          route_name: "view-word-main",
          route_path: "/views/word/main",
          state_mode: "lightweight",
          anchors: [
            { id: "word.header", title: "Header" },
            { id: "word.meaning", title: "Meaning" },
          ],
          capabilities: [],
          state_summary: {
            word: "Assistant",
            active_anchor: "word.header",
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
    expect(store.getActiveStateBindingContextSnapshot()).toEqual({
      binding_type: "word",
      binding_label: "word:assistant",
      title: "词汇讲解",
      view_id: "word.main",
      state_summary: {
        word: "Assistant",
        active_anchor: "word.header",
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
    const store = createRuntimeObservationStore({
      getViewStateSnapshot: () => ({
        active_view_id: "word.main",
        active_anchor: "word.header",
        current_state_binding: {
          binding_type: "word",
          binding_label: "word:assistant",
          title: "词汇讲解",
          data: {
            word: "Assistant",
          },
        },
        active_manifest: {
          view_id: "word.main",
          binding_type: "word",
          title: "Word Workspace",
          route_name: "view-word-main",
          route_path: "/views/word/main",
          state_mode: "lightweight",
          anchors: [],
          capabilities: [],
          state_summary: {
            word: "Assistant",
          },
        },
        view_state_version: 1,
      }),
    });

    const activeResourceContext = store.getActiveStateBindingContextSnapshot();
    const continuationSnapshot = store.getContinuationSnapshot();
    if (activeResourceContext) {
      (activeResourceContext.state_summary as Record<string, unknown>).word = "mutated";
    }
    continuationSnapshot.pending_wait = {
      action_type: "flow.wait",
      session_id: "sess-2",
      event_types: ["assistant.view.form.submitted"],
      waiting_since_ms: 1,
    };

    const nextActiveResourceContext = store.getActiveStateBindingContextSnapshot();
    expect(nextActiveResourceContext).toEqual(expect.objectContaining({
      state_summary: {
        word: "Assistant",
      },
    }));
    expect(store.getContinuationSnapshot().pending_wait).toBeNull();
  });

  it("keeps active_state_binding bound to current active resource only", () => {
    let currentResourceId = "word:assistant";
    const store = createRuntimeObservationStore({
      getViewStateSnapshot: () => ({
        active_view_id: "word.main",
        active_anchor: "word.header",
        current_state_binding: {
          binding_type: "word",
          binding_label: currentResourceId,
          title: currentResourceId,
          data: {
            word: currentResourceId,
          },
        },
        active_manifest: {
          view_id: "word.main",
          binding_type: "word",
          title: "Word Workspace",
          route_name: "view-word-main",
          route_path: "/views/word/main",
          state_mode: "lightweight",
          anchors: [],
          capabilities: [],
          state_summary: {
            word: currentResourceId,
          },
        },
        view_state_version: 1,
      }),
    });

    const snapshotA = store.getActiveStateBindingContextSnapshot();
    expect(snapshotA).toEqual(expect.objectContaining({
      binding_label: "word:assistant",
      state_summary: {
        word: "word:assistant",
      },
    }));

    currentResourceId = "word:agent";
    const snapshotB = store.getActiveStateBindingContextSnapshot();
    expect(snapshotB).toEqual(expect.objectContaining({
      binding_label: "word:agent",
      state_summary: {
        word: "word:agent",
      },
    }));
  });
});
