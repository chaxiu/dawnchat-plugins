import { createRouter, createWebHistory } from "vue-router";
import { RegisteredViewRoute, listViewRegistrations } from "@dawnchat/assistant-core/view";

import WebAssistantShell from "../layouts/WebAssistantShell.vue";
import {
  getDefaultWebAssistantViewPath,
  installWebAssistantViewRegistry,
} from "../runtime/viewRegistry";
import ViewsShell from "../views/ViewsShell.vue";

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
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: WebAssistantShell,
      children: [
        {
          path: "",
          redirect: getDefaultWebAssistantViewPath(),
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
