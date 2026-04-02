import type { ViewManifest, ViewResourceBinding } from "../../../runtime/view";

export const WORD_DEFAULT_RESOURCE: ViewResourceBinding = {
  resource_type: "word",
  resource_id: "word:assistant",
  title: "词汇讲解",
  data: {
    word: "Assistant",
    meaning: "你的自进化智能助理",
    etymology: ["支持富媒体呈现", "支持代码级进化"],
  },
};

const WORD_STATE_SUMMARY_SCHEMA = {
  type: "object" as const,
  properties: {
    resource_title: { type: "string" },
    word: { type: "string" },
    has_meaning: { type: "boolean" },
    etymology_count: { type: "number" },
    active_anchor: { type: "string" },
  },
  required: ["resource_title", "word", "has_meaning", "etymology_count", "active_anchor"],
};

export function createWordMainManifest(): ViewManifest {
  return {
    view_id: "word.main",
    resource_type: "word",
    title: "Word Workspace",
    route_name: "view-word-main",
    route_path: "/views/word/main",
    state_mode: "lightweight",
    anchors: [
      { id: "word.header", title: "Header", description: "单词标题与概览区域" },
      { id: "word.meaning", title: "Meaning", description: "单词释义与讲解重点区域" },
      { id: "word.etymology", title: "Etymology", description: "词源与扩展信息区域" },
    ],
    capabilities: [
      {
        id: "highlight_meaning",
        title: "Highlight Meaning",
        description: "将页面焦点切换到词义区域",
        input_schema: {
          type: "object",
          properties: {},
        },
        output_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            highlighted_anchor: { type: "string" },
          },
          required: ["status", "highlighted_anchor"],
        },
        affected_anchors: ["word.meaning"],
        error_codes: [],
      },
      {
        id: "append_etymology",
        title: "Append Etymology",
        description: "向词源列表追加条目",
        input_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
            },
          },
          required: ["items"],
        },
        output_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            appended_count: { type: "number" },
            appended_items: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["status", "appended_count", "appended_items"],
        },
        affected_anchors: ["word.etymology"],
        error_codes: ["invalid_view_capability_input"],
      },
      {
        id: "set_title",
        title: "Set Title",
        description: "更新当前单词页面标题",
        input_schema: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 1 },
          },
          required: ["title"],
        },
        output_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            title: { type: "string" },
          },
          required: ["status", "title"],
        },
        affected_anchors: ["word.header"],
        error_codes: ["invalid_view_capability_input"],
      },
    ],
    resource_contract: {
      resource_schema: {
        type: "object",
        properties: {
          resource_type: { type: "string", enum: ["word"] },
          resource_id: { type: "string" },
          title: { type: "string" },
          data: {
            type: "object",
            properties: {
              word: { type: "string", minLength: 1 },
              meaning: { type: "string" },
              etymology: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["word"],
          },
        },
        required: ["resource_type", "data"],
      },
      open_payload_schema: {
        type: "object",
        properties: {
          view_id: { type: "string", const: "word.main" },
          resource: {
            type: "object",
            properties: {
              resource_type: { type: "string", enum: ["word"] },
              resource_id: { type: "string" },
              title: { type: "string" },
              data: {
                type: "object",
                properties: {
                  word: { type: "string", minLength: 1 },
                  meaning: { type: "string" },
                  etymology: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["word"],
              },
            },
            required: ["resource_type", "data"],
          },
          initial_anchor: { type: "string" },
        },
        required: ["view_id", "resource"],
      },
      default_resource: cloneWordResource(WORD_DEFAULT_RESOURCE),
      error_codes: ["invalid_view_resource", "anchor_not_found"],
    },
    state_summary_schema: WORD_STATE_SUMMARY_SCHEMA,
  };
}

export function cloneWordResource(resource: ViewResourceBinding): ViewResourceBinding {
  return {
    resource_type: resource.resource_type,
    resource_id: resource.resource_id,
    title: resource.title,
    data: JSON.parse(JSON.stringify(resource.data)) as Record<string, unknown>,
  };
}
