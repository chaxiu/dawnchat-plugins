import ImageExplainerMainView from "./ImageExplainerMainView.vue";
import { defineView } from "../../../runtime/view/manifest";
import { invokeImageExplainerMainCapability } from "./capabilities";
import { imageExplainerMainPersistence } from "./model/persistence";
import {
  cloneImageExplainerResource,
  IMAGE_EXPLAINER_DEFAULT_RESOURCE,
  normalizeImageExplainerResource,
  openImageExplainerMainView,
  readImageExplainerResourceData,
  validateImageExplainerResource,
} from "./model/resource";
import { buildImageExplainerMainStateSummary } from "./model/summary";

export {
  cloneImageExplainerResource,
  IMAGE_EXPLAINER_DEFAULT_RESOURCE,
  normalizeImageExplainerResource,
  openImageExplainerMainView,
  readImageExplainerResourceData,
  validateImageExplainerResource,
} from "./model/resource";
export { buildImageExplainerMainStateSummary } from "./model/summary";
export { imageExplainerMainPersistence } from "./model/persistence";
export * from "./model/types";

export const imageExplainerMainView = defineView({
  view_id: "image.explainer",
  resource_type: "image.deck",
  title: "AI Visual Explainer",
  component: ImageExplainerMainView,
  state_mode: "stateful",
  default_resource: IMAGE_EXPLAINER_DEFAULT_RESOURCE,
  anchors: [
    { id: "image.header", title: "Title", description: "Floating title for the current explanation page." },
    { id: "image.stage", title: "Stage", description: "Single-image or split-image stage with overlay highlights." },
  ],
  capabilities: [
    {
      id: "image.set_pages",
      mode: "write",
      title: "Set Pages",
      description: "Replace the current image deck with single-image or split-image pages.",
      assistant_hint: "Use this to initialize or replace the current explanation deck. For image-led teaching, prepare the deck first, then narrate with guide.narrate while switching pages and highlighting regions.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          current_page_index: { type: "number", minimum: 0 },
          pages: {
            type: "array",
            items: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    layout: { type: "string", enum: ["single"] },
                    images: {
                      type: "array",
                      minItems: 1,
                      maxItems: 1,
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          src: { type: "string" },
                          alt: { type: "string" },
                          caption: { type: "string" },
                        },
                        required: ["src"],
                      },
                    },
                  },
                  required: ["layout", "images"],
                },
                {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    layout: { type: "string", enum: ["split"] },
                    images: {
                      type: "array",
                      minItems: 2,
                      maxItems: 2,
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          src: { type: "string" },
                          alt: { type: "string" },
                          caption: { type: "string" },
                        },
                        required: ["src"],
                      },
                    },
                  },
                  required: ["layout", "images"],
                },
              ],
            },
          },
        },
        required: ["pages"],
      },
      affected_anchors: ["image.header", "image.stage"],
      error_codes: ["invalid_view_capability_input"],
    },
    {
      id: "image.show_page",
      mode: "write",
      title: "Show Page",
      description: "Switch to a specific page in the current image deck.",
      assistant_hint: "In narrated image walkthroughs, pair this with guide.narrate and image.highlight_region inside the same session.start sequence.",
      input_schema: {
        type: "object",
        properties: {
          page_index: { type: "number", minimum: 0 },
        },
        required: ["page_index"],
      },
      affected_anchors: ["image.header", "image.stage"],
      error_codes: ["invalid_view_capability_input", "image_page_not_found"],
    },
    {
      id: "image.set_title",
      mode: "write",
      title: "Set Title",
      description: "Update the floating stage title shown on top of the images.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
        },
        required: ["title"],
      },
      affected_anchors: ["image.header"],
      error_codes: ["invalid_view_capability_input"],
    },
    {
      id: "image.highlight_region",
      mode: "write",
      title: "Highlight Region",
      description: "Highlight one or more regions on the current page for guided explanation.",
      assistant_hint: "Prefer relative coordinates from 0 to 1. Use target_image_id to select which image to highlight on split pages.",
      input_schema: {
        type: "object",
        properties: {
          highlights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                target_image_id: { type: "string" },
                shape: { type: "string", enum: ["rect", "circle"] },
                x: { type: "number", minimum: 0, maximum: 1 },
                y: { type: "number", minimum: 0, maximum: 1 },
                width: { type: "number", minimum: 0, maximum: 1 },
                height: { type: "number", minimum: 0, maximum: 1 },
                radius: { type: "number", minimum: 0, maximum: 1 },
                label: { type: "string" },
              },
            },
          },
        },
      },
      affected_anchors: ["image.stage"],
      error_codes: ["invalid_view_capability_input", "image_page_not_found"],
    },
    {
      id: "image.clear_highlight",
      mode: "write",
      title: "Clear Highlight",
      description: "Remove all highlights from the current page.",
      input_schema: {
        type: "object",
        properties: {},
      },
      affected_anchors: ["image.stage"],
    },
    {
      id: "image.get_scene_state",
      mode: "read",
      title: "Get Scene State",
      description: "Read the current page, layout, image count, and highlight count.",
      input_schema: {
        type: "object",
        properties: {},
      },
      affected_anchors: ["image.header", "image.stage"],
    },
  ],
  interaction_hints: {
    interaction_intent: "Best for AI-led visual explanation with one full-screen image or a split two-image comparison page plus focused region highlights.",
    recommended_mode: "session_start",
    decision_rule: "Open the image scene first, then describe it. Pure reads may invoke directly, but image explanation should usually run as session.start so guide.narrate, page switching, and region highlighting stay synchronized.",
    examples: [
      {
        name: "open_then_describe",
        mode: "entry",
        call: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "view.open",
            input: {
              view_id: "image.explainer",
              resource: {},
              initial_anchor: "image.stage",
            },
          },
        },
        then: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "assistant.view.describe",
            input: {
              view_id: "image.explainer",
            },
          },
        },
      },
      {
        name: "session_narrate_show_page_highlight",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "narrate-page-1",
                action: {
                  type: "guide.narrate",
                  payload: {
                    text: "先看这一页，我会先切到目标图片，再高亮关键区域进行讲解。",
                  },
                },
              },
              {
                id: "show-page-1",
                action: {
                  type: "view.capability.invoke",
                  payload: {
                    view_id: "image.explainer",
                    capability_id: "image.show_page",
                    input: {
                      page_index: 1,
                    },
                  },
                },
              },
              {
                id: "highlight-hero",
                action: {
                  type: "view.capability.invoke",
                  payload: {
                    view_id: "image.explainer",
                    capability_id: "image.highlight_region",
                    input: {
                      highlights: [
                        {
                          target_image_id: "<image_id>",
                          shape: "rect",
                          x: 0.48,
                          y: 0.46,
                          width: 0.3,
                          height: 0.22,
                          label: "Focus here",
                        },
                      ],
                    },
                  },
                },
              },
              {
                id: "narrate-focus",
                action: {
                  type: "guide.narrate",
                  payload: {
                    text: "请关注高亮区域，这里是当前图片里最值得解释的视觉重点。",
                  },
                },
              },
            ],
          },
        },
      },
      {
        name: "session_initialize_single_page_deck",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "set-pages",
                action: {
                  type: "view.capability.invoke",
                  payload: {
                    view_id: "image.explainer",
                    capability_id: "image.set_pages",
                    input: {
                      title: "单图讲解",
                      current_page_index: 0,
                      pages: [
                        {
                          id: "page-1",
                          title: "单图页面",
                          layout: "single",
                          images: [
                            {
                              id: "hero",
                              src: "https://example.com/hero.png",
                              alt: "Main visual",
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        name: "session_initialize_split_page_deck",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "set-pages",
                action: {
                  type: "view.capability.invoke",
                  payload: {
                    view_id: "image.explainer",
                    capability_id: "image.set_pages",
                    input: {
                      title: "双图对比讲解",
                      current_page_index: 0,
                      pages: [
                        {
                          id: "page-1",
                          title: "双图页面",
                          layout: "split",
                          images: [
                            {
                              id: "left",
                              src: "https://example.com/left.png",
                              alt: "Left image",
                            },
                            {
                              id: "right",
                              src: "https://example.com/right.png",
                              alt: "Right image",
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        name: "direct_read_scene_state",
        mode: "direct_capability",
        call: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "view.capability.invoke",
            input: {
              view_id: "image.explainer",
              capability_id: "image.get_scene_state",
              input: {},
            },
          },
        },
      },
    ],
  },
  persistence: imageExplainerMainPersistence,
  normalizeResource: validateImageExplainerResource,
  open: openImageExplainerMainView,
  invokeCapability: invokeImageExplainerMainCapability,
  getStateSummary: buildImageExplainerMainStateSummary,
});
