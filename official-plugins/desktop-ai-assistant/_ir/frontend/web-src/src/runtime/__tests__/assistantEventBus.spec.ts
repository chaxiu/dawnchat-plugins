import { ASSISTANT_RUNTIME_EVENT_TYPES, createAssistantEventBus } from "../events";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("assistant event bus", () => {
  it("emits sequenced events and supports unsubscribe", () => {
    const bus = createAssistantEventBus({ storage: null });
    const received: string[] = [];
    const unsubscribe = bus.subscribe((event) => {
      received.push(event.event_id);
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

    expect(received).toEqual([first.event_id, second.event_id]);
    expect(first.seq).toBe(1);
    expect(second.seq).toBe(2);
  });

  it("waits for matched events with type/session/payload filters", async () => {
    const bus = createAssistantEventBus({ storage: null });
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
    const bus = createAssistantEventBus({ storage: null });
    await expect(
      bus.waitForMatch({
        event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_CONFIRM_RESPONDED],
        timeout_ms: 5,
      })
    ).rejects.toThrow("wait_timeout");
  });

  it("returns recent events with since_seq and limit filters", () => {
    const bus = createAssistantEventBus({ storage: null });
    bus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_STARTED,
      source: "session",
      session_id: "sess-1",
      payload: { index: 1 },
    });
    bus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED,
      source: "session",
      session_id: "sess-1",
      payload: { index: 2 },
    });
    bus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_TASK_PROGRESS_UPDATED,
      source: "session",
      session_id: "sess-2",
      payload: { index: 3 },
    });

    const events = bus.getRecentEvents({
      since_seq: 1,
      limit: 1,
      session_id: "sess-1",
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED);
    expect(bus.getLatestSeq()).toBe(3);
  });

  it("restores recent event window and sequence from persisted storage", () => {
    const storage = createMemoryStorage();
    const storageKey = "assistant-event-bus-persist";
    const firstBus = createAssistantEventBus({ storage, storageKey });
    firstBus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_STARTED,
      source: "session",
      session_id: "sess-restore",
      payload: { index: 1 },
    });
    firstBus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
      source: "guide",
      session_id: "sess-restore",
      payload: { quiz_id: "quiz-1" },
    });

    const restoredBus = createAssistantEventBus({ storage, storageKey });

    expect(restoredBus.getLatestSeq()).toBe(2);
    expect(restoredBus.getRecentEvents({
      session_id: "sess-restore",
      limit: 5,
    })).toHaveLength(2);

    const nextEvent = restoredBus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED,
      source: "session",
      session_id: "sess-restore",
      payload: { index: 2 },
    });
    expect(nextEvent.seq).toBe(3);
  });
});
