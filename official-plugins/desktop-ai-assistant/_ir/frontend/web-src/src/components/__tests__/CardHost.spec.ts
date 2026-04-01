import { mount } from "@vue/test-utils";

import CardHost from "../CardHost.vue";
import {
  GUIDE_STACK_BOTTOM,
  GUIDE_STACK_LEFT,
} from "../../runtime/assistantUiLayout";

describe("CardHost", () => {
  it("stays hidden when no guide ui payload exists", () => {
    const wrapper = mount(CardHost, {
      props: {
        card: null,
        tip: null,
        narration: {
          status: "idle",
          text: "",
          updatedAtMs: Date.now(),
        },
      },
    });
    expect(wrapper.find(".host").exists()).toBe(false);
  });

  it("renders in left-bottom bubble stack with narration content", () => {
    const wrapper = mount(CardHost, {
      props: {
        card: null,
        tip: null,
        narration: {
          status: "playing",
          text: "正在讲解",
          updatedAtMs: Date.now(),
        },
      },
    });
    const host = wrapper.find(".host");
    expect(host.exists()).toBe(true);
    expect(host.attributes("style")).toContain(`left: ${GUIDE_STACK_LEFT}px;`);
    expect(host.attributes("style")).toContain(`bottom: ${GUIDE_STACK_BOTTOM}px;`);
    expect(wrapper.text()).toContain("正在讲解");
  });
});
