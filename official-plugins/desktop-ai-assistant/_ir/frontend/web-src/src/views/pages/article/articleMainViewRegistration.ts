import ArticleMainView from "./ArticleMainView.vue";
import type { ViewRegistration } from "../../../runtime/view";
import {
  buildArticleMainStateSummary,
  invokeArticleMainCapability,
} from "./articleMain.capabilities";
import {
  ARTICLE_DEFAULT_RESOURCE,
  cloneArticleResource,
  createArticleMainManifest,
} from "./articleMain.contract";
import { openArticleMainView } from "./articleMain.resource";

export const articleMainViewRegistration: ViewRegistration = {
  manifest: createArticleMainManifest(),
  route: {
    path: "article/main",
    name: "view-article-main",
    component: ArticleMainView,
  },
  createDefaultResource: () => cloneArticleResource(ARTICLE_DEFAULT_RESOURCE),
  open: openArticleMainView,
  invokeCapability: invokeArticleMainCapability,
  buildStateSummary: buildArticleMainStateSummary,
};
