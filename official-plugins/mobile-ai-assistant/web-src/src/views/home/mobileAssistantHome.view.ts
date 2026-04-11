import { defineView } from "@dawnchat/assistant-core/view";

import MobileAssistantHomeView from "./MobileAssistantHomeView.vue";

export const MOBILE_ASSISTANT_HOME_VIEW_ID = "mobile.assistant.home";

export const mobileAssistantHomeView = defineView({
  view_id: MOBILE_ASSISTANT_HOME_VIEW_ID,
  resource_type: "mobile.assistant.workspace",
  title: "Assistant workspace",
  component: MobileAssistantHomeView,
  state_mode: "lightweight",
  default_resource: {
    resource_type: "mobile.assistant.workspace",
    title: "Assistant workspace",
    data: {
      section: "home",
    },
  },
  anchors: [
    {
      id: "workspace.hero",
      title: "Workspace hero",
      description: "Overview of the assistant instance, routing, and capability flow on mobile.",
    },
    {
      id: "workspace.catalog",
      title: "View catalog",
      description: "Links to other registered assistant-core views that the runtime can open.",
    },
  ],
  interaction_hints: {
    interaction_intent: "Use this home view as an overview before switching into a more specialized assistant scene.",
    recommended_mode: "direct_capability",
    decision_rule: "Stay on the home view for overview or onboarding. Switch to another scene with view.open before requesting scene-specific state or actions.",
  },
  getStateSummary: (resource, activeAnchor) => ({
    title: resource.title || "Assistant workspace",
    active_anchor: activeAnchor || "workspace.hero",
    section: resource.data.section || "home",
  }),
});
