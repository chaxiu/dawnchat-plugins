import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import {
  installAssistantLauncherNavigation,
  resetLauncherContentExitForTests,
} from "../../../../runtime/view/launcherNavigation";

const openSpy = vi.fn().mockResolvedValue({ ok: true, data: {} });

vi.mock("../../../../runtime/view/runtime.open", () => ({
  openAssistantViewFromShell: (...args: unknown[]) => openSpy(...args),
}));

vi.mock("../../../../runtime/view/registry", () => ({
  listViewRegistrations: () => [
    {
      view_id: "board.main",
      binding_type: "board.workspace",
      title: "Board",
      component: defineComponent({ name: "StubBoard", setup: () => () => h("div") }),
      render_mode: "light-dom",
      style_texts: [],
      theme_vars: [],
      route: {
        path: "board/main",
        name: "view-board-main",
        full_path: "/views/board/main",
      },
      state_mode: "stateful",
      default_state_binding: { binding_type: "board.workspace", data: {} },
      anchors: [],
      capabilities: [],
      getStateSummary: () => ({}),
    },
  ],
}));

import AssistantLauncherPage from "../AssistantLauncherPage.vue";

describe("AssistantLauncherPage", () => {
  beforeEach(() => {
    resetLauncherContentExitForTests();
  });

  it("navigates back to the last tracked content route on back click", async () => {
    const pushCalls: unknown[] = [];
    const Placeholder = defineComponent({ name: "RoutePlaceholder", template: "<div />" });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/views/launcher",
          name: "launcher",
          component: Placeholder,
        },
        { path: "/views/board/main", name: "board", component: Placeholder },
        { path: "/welcome", name: "welcome", component: Placeholder },
      ],
    });
    const originalPush = router.push.bind(router);
    vi.spyOn(router, "push").mockImplementation(async (to: unknown) => {
      pushCalls.push(to);
      return originalPush(to as never);
    });

    installAssistantLauncherNavigation(router);
    await router.push("/views/board/main");
    await router.push("/views/launcher");
    await nextTick();

    const wrapper = mount(AssistantLauncherPage, {
      global: {
        plugins: [router],
      },
      attachTo: document.body,
    });

    const back = wrapper.find(".assistant-launcher__back");
    expect(back.exists()).toBe(true);
    await back.trigger("click");
    expect(pushCalls.at(-1)).toEqual("/views/board/main");
    wrapper.unmount();
  });

  it("invokes openAssistantViewFromShell when a tile is clicked", async () => {
    openSpy.mockClear();
    const Placeholder = defineComponent({ name: "RoutePlaceholder", template: "<div />" });
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/views/launcher"] }),
      routes: [
        {
          path: "/views/launcher",
          name: "launcher",
          component: Placeholder,
        },
      ],
    });
    installAssistantLauncherNavigation(router);
    await router.push("/views/launcher");
    await nextTick();

    const wrapper = mount(AssistantLauncherPage, {
      global: {
        plugins: [router],
      },
      attachTo: document.body,
    });

    const tile = wrapper.find(".assistant-launcher__tile");
    expect(tile.exists()).toBe(true);
    expect(wrapper.find(".assistant-launcher__back").exists()).toBe(false);
    await tile.trigger("click");
    expect(openSpy).toHaveBeenCalledWith("board.main");
    wrapper.unmount();
  });
});
