import { createRouter, createWebHistory } from "vue-router";
import {
  AssistantLauncherPage,
  RegisteredViewRoute,
  listViewRegistrations,
} from "@dawnchat/assistant-core/view";

import WebAssistantShell from "../layouts/WebAssistantShell.vue";
import { installWebAssistantViewRegistry } from "../runtime/viewRegistry";
import ViewsShell from "../views/ViewsShell.vue";
import { resolveSitesHistoryBase } from "./historyBase";
import { ROUTE_PATHS } from "./routes";

installWebAssistantViewRegistry();

const viewRoutes = listViewRegistrations().map((registration) => ({
  path: registration.route.path,
  name: registration.route.name,
  component: RegisteredViewRoute,
  props: {
    viewId: registration.view_id,
  },
  meta: {
    title: registration.title,
    viewId: registration.view_id,
  },
}));

export const router = createRouter({
  history: createWebHistory(resolveSitesHistoryBase()),
  routes: [
    {
      path: "/",
      component: WebAssistantShell,
      children: [
        {
          path: "",
          redirect: ROUTE_PATHS.launcher,
        },
        {
          path: "views",
          component: ViewsShell,
          children: [
            {
              path: "launcher",
              name: "web-assistant-launcher",
              component: AssistantLauncherPage,
            },
            ...viewRoutes,
          ],
        },
      ],
    },
  ],
});
