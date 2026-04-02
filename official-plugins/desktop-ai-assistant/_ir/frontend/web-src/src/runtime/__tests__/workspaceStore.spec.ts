import { createWorkspaceStore } from "../workspace";

describe("workspace store", () => {
  it("returns minimal runtime observation snapshots", () => {
    const store = createWorkspaceStore({
      getViewStateSnapshot: () => ({
        active_view_id: "word.main",
        active_anchor: "word.header",
        current_resource: {
          resource_type: "word",
          resource_id: "word:assistant",
          title: "词汇讲解",
          data: {
            word: "Assistant",
            meaning: "你的自进化智能助理",
            etymology: ["支持富媒体呈现"],
          },
        },
        active_manifest: {
          view_id: "word.main",
          resource_type: "word",
          title: "Word Workspace",
          route_name: "view-word-main",
          route_path: "/views/word/main",
          state_mode: "lightweight",
          anchors: [
            { id: "word.header", title: "Header" },
            { id: "word.meaning", title: "Meaning" },
          ],
          capabilities: [],
          resource_contract: {
            resource_schema: { type: "object" },
            open_payload_schema: { type: "object" },
            default_resource: {
              resource_type: "word",
              resource_id: "word:assistant",
              title: "词汇讲解",
              data: { word: "Assistant" },
            },
          },
          state_summary_schema: {
            type: "object" as const,
            properties: {
              word: { type: "string" },
              active_anchor: { type: "string" },
            },
          },
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
    store.setArtifacts([
      {
        id: "artifact-1",
        kind: "note",
        title: "word-note",
        resource_type: "word",
        resource_id: "word:assistant",
        view_id: "word.main",
        created_at_ms: 90,
        updated_at_ms: 95,
        data: {
          text: "Assistant",
        },
      },
    ]);
    store.setContinuation({
      last_completed_step_index: 1,
      last_completed_step_id: "step-2",
      event_cursor_seq: 12,
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
        event_cursor_seq: 12,
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
    expect(store.getActiveResourceSliceSnapshot()).toEqual({
      resource_type: "word",
      resource_id: "word:assistant",
      title: "词汇讲解",
      view_id: "word.main",
      state_summary: {
        word: "Assistant",
        active_anchor: "word.header",
      },
      artifact_ids: ["artifact-1"],
      artifact_count: 1,
    });
    expect(store.getContinuationSnapshot()).toEqual({
      last_completed_step_index: 1,
      last_completed_step_id: "step-2",
      event_cursor_seq: 12,
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
        event_cursor_seq: 12,
        waiting_since_ms: 200,
      },
    });
  });

  it("returns cloned observation data and keeps internal state immutable", () => {
    const store = createWorkspaceStore({
      getViewStateSnapshot: () => ({
        active_view_id: "word.main",
        active_anchor: "word.header",
        current_resource: {
          resource_type: "word",
          resource_id: "word:assistant",
          title: "词汇讲解",
          data: {
            word: "Assistant",
          },
        },
        active_manifest: {
          view_id: "word.main",
          resource_type: "word",
          title: "Word Workspace",
          route_name: "view-word-main",
          route_path: "/views/word/main",
          state_mode: "lightweight",
          anchors: [],
          capabilities: [],
          resource_contract: {
            resource_schema: { type: "object" },
            open_payload_schema: { type: "object" },
            default_resource: {
              resource_type: "word",
              resource_id: "word:assistant",
              title: "词汇讲解",
              data: { word: "Assistant" },
            },
          },
          state_summary_schema: {
            type: "object" as const,
            properties: {
              word: { type: "string" },
            },
          },
          state_summary: {
            word: "Assistant",
          },
        },
        view_state_version: 1,
      }),
    });
    store.setArtifacts([
      {
        id: "artifact-1",
        kind: "note",
        resource_type: "word",
        resource_id: "word:assistant",
        view_id: "word.main",
        created_at_ms: 1,
        updated_at_ms: 1,
        data: {
          text: "v1",
        },
      },
    ]);
    const sliceSnapshot = store.getActiveResourceSliceSnapshot();
    const continuationSnapshot = store.getContinuationSnapshot();
    if (sliceSnapshot) {
      (sliceSnapshot.state_summary as Record<string, unknown>).word = "mutated";
      sliceSnapshot.artifact_ids[0] = "artifact-mutated";
    }
    continuationSnapshot.event_cursor_seq = 99;

    const nextSliceSnapshot = store.getActiveResourceSliceSnapshot();
    expect(nextSliceSnapshot).toEqual(expect.objectContaining({
      state_summary: {
        word: "Assistant",
      },
      artifact_ids: ["artifact-1"],
    }));
    expect(store.getContinuationSnapshot().event_cursor_seq).toBe(0);
  });

  it("keeps active_resource_slice bound to current active resource only", () => {
    let currentResourceId = "word:assistant";
    const store = createWorkspaceStore({
      getViewStateSnapshot: () => ({
        active_view_id: "word.main",
        active_anchor: "word.header",
        current_resource: {
          resource_type: "word",
          resource_id: currentResourceId,
          title: currentResourceId,
          data: {
            word: currentResourceId,
          },
        },
        active_manifest: {
          view_id: "word.main",
          resource_type: "word",
          title: "Word Workspace",
          route_name: "view-word-main",
          route_path: "/views/word/main",
          state_mode: "lightweight",
          anchors: [],
          capabilities: [],
          resource_contract: {
            resource_schema: { type: "object" },
            open_payload_schema: { type: "object" },
            default_resource: {
              resource_type: "word",
              resource_id: "word:assistant",
              title: "词汇讲解",
              data: { word: "Assistant" },
            },
          },
          state_summary_schema: {
            type: "object" as const,
            properties: {
              word: { type: "string" },
            },
          },
          state_summary: {
            word: currentResourceId,
          },
        },
        view_state_version: 1,
      }),
    });

    store.setArtifacts([
      {
        id: "artifact-word-1",
        kind: "note",
        resource_type: "word",
        resource_id: "word:assistant",
      },
      {
        id: "artifact-word-2",
        kind: "note",
        resource_type: "word",
        resource_id: "word:agent",
      },
    ]);

    const snapshotA = store.getActiveResourceSliceSnapshot();
    expect(snapshotA).toEqual(expect.objectContaining({
      resource_id: "word:assistant",
      artifact_ids: ["artifact-word-1"],
      artifact_count: 1,
    }));

    currentResourceId = "word:agent";
    const snapshotB = store.getActiveResourceSliceSnapshot();
    expect(snapshotB).toEqual(expect.objectContaining({
      resource_id: "word:agent",
      artifact_ids: ["artifact-word-2"],
      artifact_count: 1,
    }));
  });
});
