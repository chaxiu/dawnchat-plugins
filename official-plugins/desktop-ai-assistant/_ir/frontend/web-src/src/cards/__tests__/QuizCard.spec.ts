import { mount } from "@vue/test-utils";

import QuizCard from "../QuizCard.vue";
import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../runtime/events";

const { emitAssistantRuntimeEvent } = vi.hoisted(() => ({
  emitAssistantRuntimeEvent: vi.fn(() => true),
}));

vi.mock("../../runtime/runtimeEventBridge", () => ({
  emitAssistantRuntimeEvent,
}));

describe("QuizCard", () => {
  beforeEach(() => {
    emitAssistantRuntimeEvent.mockClear();
  });

  it("emits quiz submitted runtime event after the user answers", async () => {
    const wrapper = mount(QuizCard, {
      props: {
        title: "互动测验",
        data: {
          quiz_id: "quiz-1",
          session_id: "sess-1",
          step_id: "step-quiz",
          question: "Which option is correct?",
          options: ["A", "B"],
        },
      },
    });

    await wrapper.get("button.option-btn").trigger("click");
    await wrapper.get("button.submit-btn").trigger("click");

    expect(emitAssistantRuntimeEvent).toHaveBeenCalledWith({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
      source: "guide",
      session_id: "sess-1",
      step_id: "step-quiz",
      payload: {
        quiz_id: "quiz-1",
        question: "Which option is correct?",
        selected_option: "A",
      },
    });
    expect(wrapper.text()).toContain("已提交：A");
  });
});
