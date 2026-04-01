import { createCheckpointRuntime } from "../checkpointRuntime";
import type { CheckpointStorageAdapter } from "../checkpointStorage";
import type { WorkspaceCheckpointRecord } from "../checkpointTypes";
import type { GuideStateSnapshot } from "../guideState";
import type { ViewStateSnapshot } from "../viewState";

function createMemoryAdapter(): CheckpointStorageAdapter & { current: WorkspaceCheckpointRecord | null } {
  let current: WorkspaceCheckpointRecord | null = null;
  return {
    get current() {
      return current;
    },
    read: () => current,
    write: (record) => {
      current = JSON.parse(JSON.stringify(record)) as WorkspaceCheckpointRecord;
    },
    clear: () => {
      current = null;
    },
  };
}

describe("checkpoint runtime", () => {
  it("saves latest checkpoint and resumes only with explicit token", async () => {
    const storage = createMemoryAdapter();
    const setLastCheckpointMeta = vi.fn();
    const navigateToView = vi.fn();
    const restoreGuideState = vi.fn();
    const restoreViewState = vi.fn(() => 2);
    let currentViewState: ViewStateSnapshot = {
      active_view_id: "",
      active_anchor: "",
      current_resource: null,
      active_manifest: null,
      view_state_version: 0,
    };
    const currentGuideState: GuideStateSnapshot = {
      current_card: null,
      active_tip: null,
      narration_state: {
        status: "completed",
        text: "ready",
        updatedAtMs: 100,
      },
      guide_state_version: 1,
    };

    const runtime = createCheckpointRuntime({
      storage,
      getWorkspaceSnapshot: () => ({
        workspace_version: 3,
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
        active_anchor: "word.meaning",
        task_progress: {
          status: "running",
          current_task_id: "task-1",
        },
        artifacts: [],
        guide_state: currentGuideState,
        view_state: {
          active_view_id: "word.main",
          active_anchor: "word.meaning",
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
        last_checkpoint_meta: null,
      }),
      getViewStateSnapshot: () => currentViewState,
      restoreViewState,
      restoreGuideState,
      setLastCheckpointMeta,
      navigateToView,
    });

    const checkpoint = runtime.saveStableCheckpoint({
      trigger: "view.open",
      actionType: "view.open",
      sessionId: "session-1",
      stepId: "step-1",
    });

    expect(checkpoint).toEqual(expect.objectContaining({
      trigger: "view.open",
      status: "checkpointed",
      scene_view_id: "word.main",
      resource_id: "word:assistant",
      source_action_type: "view.open",
    }));

    const describeResult = await runtime.registrations[0].handler({}, {});
    expect(describeResult).toEqual({
      ok: true,
      data: {
        checkpoint_summary: expect.objectContaining({
          checkpoint_id: checkpoint?.checkpoint_id,
          resume_token: checkpoint?.resume_token,
          status: "checkpointed",
        }),
        resume_available: true,
        resume_token: checkpoint?.resume_token,
      },
    });

    const invalidResume = await runtime.registrations[1].handler({
      resume_token: "bad-token",
    }, {});
    expect(invalidResume).toEqual({
      ok: false,
      error_code: "invalid_resume_token",
      message: "resume_token does not match the latest checkpoint",
    });

    const resumeResult = await runtime.registrations[1].handler({
      resume_token: checkpoint?.resume_token,
    }, {});

    expect(restoreViewState).toHaveBeenCalledWith(expect.objectContaining({
      active_view_id: "word.main",
      active_anchor: "word.meaning",
    }));
    expect(navigateToView).toHaveBeenCalledWith("word.main");
    expect(restoreGuideState).toHaveBeenCalledWith(currentGuideState);
    expect(resumeResult).toEqual({
      ok: true,
      data: {
        resumed: true,
        checkpoint_id: checkpoint?.checkpoint_id,
        restored_view_id: "word.main",
        restored_resource_id: "word:assistant",
        restored_anchor: "word.meaning",
      },
    });
  });

  it("returns resume_conflict when current workspace already points to another view", async () => {
    const storage = createMemoryAdapter();
    const runtime = createCheckpointRuntime({
      storage,
      getWorkspaceSnapshot: () => ({
        workspace_version: 1,
        active_resource: {
          resource_type: "word",
          resource_id: "word:assistant",
          title: "词汇讲解",
          data: {
            word: "Assistant",
          },
        },
        active_view: "word.main",
        active_anchor: "word.header",
        task_progress: {
          status: "idle",
        },
        artifacts: [],
        guide_state: {
          current_card: null,
          active_tip: null,
          narration_state: {
            status: "idle",
            text: "",
            updatedAtMs: 1,
          },
          guide_state_version: 0,
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
            },
          },
          active_manifest: null,
          view_state_version: 1,
        },
        last_checkpoint_meta: null,
      }),
      getViewStateSnapshot: () => ({
        active_view_id: "paper.main",
        active_anchor: "paper.summary",
        current_resource: {
          resource_type: "paper",
          resource_id: "paper:1",
          title: "Paper Workspace",
          data: {
            title: "Agent Runtime",
          },
        },
        active_manifest: null,
        view_state_version: 2,
      }),
      restoreViewState: vi.fn(() => 1),
      restoreGuideState: vi.fn(),
      setLastCheckpointMeta: vi.fn(),
      navigateToView: vi.fn(),
    });

    const checkpoint = runtime.saveStableCheckpoint({
      trigger: "view.open",
      actionType: "view.open",
    });

    const result = await runtime.registrations[1].handler({
      resume_token: checkpoint?.resume_token,
    }, {});

    expect(result).toEqual({
      ok: false,
      error_code: "resume_conflict",
      message: "Current workspace state conflicts with the requested checkpoint resume",
    });
  });
});
