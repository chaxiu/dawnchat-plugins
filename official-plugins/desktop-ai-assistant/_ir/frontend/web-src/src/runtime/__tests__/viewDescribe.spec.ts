import { createViewDescribeCapabilityRegistration } from "../view";

describe("assistant.view.describe", () => {
  it("returns minimal runtime observation fields and requested view details", async () => {
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
      getTaskProgressSnapshot: vi.fn(() => ({
        status: "running" as const,
        current_task_id: "task-1",
      })),
      getActiveResourceContextSnapshot: vi.fn(() => ({
        resource_type: "word",
        resource_id: "word:assistant",
        title: "词汇讲解",
        view_id: "word.main",
        state_summary: {
          word: "Assistant",
          active_anchor: "word.meaning",
        },
      })),
      getContinuationSnapshot: vi.fn(() => ({
        pending_wait: null,
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
        task_progress: expect.objectContaining({
          status: "running",
          current_task_id: "task-1",
        }),
        active_resource_context: expect.objectContaining({
          resource_type: "word",
          resource_id: "word:assistant",
          view_id: "word.main",
        }),
        continuation: expect.objectContaining({
          pending_wait: null,
        }),
        requested_view: expect.objectContaining({
          view_id: "word.main",
          capability_invoke_contract: expect.objectContaining({
            action_type: "view.capability.invoke",
            payload_example: expect.objectContaining({
              view_id: "word.main",
              capability_id: "<capability_id>",
            }),
          }),
          interaction_hints: expect.objectContaining({
            interaction_intent: expect.any(String),
          }),
          capabilities: expect.arrayContaining([
            expect.objectContaining({
              capability_id: "append_etymology",
              assistant_hint: expect.any(String),
            }),
          ]),
        }),
      }),
    });
  });
});
