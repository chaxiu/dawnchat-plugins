import { createRouter, createWebHistory } from "vue-router";
import { listViewRegistrations } from "@dawnchat/assistant-core/view";

import AssistantChatPage from "../views/chat/AssistantChatPage.vue";
import ViewsShell from "../views/ViewsShell.vue";

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
      redirect: "/chat",
    },
    {
      path: "/chat",
      name: "assistant-chat",
      component: AssistantChatPage,
    },
    {
      path: "/views",
      component: ViewsShell,
      children: viewRoutes,
    },
  ],
});
