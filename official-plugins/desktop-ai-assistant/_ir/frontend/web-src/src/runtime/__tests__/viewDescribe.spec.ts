import { createViewDescribeCapabilityRegistration } from "../viewRuntime";

describe("assistant.view.describe", () => {
  it("returns workspace snapshot, checkpoint summary and recovery hints", async () => {
    const registration = createViewDescribeCapabilityRegistration({
      setActiveViewState: vi.fn(() => 1),
      getViewStateSnapshot: vi.fn(() => ({
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
        view_state_version: 4,
      })),
      getGuideStateSnapshot: vi.fn(() => ({
        current_card: null,
        active_tip: null,
        narration_state: {
          status: "completed" as const,
          text: "guide ready",
          updatedAtMs: 99,
        },
        guide_state_version: 5,
      })),
      getWorkspaceSnapshot: vi.fn(() => ({
        workspace_version: 10,
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
          status: "running" as const,
          current_task_id: "task-1",
        },
        artifacts: [],
        guide_state: {
          current_card: null,
          active_tip: null,
          narration_state: {
            status: "completed" as const,
            text: "guide ready",
            updatedAtMs: 99,
          },
          guide_state_version: 5,
        },
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
          view_state_version: 4,
        },
        last_checkpoint_meta: {
          checkpoint_id: "checkpoint-1",
          resume_token: "resume-1",
          saved_at_ms: 88,
          trigger: "view.capability.invoke",
          status: "checkpointed" as const,
          scene_view_id: "word.main",
          resource_id: "word:assistant",
        },
      })),
      getCheckpointSummary: vi.fn(() => ({
        checkpoint_id: "checkpoint-1",
        resume_token: "resume-1",
        saved_at_ms: 88,
        trigger: "view.capability.invoke",
        status: "checkpointed" as const,
        scene_view_id: "word.main",
        resource_id: "word:assistant",
      })),
      navigateToView: vi.fn(),
    });

    const result = await registration.handler({
      view_id: "word.main",
    }, {});

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        active_view_id: "word.main",
        active_anchor: "word.meaning",
        workspace_snapshot: expect.objectContaining({
          workspace_version: 10,
          active_view: "word.main",
          active_anchor: "word.meaning",
        }),
        checkpoint_summary: expect.objectContaining({
          checkpoint_id: "checkpoint-1",
          resume_token: "resume-1",
        }),
        resume_available: true,
        resume_token: "resume-1",
        recovery_hints: expect.arrayContaining([
          "checkpoint_available",
          "resume_requires_explicit_token",
        ]),
        available_views: expect.arrayContaining([
          expect.objectContaining({
            view_id: "word.main",
          }),
        ]),
        requested_view: expect.objectContaining({
          view_id: "word.main",
        }),
      }),
    });
  });
});
