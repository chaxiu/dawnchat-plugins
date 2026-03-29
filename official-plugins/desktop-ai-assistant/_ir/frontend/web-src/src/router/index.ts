import { createRouter, createWebHistory } from "vue-router";

import HomeAssistantPage from "../views/pages/home/HomeAssistantPage.vue";
import PlaygroundPage from "../views/pages/playground/PlaygroundPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeAssistantPage,
    },
    {
      path: "/playground",
      name: "playground",
      component: PlaygroundPage,
    },
  ],
});
