import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import QuizCard from "../QuizCard.vue";
import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../runtime/events";
import { installRuntimeEventEmitter, uninstallRuntimeEventEmitter } from "../../runtime/runtimeEventBridge";

describe("QuizCard", () => {
  const emitSpy = vi.fn();

  beforeEach(() => {
    emitSpy.mockClear();
    installRuntimeEventEmitter(emitSpy);
  });

  afterEach(() => {
    uninstallRuntimeEventEmitter();
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

    const vm = wrapper.vm as unknown as {
      selectOption?: (option: string) => void;
      submitAnswer?: () => void;
    };
    if (typeof vm.selectOption === "function" && typeof vm.submitAnswer === "function") {
      vm.selectOption("A");
      vm.submitAnswer();
    } else {
      await wrapper.get("button.option-btn").trigger("click");
      await wrapper.get("button.submit-btn").trigger("click");
    }
    await nextTick();
    await nextTick();

    expect(emitSpy).toHaveBeenCalledWith({
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
    expect(wrapper.emitted("completed")).toBeTruthy();
  });
});
