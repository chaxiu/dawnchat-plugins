import { mount } from "@vue/test-utils";

import ConfirmCard from "../ConfirmCard.vue";
import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../runtime/events";

const { emitAssistantRuntimeEvent } = vi.hoisted(() => ({
  emitAssistantRuntimeEvent: vi.fn(() => true),
}));

vi.mock("../../runtime/runtimeEventBridge", () => ({
  emitAssistantRuntimeEvent,
}));

describe("ConfirmCard", () => {
  beforeEach(() => {
    emitAssistantRuntimeEvent.mockClear();
  });

  it("emits confirm responded runtime event after the user confirms", async () => {
    const wrapper = mount(ConfirmCard, {
      props: {
        title: "删除确认",
        data: {
          confirm_id: "confirm-delete",
          session_id: "sess-1",
          step_id: "step-confirm",
          question: "确认删除当前草稿？",
          confirm_label: "删除",
          cancel_label: "保留",
        },
      },
    });

    await wrapper.get("button.confirm-btn--primary").trigger("click");

    expect(emitAssistantRuntimeEvent).toHaveBeenCalledWith({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_CONFIRM_RESPONDED,
      source: "guide",
      session_id: "sess-1",
      step_id: "step-confirm",
      payload: {
        confirm_id: "confirm-delete",
        question: "确认删除当前草稿？",
        confirmed: true,
        response: "confirmed",
      },
    });
    expect(wrapper.text()).toContain("已响应：删除");
  });

  it("emits cancelled response when the user rejects the confirmation", async () => {
    const wrapper = mount(ConfirmCard, {
      props: {
        data: {
          confirm_id: "confirm-save",
          session_id: "sess-2",
          step_id: "step-confirm-cancel",
          message: "是否暂不保存并退出？",
        },
      },
    });

    await wrapper.get("button.confirm-btn--secondary").trigger("click");

    expect(emitAssistantRuntimeEvent).toHaveBeenCalledWith({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_CONFIRM_RESPONDED,
      source: "guide",
      session_id: "sess-2",
      step_id: "step-confirm-cancel",
      payload: {
        confirm_id: "confirm-save",
        question: "是否暂不保存并退出？",
        confirmed: false,
        response: "cancelled",
      },
    });
    expect(wrapper.text()).toContain("已响应：取消");
  });
});
