import { defineView } from "@dawnchat/assistant-core/view";

import WebAssistantHomeView from "./WebAssistantHomeView.vue";

export const WEB_ASSISTANT_HOME_VIEW_ID = "web.assistant.home";

export const webAssistantHomeView = defineView({
  view_id: WEB_ASSISTANT_HOME_VIEW_ID,
  resource_type: "web.assistant.workspace",
  title: "Assistant Workspace",
  component: WebAssistantHomeView,
  state_mode: "lightweight",
  default_resource: {
    resource_type: "web.assistant.workspace",
    title: "Assistant Workspace",
    data: {
      section: "home",
    },
  },
  anchors: [
    {
      id: "workspace.hero",
      title: "Workspace hero",
      description: "Overview of the current assistant instance, routing, and capability flow.",
    },
    {
      id: "workspace.catalog",
      title: "View catalog",
      description: "Links to other registered assistant-core views that the runtime can open.",
    },
  ],
  interaction_hints: {
    interaction_intent: "Use this home view as the default landing page before switching into a more specialized assistant scene.",
    recommended_mode: "direct_capability",
    decision_rule: "Stay on the home view for overview or onboarding. Switch to another scene with view.open before requesting scene-specific state or actions.",
  },
  getStateSummary: (resource, activeAnchor) => ({
    title: resource.title || "Assistant Workspace",
    active_anchor: activeAnchor || "workspace.hero",
    section: resource.data.section || "home",
  }),
});
