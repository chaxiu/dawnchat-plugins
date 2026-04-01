import WordMainView from "./WordMainView.vue";
import type { ViewRegistration } from "../../../runtime/viewManifest";
import { invokeWordMainCapability, buildWordMainStateSummary } from "./wordMain.capabilities";
import { cloneWordResource, createWordMainManifest, WORD_DEFAULT_RESOURCE } from "./wordMain.contract";
import { openWordMainView } from "./wordMain.resource";

export const wordMainViewRegistration: ViewRegistration = {
  manifest: createWordMainManifest(),
  route: {
    path: "word/main",
    name: "view-word-main",
    component: WordMainView,
  },
  createDefaultResource: () => cloneWordResource(WORD_DEFAULT_RESOURCE),
  open: openWordMainView,
  invokeCapability: invokeWordMainCapability,
  buildStateSummary: buildWordMainStateSummary,
};
