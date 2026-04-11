import { createRouter, createWebHashHistory } from "@ionic/vue-router";
import type { RouteRecordRaw } from "vue-router";
import { RegisteredViewRoute, listViewRegistrations } from "@dawnchat/assistant-core/view";

import MobileAssistantShell from "../layouts/MobileAssistantShell.vue";
import ViewsShell from "../views/ViewsShell.vue";
import MobileAssistantWelcomePage from "../views/welcome/MobileAssistantWelcomePage.vue";
import { installMobileAssistantViewRegistry } from "../runtime/viewRegistry";
import { ROUTE_PATHS } from "./routes";

installMobileAssistantViewRegistry();

const viewRoutes: RouteRecordRaw[] = listViewRegistrations().map((registration) => ({
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

const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.root,
    component: MobileAssistantShell,
    children: [
      {
        path: "",
        redirect: ROUTE_PATHS.welcome,
      },
      {
        path: "welcome",
        name: "mobile-assistant-welcome",
        component: MobileAssistantWelcomePage,
      },
      {
        path: "views",
        component: ViewsShell,
        children: viewRoutes,
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
