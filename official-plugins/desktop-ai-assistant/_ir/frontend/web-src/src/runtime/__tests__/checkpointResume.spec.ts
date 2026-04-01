import { createCheckpointRuntime } from "../checkpointRuntime";
import type { CheckpointStorageAdapter } from "../checkpointStorage";
import type { WorkspaceCheckpointRecord } from "../checkpointTypes";
import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../events";
import type { GuideStateSnapshot } from "../guideState";
import type { WorkspaceSnapshot } from "../workspaceTypes";
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
    const restoreTaskProgress = vi.fn();
    const restoreContinuation = vi.fn();
    const emitRuntimeEvent = vi.fn();
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
        workspace_schema_version: 2,
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
        continuation: {
          last_completed_step_index: 0,
          last_completed_step_id: "step-1",
          event_cursor_seq: 4,
          pending_wait: {
            action_type: "flow.wait",
            session_id: "session-1",
            step_id: "step-2",
            step_index: 1,
            total_steps: 3,
            event_types: ["assistant.view.form.submitted"],
            match: {
              form_id: "word-form",
            },
            timeout_ms: 30000,
            event_cursor_seq: 4,
            waiting_since_ms: 120,
          },
        },
        last_checkpoint_meta: null,
      }),
      getViewStateSnapshot: () => currentViewState,
      restoreViewState,
      restoreGuideState,
      restoreTaskProgress,
      restoreContinuation,
      setLastCheckpointMeta,
      navigateToView,
      emitRuntimeEvent,
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
      workspace_schema_version: 2,
      source_action_type: "view.open",
    }));
    expect(emitRuntimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.CHECKPOINT_SAVED,
      source: "checkpoint",
      payload: expect.objectContaining({
        status: "checkpointed",
      }),
    }));

    const describeResult = await runtime.registrations[0].handler({}, {});
    expect(describeResult).toEqual({
      ok: true,
      data: {
        checkpoint_summary: expect.objectContaining({
          checkpoint_id: checkpoint?.checkpoint_id,
          resume_token: checkpoint?.resume_token,
          status: "checkpointed",
          workspace_schema_version: 2,
          continuation_hint: expect.objectContaining({
            last_completed_step_index: 0,
            event_cursor_seq: 4,
          }),
        }),
        resume_available: true,
        resume_token: checkpoint?.resume_token,
        continuation_hint: expect.objectContaining({
          last_completed_step_index: 0,
          event_cursor_seq: 4,
        }),
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
    expect(restoreTaskProgress).toHaveBeenCalledWith({
      status: "running",
      current_task_id: "task-1",
    });
    expect(restoreContinuation).toHaveBeenCalledWith(expect.objectContaining({
      last_completed_step_index: 0,
      pending_wait: expect.objectContaining({
        action_type: "flow.wait",
        session_id: "session-1",
      }),
    }));
    expect(resumeResult).toEqual({
      ok: true,
      data: {
        resumed: true,
        checkpoint_id: checkpoint?.checkpoint_id,
        restored_view_id: "word.main",
        restored_resource_id: "word:assistant",
        restored_anchor: "word.meaning",
        continuation_hint: expect.objectContaining({
          last_completed_step_index: 0,
          event_cursor_seq: 4,
          pending_wait: expect.objectContaining({
            action_type: "flow.wait",
          }),
        }),
      },
    });
    expect(emitRuntimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.CHECKPOINT_RESUMED,
      source: "checkpoint",
      payload: expect.objectContaining({
        restored_view_id: "word.main",
        continuation_pending: true,
      }),
    }));
  });

  it("returns resume_conflict when current workspace already points to another view", async () => {
    const storage = createMemoryAdapter();
    const runtime = createCheckpointRuntime({
      storage,
      getWorkspaceSnapshot: () => ({
        workspace_schema_version: 2,
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
        continuation: {
          event_cursor_seq: 0,
          pending_wait: null,
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
      restoreTaskProgress: vi.fn(),
      restoreContinuation: vi.fn(),
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
      error_code: "resume_conflict_view_mismatch",
      message: "Current workspace view conflicts with the requested checkpoint resume",
    });
  });

  it("rejects resume when checkpoint schema is incompatible", async () => {
    const storage = createMemoryAdapter();
    const runtime = createCheckpointRuntime({
      storage,
      getWorkspaceSnapshot: () => ({
        workspace_schema_version: 2,
        workspace_version: 1,
        active_resource: null,
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
          current_resource: null,
          active_manifest: null,
          view_state_version: 1,
        },
        continuation: {
          event_cursor_seq: 0,
          pending_wait: null,
        },
        last_checkpoint_meta: null,
      }),
      getViewStateSnapshot: () => ({
        active_view_id: "",
        active_anchor: "",
        current_resource: null,
        active_manifest: null,
        view_state_version: 0,
      }),
      restoreViewState: vi.fn(() => 1),
      restoreGuideState: vi.fn(),
      restoreTaskProgress: vi.fn(),
      restoreContinuation: vi.fn(),
      setLastCheckpointMeta: vi.fn(),
      navigateToView: vi.fn(),
    });

    const checkpoint = runtime.saveStableCheckpoint({
      trigger: "view.open",
      actionType: "view.open",
    });
    expect(checkpoint).toBeTruthy();
    if (storage.current) {
      storage.current.workspace_schema_version = 1;
    }

    const result = await runtime.registrations[1].handler({
      resume_token: checkpoint?.resume_token,
    }, {});

    expect(result).toEqual({
      ok: false,
      error_code: "resume_conflict_schema_incompatible",
      message: "Checkpoint schema is incompatible with the current workspace runtime",
    });
  });

  it("refreshes checkpoint snapshot when only status is updated", () => {
    const storage = createMemoryAdapter();
    let currentSnapshot: WorkspaceSnapshot = {
      workspace_schema_version: 2,
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
        status: "running" as const,
        current_task_id: "sess-1",
      },
      artifacts: [],
      guide_state: {
        current_card: null,
        active_tip: null,
        narration_state: {
          status: "idle" as const,
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
      continuation: {
        event_cursor_seq: 3,
        pending_wait: {
          action_type: "flow.wait" as const,
          session_id: "sess-1",
          step_id: "step-2",
          event_types: ["assistant.view.form.submitted"],
          event_cursor_seq: 3,
          waiting_since_ms: 200,
        },
      },
      last_checkpoint_meta: null,
    };
    const runtime = createCheckpointRuntime({
      storage,
      getWorkspaceSnapshot: () => currentSnapshot,
      getViewStateSnapshot: () => ({
        active_view_id: "",
        active_anchor: "",
        current_resource: null,
        active_manifest: null,
        view_state_version: 0,
      }),
      restoreViewState: vi.fn(() => 1),
      restoreGuideState: vi.fn(),
      restoreTaskProgress: vi.fn(),
      restoreContinuation: vi.fn(),
      setLastCheckpointMeta: vi.fn(),
      navigateToView: vi.fn(),
    });

    runtime.saveStableCheckpoint({
      trigger: "view.open",
      actionType: "view.open",
      sessionId: "sess-1",
      stepId: "step-1",
    });

    currentSnapshot = {
      ...currentSnapshot,
      task_progress: {
        status: "failed",
        current_task_id: "sess-1",
        summary: "flow.wait timed out",
      },
      continuation: {
        event_cursor_seq: 4,
        pending_wait: null,
      },
    };

    runtime.markCheckpointStatus({
      status: "failed",
      trigger: "flow.wait",
      sessionId: "sess-1",
      stepId: "step-2",
      reasonCode: "flow_wait_timeout",
      errorCode: "flow_wait_timeout",
      errorMessage: "flow.wait timed out before matching any event",
    });

    expect(storage.current).toEqual(expect.objectContaining({
      status: "failed",
      step_id: "step-2",
      reason_code: "flow_wait_timeout",
      snapshot: expect.objectContaining({
        task_progress: expect.objectContaining({
          status: "failed",
          summary: "flow.wait timed out",
        }),
        continuation: {
          event_cursor_seq: 4,
          pending_wait: null,
        },
      }),
    }));
  });
});
