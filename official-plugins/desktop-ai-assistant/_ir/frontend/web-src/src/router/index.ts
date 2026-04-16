import { createRouter, createWebHistory } from "vue-router";
import {
  ASSISTANT_LAUNCHER_ROUTE,
  AssistantLauncherPage,
  installViewRegistryProvider,
  listViewRegistrations,
} from "@dawnchat/assistant-core/view";

import HomeAssistantPage from "../views/pages/home/HomeAssistantPage.vue";
import { createDesktopViewRegistryProvider } from "../runtime/view/registry";

/**
 * 必须在构建路由表之前注册桌面扩展视图（music / word 等），否则此处调用的
 * {@link listViewRegistrations} 仅有 core 默认视图，子路由里不存在 `/views/music/main`，
 * Launcher 进入钢琴后嵌套 RouterView 为空 → 黑屏。
 * （与 web-ai-assistant 在 router 模块内先调用 `installWebAssistantViewRegistry()` 对齐。）
 */
installViewRegistryProvider(createDesktopViewRegistryProvider());

const viewRoutes = listViewRegistrations().map((registration) => ({
  path: registration.route.path,
  name: registration.route.name,
  component: registration.component,
}));

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: ASSISTANT_LAUNCHER_ROUTE,
    },
    {
      path: "/views",
      name: "views",
      component: HomeAssistantPage,
      children: [
        {
          path: "launcher",
          name: "assistant-launcher",
          component: AssistantLauncherPage,
        },
        ...viewRoutes,
      ],
    },
  ],
});
