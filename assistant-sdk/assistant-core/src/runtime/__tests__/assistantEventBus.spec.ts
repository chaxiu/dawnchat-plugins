import { ASSISTANT_RUNTIME_EVENT_TYPES, createAssistantEventBus } from "../events";

describe("assistant event bus", () => {
  it("emits realtime events and supports unsubscribe", () => {
    const bus = createAssistantEventBus();
    const received: number[] = [];
    const unsubscribe = bus.subscribe((event) => {
      received.push(event.ts_ms);
    });
    const first = bus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_STARTED,
      source: "session",
      payload: { action_type: "view.open" },
    });
    const second = bus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED,
      source: "session",
      payload: { action_type: "view.open" },
    });
    unsubscribe();
    bus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_FAILED,
      source: "session",
      payload: {},
    });

    expect(received).toEqual([first.ts_ms, second.ts_ms]);
    expect(first.type).toBe(ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_STARTED);
    expect(second.type).toBe(ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED);
  });

  it("waits for matched events with type/session/payload filters", async () => {
    const bus = createAssistantEventBus();
    const waiting = bus.waitForMatch({
      event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.VIEW_STATE_APPLIED],
      session_id: "sess-1",
      payload_match: {
        trigger: "view.open",
      },
      timeout_ms: 200,
    });
    bus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_STARTED,
      source: "session",
      session_id: "sess-1",
      payload: {},
    });
    bus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.VIEW_STATE_APPLIED,
      source: "view",
      session_id: "sess-2",
      payload: {
        trigger: "view.open",
      },
    });
    const matched = bus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.VIEW_STATE_APPLIED,
      source: "view",
      session_id: "sess-1",
      payload: {
        trigger: "view.open",
      },
    });

    await expect(waiting).resolves.toEqual(matched);
  });

  it("times out when no event matches", async () => {
    const bus = createAssistantEventBus();
    await expect(
      bus.waitForMatch({
        event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_CONFIRM_RESPONDED],
        timeout_ms: 5,
      })
    ).rejects.toThrow("wait_timeout");
  });
});
