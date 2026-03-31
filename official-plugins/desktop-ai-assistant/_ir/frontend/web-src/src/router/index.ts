import { createRouter, createWebHistory } from "vue-router";

import { listViewRegistrations } from "../runtime/viewRegistry";
import HomeAssistantPage from "../views/pages/home/HomeAssistantPage.vue";
import PlaygroundPage from "../views/pages/playground/PlaygroundPage.vue";

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
      redirect: "/views/word/main",
    },
    {
      path: "/views",
      name: "views",
      component: HomeAssistantPage,
      children: viewRoutes,
    },
    {
      path: "/playground",
      name: "playground",
      component: PlaygroundPage,
    },
  ],
});
