import { createRouter, createWebHistory } from "vue-router";

import { listViewRegistrations } from "../runtime/view";
import HomeAssistantPage from "../views/pages/home/HomeAssistantPage.vue";
import PlaygroundPage from "../views/pages/playground/PlaygroundPage.vue";
import AssistantWelcomePage from "../views/pages/welcome/AssistantWelcomePage.vue";

const viewRoutes = listViewRegistrations().map((registration) => ({
  path: registration.route.path,
  name: registration.route.name,
  component: registration.route.component,
}));

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/views/welcome",
    },
    {
      path: "/views",
      name: "views",
      component: HomeAssistantPage,
      children: [
        {
          path: "welcome",
          name: "assistant-welcome",
          component: AssistantWelcomePage,
        },
        ...viewRoutes,
      ],
    },
    {
      path: "/playground",
      name: "playground",
      component: PlaygroundPage,
    },
  ],
});
