import type { ViewManifest, ViewResourceBinding } from "../../../runtime/view";

export const ARTICLE_DEFAULT_RESOURCE: ViewResourceBinding = {
  resource_type: "article",
  resource_id: "article:assistant-runtime",
  title: "AI Runtime Notes",
  data: {
    summary: "用最小阅读场景验证 AI workspace 模板是否可扩展。",
    sections: [
      "Phase 9 先硬化模板 contract，再验证第二场景接入。",
      "目标不是做文章产品，而是验证 runtime 核心无需改写。",
    ],
    annotations: ["Keep scene minimal", "Validate workspace slice reuse"],
    tags: ["architecture", "validation"],
  },
};

const ARTICLE_STATE_SUMMARY_SCHEMA = {
  type: "object" as const,
  properties: {
    resource_title: { type: "string" },
    has_summary: { type: "boolean" },
    section_count: { type: "number" },
    annotation_count: { type: "number" },
    active_anchor: { type: "string" },
  },
  required: [
    "resource_title",
    "has_summary",
    "section_count",
    "annotation_count",
    "active_anchor",
  ],
};

export function createArticleMainManifest(): ViewManifest {
  return {
    view_id: "article.main",
    resource_type: "article",
    title: "Article Workspace",
    route_name: "view-article-main",
    route_path: "/views/article/main",
    state_mode: "lightweight",
    anchors: [
      { id: "article.header", title: "Header", description: "文章标题与标签区域" },
      { id: "article.summary", title: "Summary", description: "文章摘要区域" },
      { id: "article.body", title: "Body", description: "正文段落阅读区域" },
      { id: "article.annotations", title: "Annotations", description: "附注与观察记录区域" },
    ],
    capabilities: [
      {
        id: "highlight_summary",
        title: "Highlight Summary",
        description: "将页面焦点切换到摘要区域",
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
        affected_anchors: ["article.summary"],
      },
      {
        id: "append_annotation",
        title: "Append Annotation",
        description: "向当前文章追加附注",
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
        affected_anchors: ["article.annotations"],
        error_codes: ["invalid_view_capability_input"],
      },
      {
        id: "set_title",
        title: "Set Title",
        description: "更新当前文章标题",
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
        affected_anchors: ["article.header"],
        error_codes: ["invalid_view_capability_input"],
      },
    ],
    resource_contract: {
      resource_schema: {
        type: "object",
        properties: {
          resource_type: { type: "string", enum: ["article"] },
          resource_id: { type: "string" },
          title: { type: "string" },
          data: {
            type: "object",
            properties: {
              summary: { type: "string", minLength: 1 },
              sections: {
                type: "array",
                items: { type: "string" },
              },
              annotations: {
                type: "array",
                items: { type: "string" },
              },
              tags: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["summary"],
          },
        },
        required: ["resource_type", "title", "data"],
      },
      open_payload_schema: {
        type: "object",
        properties: {
          view_id: { type: "string", const: "article.main" },
          resource: {
            type: "object",
            properties: {
              resource_type: { type: "string", enum: ["article"] },
              resource_id: { type: "string" },
              title: { type: "string", minLength: 1 },
              data: {
                type: "object",
                properties: {
                  summary: { type: "string", minLength: 1 },
                  sections: {
                    type: "array",
                    items: { type: "string" },
                  },
                  annotations: {
                    type: "array",
                    items: { type: "string" },
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["summary"],
              },
            },
            required: ["resource_type", "title", "data"],
          },
          initial_anchor: { type: "string" },
        },
        required: ["view_id", "resource"],
      },
      default_resource: cloneArticleResource(ARTICLE_DEFAULT_RESOURCE),
      error_codes: ["invalid_view_resource", "anchor_not_found"],
    },
    state_summary_schema: ARTICLE_STATE_SUMMARY_SCHEMA,
  };
}

export function cloneArticleResource(resource: ViewResourceBinding): ViewResourceBinding {
  return {
    resource_type: resource.resource_type,
    resource_id: resource.resource_id,
    title: resource.title,
    data: JSON.parse(JSON.stringify(resource.data)) as Record<string, unknown>,
  };
}
