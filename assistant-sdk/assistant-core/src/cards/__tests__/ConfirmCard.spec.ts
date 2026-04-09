import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import ConfirmCard from "../ConfirmCard.vue";
import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../runtime/events";
import { installRuntimeEventEmitter, uninstallRuntimeEventEmitter } from "../../runtime/runtimeEventBridge";

describe("ConfirmCard", () => {
  const emitSpy = vi.fn();

  beforeEach(() => {
    emitSpy.mockClear();
    installRuntimeEventEmitter(emitSpy);
  });

  afterEach(() => {
    uninstallRuntimeEventEmitter();
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

    const vm = wrapper.vm as unknown as {
      respond?: (confirmed: boolean) => void;
    };
    if (typeof vm.respond === "function") {
      vm.respond(true);
    } else {
      await wrapper.get("button.confirm-btn--primary").trigger("click");
    }
    await nextTick();
    await nextTick();

    expect(emitSpy).toHaveBeenCalledWith({
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
    expect(wrapper.emitted("completed")).toBeTruthy();
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

    const vm = wrapper.vm as unknown as {
      respond?: (confirmed: boolean) => void;
    };
    if (typeof vm.respond === "function") {
      vm.respond(false);
    } else {
      await wrapper.get("button.confirm-btn--secondary").trigger("click");
    }
    await nextTick();
    await nextTick();

    expect(emitSpy).toHaveBeenCalledWith({
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
    expect(wrapper.emitted("completed")).toBeTruthy();
  });
});
