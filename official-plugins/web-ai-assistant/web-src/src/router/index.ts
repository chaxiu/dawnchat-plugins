import { createRouter, createWebHistory } from "vue-router";
import { RegisteredViewRoute, listViewRegistrations } from "@dawnchat/assistant-core/view";

import WebAssistantShell from "../layouts/WebAssistantShell.vue";
import { installWebAssistantViewRegistry } from "../runtime/viewRegistry";
import ViewsShell from "../views/ViewsShell.vue";
import WebAssistantWelcomePage from "../views/welcome/WebAssistantWelcomePage.vue";
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
          redirect: ROUTE_PATHS.welcome,
        },
        {
          path: "welcome",
          name: "web-assistant-welcome",
          component: WebAssistantWelcomePage,
        },
        {
          path: "views",
          component: ViewsShell,
          children: viewRoutes,
        },
      ],
    },
  ],
});
