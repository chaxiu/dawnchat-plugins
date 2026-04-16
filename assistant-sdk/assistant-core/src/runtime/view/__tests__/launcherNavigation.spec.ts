import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import {
  hasLauncherBackTarget,
  installAssistantLauncherNavigation,
  launcherContentExitFullPath,
  normalizeAssistantNavKey,
  resetLauncherContentExitForTests,
} from "../launcherNavigation";
import { ASSISTANT_LAUNCHER_ROUTE, ASSISTANT_SPLASH_ROUTE } from "../assistantNavigationRoutes";

describe("launcherNavigation", () => {
  beforeEach(() => {
    resetLauncherContentExitForTests();
  });

  it("normalizes hash-mode paths for comparison", () => {
    expect(normalizeAssistantNavKey("/#/views/board/main")).toBe("/views/board/main");
    expect(normalizeAssistantNavKey("/views/board/main?x=1")).toBe("/views/board/main");
  });

  it("tracks last non-launcher route via afterEach", async () => {
    const Stub = defineComponent({ template: "<div />" });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/views/splash", component: Stub },
        { path: ASSISTANT_LAUNCHER_ROUTE, component: Stub },
        { path: "/views/board/main", component: Stub },
      ],
    });
    installAssistantLauncherNavigation(router);
    await router.push("/views/splash");
    await nextTick();
    expect(launcherContentExitFullPath.value).toBeNull();
    await router.push("/views/board/main");
    await nextTick();
    expect(launcherContentExitFullPath.value).toBe("/views/board/main");
    await router.push(ASSISTANT_LAUNCHER_ROUTE);
    await nextTick();
    expect(launcherContentExitFullPath.value).toBe("/views/board/main");
  });

  it("hasLauncherBackTarget is false on launcher with no prior content", async () => {
    const Stub = defineComponent({ template: "<div />" });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: ASSISTANT_LAUNCHER_ROUTE, component: Stub },
        { path: "/views/board/main", component: Stub },
      ],
    });
    installAssistantLauncherNavigation(router);
    await router.push(ASSISTANT_LAUNCHER_ROUTE);
    await nextTick();
    expect(hasLauncherBackTarget(router)).toBe(false);
    await router.push("/views/board/main");
    await nextTick();
    await router.push(ASSISTANT_LAUNCHER_ROUTE);
    await nextTick();
    expect(hasLauncherBackTarget(router)).toBe(true);
  });

  it("does not treat splash as a content exit target", async () => {
    const Stub = defineComponent({ template: "<div />" });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: ASSISTANT_SPLASH_ROUTE, component: Stub },
        { path: "/views/word/main", component: Stub },
      ],
    });
    installAssistantLauncherNavigation(router);
    await router.push(ASSISTANT_SPLASH_ROUTE);
    await nextTick();
    expect(launcherContentExitFullPath.value).toBeNull();
    await router.push("/views/word/main");
    await nextTick();
    expect(launcherContentExitFullPath.value).toBe("/views/word/main");
  });
});
