import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { computed, defineComponent } from "vue";
import { nextTick } from "vue";

vi.mock("../runtime/bootstrap", () => ({
  installAssistantRuntimeCapabilities: () => [],
  uninstallAssistantRuntimeCapabilities: () => {},
}));
vi.mock("../components/AssistantOrbLayer.vue", () => {
  return {
    default: defineComponent({
      name: "AssistantOrbLayerStub",
      setup() {
        const route = useRoute();
        const orbState = computed(() => (route.name === "assistant-welcome" ? "hero" : "dock"));
        return { orbState };
      },
      template: "<section class='assistant-orb-layer' :data-orb-state='orbState'></section>",
    }),
  };
});

import App from "../App.vue";
import { useGuideState } from "../runtime/guide/state";
import { useSessionVisualState } from "../runtime/session/visualState";
import { useViewState } from "../runtime/view";
import { useRoute } from "vue-router";
import HomeAssistantPage from "../views/pages/home/HomeAssistantPage.vue";
import AssistantWelcomePage from "../views/pages/welcome/AssistantWelcomePage.vue";
import WordMainView from "../views/pages/word/WordMainView.vue";

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
              name: "view-word-main",
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
        plugins: [router as never],
      },
    });

    expect(wrapper.find(".assistant-orb-layer").attributes("data-orb-state")).toBe("hero");

    await router.push({ name: "view-word-main" });
    await router.isReady();
    await nextTick();
    expect(router.currentRoute.value.name).toBe("view-word-main");

    expect(wrapper.find(".assistant-orb-layer").exists()).toBe(true);
    vi.restoreAllMocks();
    (globalThis as any).Path2D = originalPath2D;
  });
});
