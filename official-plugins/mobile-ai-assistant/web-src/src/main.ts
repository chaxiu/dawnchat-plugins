import { installAssistantLauncherNavigation } from "@dawnchat/assistant-core/view";
import { createApp } from "vue";
import { IonicVue } from "@ionic/vue";
import App from "./App.vue";
import router from "./router";

import "@ionic/vue/css/core.css";
import "@ionic/vue/css/normalize.css";
import "@ionic/vue/css/structure.css";
import "@ionic/vue/css/typography.css";
import "@ionic/vue/css/padding.css";
import "@ionic/vue/css/float-elements.css";
import "@ionic/vue/css/text-alignment.css";
import "@ionic/vue/css/text-transformation.css";
import "@ionic/vue/css/flex-utils.css";
import "@ionic/vue/css/display.css";
import "@ionic/vue/css/palettes/dark.system.css";

import "@dawnchat/assistant-core/style.css";
import "@dawnchat/assistant-chat-ui/style.css";
import "./theme/variables.css";
import "./styles/safe-area.css";
import "./style.css";

const app = createApp(App);
app.use(IonicVue);
app.use(router);

installAssistantLauncherNavigation(router);

void router.isReady().then(() => {
  app.mount("#app");
});
