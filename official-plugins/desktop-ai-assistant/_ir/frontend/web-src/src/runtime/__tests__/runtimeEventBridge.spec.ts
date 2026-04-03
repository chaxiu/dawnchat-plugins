import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../events";
import {
  emitAssistantRuntimeEvent,
  installRuntimeEventEmitter,
  postAssistantRuntimeEventToHost,
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

  it("posts runtime events to host window", () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      value: {
        postMessage,
      },
      configurable: true,
    });

    expect(postAssistantRuntimeEventToHost({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
      ts_ms: 123,
      source: "guide",
      session_id: "sess-1",
      step_id: "step-1",
      payload: {
        quiz_id: "quiz-1",
      },
    })).toBe(true);

    expect(postMessage).toHaveBeenCalledWith({
      type: "DAWNCHAT_ASSISTANT_RUNTIME_EVENT",
      payload: {
        type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
        ts_ms: 123,
        source: "guide",
        session_id: "sess-1",
        step_id: "step-1",
        payload: {
          quiz_id: "quiz-1",
        },
      },
    }, "*");
  });
});
