import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import AssistantAiOrb from "../AssistantAiOrb.vue";

describe("AssistantAiOrb", () => {
  it("挂载后不抛错并渲染根容器", async () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 0));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const wrapper = mount(AssistantAiOrb, {
      props: {
        showGreeting: false,
        motionMode: "idle",
      },
      attachTo: document.body,
    });

    expect(wrapper.find("[data-dc-ai-orb]").exists()).toBe(true);
    expect(wrapper.find("canvas").exists()).toBe(true);

    wrapper.unmount();
  });
});
