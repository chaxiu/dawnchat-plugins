import WordMainView from "./WordMainView.vue";
import type {
  ViewOperationFailure,
  ViewRegistration,
  ViewResourceBinding,
} from "../../../runtime/viewManifest";

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
}

function cloneResource(resource: ViewResourceBinding): ViewResourceBinding {
  return {
    resource_type: resource.resource_type,
    resource_id: resource.resource_id,
    title: resource.title,
    data: JSON.parse(JSON.stringify(resource.data)) as Record<string, unknown>,
  };
}

function buildOperationError(
  errorCode: string,
  message: string,
  data?: Record<string, unknown>
): ViewOperationFailure {
  return {
    ok: false,
    error_code: errorCode,
    message,
    data,
  };
}

function isViewOperationFailure(
  value: ViewResourceBinding | ViewOperationFailure
): value is ViewOperationFailure {
  return "ok" in value && value.ok === false;
}

function buildWordResourceId(word: string): string {
  const normalized = word.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized ? `word:${normalized}` : "word:assistant";
}

const WORD_DEFAULT_RESOURCE: ViewResourceBinding = {
  resource_type: "word",
  resource_id: "word:assistant",
  title: "词汇讲解",
  data: {
    word: "Assistant",
    meaning: "你的自进化智能助理",
    etymology: ["支持富媒体呈现", "支持代码级进化"],
  },
};

function validateWordResource(payload: Record<string, unknown>): ViewResourceBinding | ViewOperationFailure {
  if (Object.keys(payload).length === 0) {
    return cloneResource(WORD_DEFAULT_RESOURCE);
  }

  const resourceType = typeof payload.resource_type === "string" && payload.resource_type.trim()
    ? payload.resource_type.trim()
    : "word";
  if (resourceType !== "word") {
    return buildOperationError(
      "invalid_view_resource",
      "word.main requires resource.resource_type to be 'word'"
    );
  }

  const rawData = payload.data;
  if (rawData !== undefined && (!rawData || typeof rawData !== "object" || Array.isArray(rawData))) {
    return buildOperationError(
      "invalid_view_resource",
      "word.main requires resource.data to be an object"
    );
  }

  const data = toRecord(rawData);
  const word = typeof data.word === "string" ? data.word.trim() : "";
  if (!word) {
    return buildOperationError(
      "invalid_view_resource",
      "word.main requires resource.data.word to be a non-empty string"
    );
  }

  const meaningInput = data.meaning;
  if (meaningInput !== undefined && typeof meaningInput !== "string") {
    return buildOperationError(
      "invalid_view_resource",
      "word.main requires resource.data.meaning to be a string when provided"
    );
  }

  const etymologyInput = data.etymology;
  if (etymologyInput !== undefined && (!Array.isArray(etymologyInput) || etymologyInput.some((item) => typeof item !== "string"))) {
    return buildOperationError(
      "invalid_view_resource",
      "word.main requires resource.data.etymology to be a string array when provided"
    );
  }

  const meaning = typeof meaningInput === "string" && meaningInput.trim()
    ? meaningInput.trim()
    : String(WORD_DEFAULT_RESOURCE.data.meaning || "");
  const etymology = etymologyInput !== undefined
    ? toStringArray(etymologyInput)
    : toStringArray(WORD_DEFAULT_RESOURCE.data.etymology);
  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.trim()
    : `${word} Workspace`;
  const resourceId = typeof payload.resource_id === "string" && payload.resource_id.trim()
    ? payload.resource_id.trim()
    : buildWordResourceId(word);

  return {
    resource_type: "word",
    resource_id: resourceId,
    title,
    data: {
      word,
      meaning,
      etymology,
    },
  };
}

export const wordMainViewRegistration: ViewRegistration = {
  manifest: {
    view_id: "word.main",
    resource_type: "word",
    title: "Word Workspace",
    route_name: "view-word-main",
    route_path: "/views/word/main",
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
      default_resource: cloneResource(WORD_DEFAULT_RESOURCE),
      error_codes: ["invalid_view_resource", "anchor_not_found"],
    },
  },
  route: {
    path: "word/main",
    name: "view-word-main",
    component: WordMainView,
  },
  createDefaultResource: () => cloneResource(WORD_DEFAULT_RESOURCE),
  open: (payload) => {
    const input = toRecord(payload);
    const rawResource = toRecord(input.resource);
    const normalizedResource = validateWordResource(rawResource);
    if (isViewOperationFailure(normalizedResource)) {
      return normalizedResource;
    }
    const initialAnchor = typeof input.initial_anchor === "string" ? input.initial_anchor.trim() : "";
    return {
      resource: normalizedResource,
      activeAnchor: initialAnchor || "word.header",
      data: {
        status: "applied",
        resource_id: normalizedResource.resource_id || "",
      },
    };
  },
  invokeCapability: (capabilityId, input, resource) => {
    const nextResource = cloneResource(resource);
    if (capabilityId === "highlight_meaning") {
      return {
        activeAnchor: "word.meaning",
        data: {
          status: "applied",
          highlighted_anchor: "word.meaning",
        },
      };
    }
    if (capabilityId === "append_etymology") {
      const items = toStringArray(input.items);
      if (items.length === 0) {
        return buildOperationError(
          "invalid_view_capability_input",
          "append_etymology requires input.items to be a non-empty string array"
        );
      }
      const previousItems = toStringArray(nextResource.data.etymology);
      nextResource.data = {
        ...nextResource.data,
        etymology: [...previousItems, ...items],
      };
      return {
        resource: nextResource,
        activeAnchor: "word.etymology",
        data: {
          status: "applied",
          appended_count: items.length,
          appended_items: items,
        },
      };
    }
    if (capabilityId === "set_title") {
      const title = typeof input.title === "string" ? input.title.trim() : "";
      if (!title) {
        return buildOperationError(
          "invalid_view_capability_input",
          "set_title requires input.title to be a non-empty string"
        );
      }
      nextResource.title = title;
      return {
        resource: nextResource,
        activeAnchor: "word.header",
        data: {
          status: "applied",
          title: nextResource.title || "",
        },
      };
    }
    return buildOperationError(
      "view_capability_not_found",
      `View capability not found: ${capabilityId}`
    );
  },
  buildStateSummary: (resource, activeAnchor) => {
    const word = String(resource.data.word || "").trim();
    const meaning = String(resource.data.meaning || "").trim();
    const etymology = toStringArray(resource.data.etymology);
    return {
      resource_title: resource.title || "",
      word,
      has_meaning: Boolean(meaning),
      etymology_count: etymology.length,
      active_anchor: activeAnchor || "",
    };
  },
};
