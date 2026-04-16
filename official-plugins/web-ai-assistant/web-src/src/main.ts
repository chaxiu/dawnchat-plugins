import { installAssistantLauncherNavigation } from "@dawnchat/assistant-core/view";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "@dawnchat/assistant-core/style.css";
import "./style.css";

installAssistantLauncherNavigation(router);

createApp(App).use(router).mount("#app");
