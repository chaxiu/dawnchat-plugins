import { createAssistantEventBus, ASSISTANT_RUNTIME_EVENT_TYPES } from "../events";
import { createFlowRuntime } from "../flowRuntime";
import type { SessionStepRuntimeContext } from "../contracts/sessionStep";

function createContext(timeoutMs?: number): {
  context: SessionStepRuntimeContext;
  cancel: () => Promise<void>;
} {
  let cancelled = false;
  const handlers = new Set<() => void | Promise<void>>();
  return {
    context: {
      sessionId: "sess-flow",
      stepId: "step-flow",
      stepIndex: 1,
      totalSteps: 3,
      timeoutMs,
      isCancelled: () => cancelled,
      onCancel: (handler) => {
        handlers.add(handler);
      },
    },
    cancel: async () => {
      cancelled = true;
      await Promise.allSettled(Array.from(handlers).map(async (handler) => {
        await handler();
      }));
    },
  };
}

describe("flow runtime wait", () => {
  it("resolves when matching event is emitted", async () => {
    const eventBus = createAssistantEventBus();
    const onWaitStateChange = vi.fn();
    const flowRuntime = createFlowRuntime({ eventBus, onWaitStateChange });
    const { context } = createContext(200);
    const waiting = flowRuntime.wait(
      {
        event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED],
        match: {
          action_type: "view.open",
        },
      },
      context
    );

    const event = eventBus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED,
      source: "session",
      payload: {
        action_type: "view.open",
      },
    });

    await expect(waiting).resolves.toEqual({
      ok: true,
      data: {
        status: "matched",
        matched_event: event,
      },
    });
    expect(onWaitStateChange).toHaveBeenNthCalledWith(1, expect.objectContaining({
      status: "waiting",
      sessionId: "sess-flow",
      stepId: "step-flow",
      stepIndex: 1,
      totalSteps: 3,
      pendingWait: expect.objectContaining({
        action_type: "flow.wait",
        event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED],
      }),
    }));
    expect(onWaitStateChange).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: "matched",
      pendingWait: null,
    }));
  });

  it("returns timeout error when no event matches", async () => {
    const eventBus = createAssistantEventBus();
    const flowRuntime = createFlowRuntime({ eventBus });
    const { context } = createContext();
    await expect(
      flowRuntime.wait(
        {
          event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_CONFIRM_RESPONDED],
          timeout_ms: 5,
        },
        context
      )
    ).resolves.toEqual({
      ok: false,
      error_code: "flow_wait_timeout",
      message: "flow.wait timed out before matching any event",
      data: {
        waited_event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_CONFIRM_RESPONDED],
      },
    });
  });

  it("returns cancelled when context is cancelled", async () => {
    const eventBus = createAssistantEventBus();
    const flowRuntime = createFlowRuntime({ eventBus });
    const { context, cancel } = createContext(200);
    const waiting = flowRuntime.wait(
      {
        event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_CANCELLED],
      },
      context
    );

    await cancel();

    await expect(waiting).resolves.toEqual({
      ok: false,
      error_code: "step_cancelled",
      message: "flow.wait cancelled",
      data: {
        waited_event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_CANCELLED],
      },
    });
  });
});
