import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, nextTick } from "vue";

import App from "../App.vue";
import { useGuideState } from "../runtime/guideState";
import { useViewState } from "../runtime/viewState";
import HomeAssistantPage from "../views/pages/home/HomeAssistantPage.vue";
import WordMainView from "../views/pages/word/WordMainView.vue";

const Playground = defineComponent({
  template: "<div>Playground Page</div>",
});

describe("app router shell", () => {
  it("renders route navigation and switches pages", async () => {
    useGuideState().clearCurrentCard();
    useGuideState().setActiveTip(null);
    useGuideState().setNarrationState({
      status: "idle",
      text: "",
      updatedAtMs: Date.now(),
    });
    useViewState().clearViewState();

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", redirect: "/views/word/main" },
        {
          path: "/views",
          component: HomeAssistantPage,
          children: [
            {
              path: "word/main",
              component: WordMainView,
            },
          ],
        },
        { path: "/playground", component: Playground },
      ],
    });
    router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain("Desktop AI Assistant");
    expect(wrapper.text()).toContain("Word View Ready");

    await router.push("/playground");
    await nextTick();

    expect(wrapper.text()).toContain("Playground Page");
  });
});
