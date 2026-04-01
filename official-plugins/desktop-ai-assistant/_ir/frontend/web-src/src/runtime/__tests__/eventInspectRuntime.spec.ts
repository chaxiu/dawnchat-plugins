import { createEventPeekCapabilityRegistration } from "../eventInspectRuntime";
import { ASSISTANT_RUNTIME_EVENT_TYPES, createAssistantEventBus } from "../events";

describe("event inspect runtime", () => {
  it("builds assistant.runtime.event.peek and returns filtered events", async () => {
    const eventBus = createAssistantEventBus();
    eventBus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_STARTED,
      source: "session",
      session_id: "sess-1",
      step_id: "step-1",
      payload: {
        action_type: "view.open",
      },
    });
    eventBus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED,
      source: "session",
      session_id: "sess-1",
      step_id: "step-1",
      payload: {
        action_type: "view.open",
        quiz_id: "quiz-2",
      },
    });
    eventBus.emit({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED,
      source: "session",
      session_id: "sess-1",
      step_id: "step-1",
      payload: {
        action_type: "view.open",
        quiz_id: "quiz-1",
      },
    });

    const registration = createEventPeekCapabilityRegistration({
      eventBus,
    });
    expect(registration.definition.name).toBe("assistant.runtime.event.peek");

    const result = await registration.handler({
      since_seq: 1,
      session_id: "sess-1",
      event_types: [ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED],
      match: {
        quiz_id: "quiz-1",
      },
    }, {});
    expect(result).toEqual({
      ok: true,
      data: {
        latest_seq: 3,
        events: [
          expect.objectContaining({
            seq: 3,
            type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED,
            session_id: "sess-1",
          }),
        ],
      },
    });
  });
});
