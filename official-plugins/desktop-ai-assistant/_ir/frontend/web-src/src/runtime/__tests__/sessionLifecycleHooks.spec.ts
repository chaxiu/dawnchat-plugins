import { createSessionLifecycleHooks } from "../session/lifecycleHooks";

describe("session lifecycle hooks", () => {
  it("updates task progress when a step completes", () => {
    const observationStore = {
      setTaskProgress: vi.fn(),
      patchContinuation: vi.fn(),
    };
    const hooks = createSessionLifecycleHooks({
      observationStore,
    });

    hooks.onStepApplied({
      sessionId: "sess-1",
      stepId: "step-2",
      stepIndex: 1,
      totalSteps: 2,
      actionType: "view.open",
    });

    expect(observationStore.setTaskProgress).toHaveBeenCalledWith({
      status: "completed",
      current_task_id: "sess-1",
      completed_steps: 2,
      total_steps: 2,
      summary: "view.open completed",
    });
    expect(observationStore.patchContinuation).toHaveBeenCalledWith({
      last_completed_step_index: 1,
      last_completed_step_id: "step-2",
      pending_wait: null,
    });
  });

  it("records pending wait continuation state before flow.wait resolves", () => {
    const observationStore = {
      setTaskProgress: vi.fn(),
      patchContinuation: vi.fn(),
    };
    const hooks = createSessionLifecycleHooks({
      observationStore,
    });

    hooks.onFlowWaitStateChanged({
      status: "waiting",
      sessionId: "sess-wait",
      stepId: "step-wait",
      stepIndex: 2,
      totalSteps: 5,
      pendingWait: {
        action_type: "flow.wait",
        session_id: "sess-wait",
        step_id: "step-wait",
        step_index: 2,
        total_steps: 5,
        event_types: ["assistant.guide.confirm.responded"],
        match: {
          confirm_id: "confirm-delete",
        },
        timeout_ms: 30000,
        waiting_since_ms: 100,
      },
    });

    expect(observationStore.patchContinuation).toHaveBeenCalledWith({
      pending_wait: expect.objectContaining({
        event_types: ["assistant.guide.confirm.responded"],
      }),
    });
    expect(observationStore.setTaskProgress).toHaveBeenCalledWith({
      status: "paused",
      current_task_id: "sess-wait",
      completed_steps: 2,
      total_steps: 5,
      summary: "Waiting for assistant.guide.confirm.responded",
    });
  });
});
