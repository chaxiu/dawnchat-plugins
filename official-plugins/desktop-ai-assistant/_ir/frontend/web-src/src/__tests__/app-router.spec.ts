import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { nextTick } from "vue";

vi.mock("../runtime/bootstrap", () => ({
  installAssistantRuntimeCapabilities: () => [],
  uninstallAssistantRuntimeCapabilities: () => {},
}));

vi.mock("@dawnchat/assistant-core/view", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dawnchat/assistant-core/view")>();
  return {
    ...actual,
    AssistantLauncherFab: defineComponent({
      name: "AssistantLauncherFabStub",
      template: "<span data-testid=\"launcher-fab-stub\" />",
    }),
  };
});

import App from "../App.vue";
import { useGuideState } from "../runtime/guide/state";
import { useSessionVisualState } from "../runtime/session/visualState";
import { useViewState } from "../runtime/view";
import HomeAssistantPage from "../views/pages/home/HomeAssistantPage.vue";
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

    const LauncherStub = defineComponent({
      name: "LauncherStub",
      template: '<div data-testid="launcher-page-stub">Launcher</div>',
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", redirect: "/views/launcher" },
        {
          path: "/views",
          component: HomeAssistantPage,
          children: [
            {
              path: "launcher",
              name: "assistant-launcher",
              component: LauncherStub,
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

    expect(wrapper.find('[data-testid="launcher-page-stub"]').exists()).toBe(true);

    await router.push({ name: "view-word-main" });
    await router.isReady();
    await nextTick();
    expect(router.currentRoute.value.name).toBe("view-word-main");

    expect(wrapper.find('[data-testid="launcher-page-stub"]').exists()).toBe(false);
    vi.restoreAllMocks();
    (globalThis as any).Path2D = originalPath2D;
  });
});
