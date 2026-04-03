import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { nextTick } from "vue";

import App from "../App.vue";
import { useGuideState } from "../runtime/guide/state";
import { useSessionVisualState } from "../runtime/session/visualState";
import { useViewState } from "../runtime/view";
import HomeAssistantPage from "../views/pages/home/HomeAssistantPage.vue";
import AssistantWelcomePage from "../views/pages/welcome/AssistantWelcomePage.vue";
import WordMainView from "../views/pages/word/WordMainView.vue";
import { ASSISTANT_UI_LAYER_ORB } from "../runtime/assistantUiLayout";

describe("app router shell", () => {
  it("renders route navigation and switches pages", async () => {
    const originalPath2D = (globalThis as any).Path2D;
    (globalThis as any).Path2D = class {
      moveTo() {}
      lineTo() {}
      closePath() {}
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fill: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      globalCompositeOperation: "source-over",
      globalAlpha: 1,
      filter: "none",
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D);
    useGuideState().clearCurrentCard();
    useGuideState().setActiveTip(null);
    useGuideState().setNarrationState({
      status: "idle",
      text: "",
      updatedAtMs: Date.now(),
    });
    useViewState().clearViewState();
    useSessionVisualState().setSessionIdle();

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", redirect: "/views/welcome" },
        {
          path: "/views",
          component: HomeAssistantPage,
          children: [
            {
              path: "welcome",
              name: "assistant-welcome",
              component: AssistantWelcomePage,
            },
            {
              path: "word/main",
              component: WordMainView,
            },
          ],
        },
      ],
    });
    router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain("Hello, I am your AI assistant");
    expect(wrapper.find(".assistant-orb-layer").attributes("data-orb-state")).toBe("hero");
    expect(wrapper.find(".assistant-orb-layer").attributes("style")).toContain(`z-index: ${ASSISTANT_UI_LAYER_ORB};`);

    await router.push("/views/word/main");
    await nextTick();
    expect(wrapper.find(".assistant-orb-layer").attributes("data-orb-state")).toBe("dock");

    expect(wrapper.find('[data-view-id="word.main"]').exists()).toBe(true);
    expect(wrapper.find(".assistant-orb-layer").attributes("data-orb-state")).toBe("dock");
    vi.restoreAllMocks();
    (globalThis as any).Path2D = originalPath2D;
  });
});
