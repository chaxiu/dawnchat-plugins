import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../events";
import {
  emitAssistantRuntimeEvent,
  installRuntimeEventEmitter,
  uninstallRuntimeEventEmitter,
} from "../runtimeEventBridge";

describe("runtime event bridge", () => {
  afterEach(() => {
    uninstallRuntimeEventEmitter();
  });

  it("returns false when no runtime emitter is installed", () => {
    expect(emitAssistantRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
      source: "guide",
      payload: {
        quiz_id: "quiz-1",
      },
    })).toBe(false);
  });

  it("forwards events to the installed runtime emitter", () => {
    const emit = vi.fn();
    installRuntimeEventEmitter(emit);

    expect(emitAssistantRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
      source: "guide",
      session_id: "sess-1",
      payload: {
        quiz_id: "quiz-1",
        selected_option: "A",
      },
    })).toBe(true);

    expect(emit).toHaveBeenCalledWith({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
      source: "guide",
      session_id: "sess-1",
      payload: {
        quiz_id: "quiz-1",
        selected_option: "A",
      },
    });
  });
});
