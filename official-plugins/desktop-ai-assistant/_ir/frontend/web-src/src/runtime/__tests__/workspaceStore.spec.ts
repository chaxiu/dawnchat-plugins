import { createWorkspaceStore } from "../workspaceStore";

describe("workspace store", () => {
  it("aggregates current view, guide, task progress, artifacts and checkpoint meta", () => {
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
        active_manifest: null,
        view_state_version: 2,
      }),
      getGuideStateSnapshot: () => ({
        current_card: null,
        active_tip: {
          message: "已进入工作区",
          level: "info",
        },
        narration_state: {
          status: "completed",
          text: "ready",
          updatedAtMs: 12,
        },
        guide_state_version: 3,
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
        data: {
          text: "Assistant",
        },
      },
    ]);
    store.setLastCheckpointMeta({
      checkpoint_id: "checkpoint-1",
      resume_token: "resume-1",
      saved_at_ms: 100,
      trigger: "view.open",
      status: "checkpointed",
      scene_view_id: "word.main",
      resource_id: "word:assistant",
    });

    expect(store.getWorkspaceSnapshot()).toEqual({
      workspace_version: 8,
      active_resource: {
        resource_type: "word",
        resource_id: "word:assistant",
        title: "词汇讲解",
        data: {
          word: "Assistant",
          meaning: "你的自进化智能助理",
          etymology: ["支持富媒体呈现"],
        },
      },
      active_view: "word.main",
      active_anchor: "word.header",
      task_progress: {
        status: "running",
        current_task_id: "task-1",
        completed_steps: 1,
        total_steps: 3,
        summary: "正在处理词义讲解",
      },
      artifacts: [
        {
          id: "artifact-1",
          kind: "note",
          title: "word-note",
          data: {
            text: "Assistant",
          },
        },
      ],
      guide_state: {
        current_card: null,
        active_tip: {
          message: "已进入工作区",
          level: "info",
        },
        narration_state: {
          status: "completed",
          text: "ready",
          updatedAtMs: 12,
        },
        guide_state_version: 3,
      },
      view_state: {
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
        active_manifest: null,
        view_state_version: 2,
      },
      last_checkpoint_meta: {
        checkpoint_id: "checkpoint-1",
        resume_token: "resume-1",
        saved_at_ms: 100,
        trigger: "view.open",
        status: "checkpointed",
        scene_view_id: "word.main",
        resource_id: "word:assistant",
        error_code: undefined,
        error_message: undefined,
      },
    });
  });
});
