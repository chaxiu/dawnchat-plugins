import WordMainView from "./WordMainView.vue";
import {
  defineView,
  type ViewOpenSuccess,
  type ViewOperationFailure,
  type ViewPersistenceConfig,
  type ViewPersistenceStateSnapshot,
  type ViewResourceBinding,
} from "../../../runtime/view/manifest";
import {
  buildOperationError,
  cloneViewResource,
  isViewOperationFailure,
  toRecord,
  toStringArray,
} from "../../shared/viewUtils";
import { buildWordMainStateSummary, invokeWordMainCapability } from "./wordMain.capabilities";

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

export function cloneWordResource(resource: ViewResourceBinding): ViewResourceBinding {
  return cloneViewResource(resource);
}

export function buildWordResourceId(word: string): string {
  const normalized = word.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized ? `word:${normalized}` : "word:assistant";
}

export function normalizeWordResource(
  payload: Record<string, unknown>
): ViewResourceBinding | ViewOperationFailure {
  if (Object.keys(payload).length === 0) {
    return cloneWordResource(WORD_DEFAULT_RESOURCE);
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
  if (
    etymologyInput !== undefined
    && (!Array.isArray(etymologyInput) || etymologyInput.some((item) => typeof item !== "string"))
  ) {
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

export function openWordMainView(payload: Record<string, unknown>): ViewOpenSuccess | ViewOperationFailure {
  const input = toRecord(payload);
  const normalizedResource = normalizeWordResource(toRecord(input.resource));
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
}

function buildPersistenceWordResourceId(word: string): string {
  const normalized = word.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized ? `word:${normalized}` : "word:assistant";
}

export const wordMainPersistence: ViewPersistenceConfig = {
  version: 1,
  debounce_ms: 150,
  getResourceKey: (resource) => {
    if (typeof resource.resource_id === "string" && resource.resource_id.trim()) {
      return resource.resource_id.trim();
    }
    return buildPersistenceWordResourceId(String(resource.data.word || ""));
  },
  serialize: (snapshot: ViewPersistenceStateSnapshot) => ({
    resource: cloneWordResource(snapshot.resource),
    active_anchor: snapshot.activeAnchor || "",
  }),
  deserialize: (payload) => {
    const rawResource = payload.resource && typeof payload.resource === "object" && !Array.isArray(payload.resource)
      ? payload.resource as Record<string, unknown>
      : {};
    const rawData = rawResource.data && typeof rawResource.data === "object" && !Array.isArray(rawResource.data)
      ? rawResource.data as Record<string, unknown>
      : {};
    const word = typeof rawData.word === "string" && rawData.word.trim()
      ? rawData.word.trim()
      : String(WORD_DEFAULT_RESOURCE.data.word || "");
    const meaning = typeof rawData.meaning === "string"
      ? rawData.meaning.trim()
      : String(WORD_DEFAULT_RESOURCE.data.meaning || "");
    const etymology = Array.isArray(rawData.etymology)
      ? rawData.etymology.map((item) => String(item || "").trim()).filter((item) => item.length > 0)
      : JSON.parse(JSON.stringify(WORD_DEFAULT_RESOURCE.data.etymology)) as string[];
    const resource = cloneWordResource({
      resource_type: "word",
      resource_id: typeof rawResource.resource_id === "string" && rawResource.resource_id.trim()
        ? rawResource.resource_id.trim()
        : buildPersistenceWordResourceId(word),
      title: typeof rawResource.title === "string" && rawResource.title.trim()
        ? rawResource.title.trim()
        : String(WORD_DEFAULT_RESOURCE.title || `${word} Workspace`),
      data: {
        word,
        meaning,
        etymology,
      },
    });
    return {
      resource,
      activeAnchor: typeof payload.active_anchor === "string" ? payload.active_anchor.trim() : "",
    };
  },
};

export const wordMainView = defineView({
  view_id: "word.main",
  resource_type: "word",
  title: "Word Workspace",
  component: WordMainView,
  state_mode: "stateful",
  default_resource: WORD_DEFAULT_RESOURCE,
  anchors: [
    { id: "word.header", title: "Header", description: "Word title and overview area." },
    { id: "word.meaning", title: "Meaning", description: "Primary meaning and explanation area." },
    { id: "word.etymology", title: "Etymology", description: "Etymology and extension notes area." },
  ],
  capabilities: [
    {
      id: "highlight_meaning",
      mode: "read",
      title: "Highlight Meaning",
      description: "Move the current page focus to the meaning section.",
      assistant_hint: "Use this when you only need to shift attention to the meaning area.",
      input_schema: {
        type: "object",
        properties: {},
      },
      affected_anchors: ["word.meaning"],
    },
    {
      id: "append_etymology",
      mode: "write",
      title: "Append Etymology",
      description: "Append new entries to the etymology list.",
      assistant_hint: "Use this for incremental etymology or extension updates.",
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
      affected_anchors: ["word.etymology"],
      error_codes: ["invalid_view_capability_input"],
    },
    {
      id: "set_title",
      mode: "write",
      title: "Set Title",
      description: "Update the current page title.",
      assistant_hint: "Use this when the page theme or display name changes.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1 },
        },
        required: ["title"],
      },
      affected_anchors: ["word.header"],
      error_codes: ["invalid_view_capability_input"],
    },
  ],
  interaction_hints: {
    interaction_intent: "Best for direct view-first reading and small structured updates. This is not the default scene for session-driven or wait-heavy orchestration.",
    recommended_mode: "direct_capability",
    decision_rule: "Use direct capabilities for lightweight reads and writes. Only switch to session.start when guide narration must be serialized with page actions.",
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
              view_id: "word.main",
              resource: {
                resource_type: "word",
                data: {
                  word: "Assistant",
                },
              },
              initial_anchor: "word.header",
            },
          },
        },
        then: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "assistant.view.describe",
            input: {
              view_id: "word.main",
            },
          },
        },
      },
      {
        name: "direct_append_etymology",
        mode: "direct_capability",
        call: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "view.capability.invoke",
            input: {
              view_id: "word.main",
              capability_id: "append_etymology",
              input: {
                items: ["支持代码级进化"],
              },
            },
          },
        },
      },
    ],
    key_events: [
      {
        type: "assistant.view.state.applied",
        description: "Emitted after successful view.open, view.focus, or view.capability.invoke operations. Treat it as a lightweight observation event, not as the main wait surface for this scene.",
        match_fields: ["view_id", "active_anchor", "resource_id"],
      },
    ],
  },
  persistence: wordMainPersistence,
  open: openWordMainView,
  normalizeResource: normalizeWordResource,
  invokeCapability: invokeWordMainCapability,
  getStateSummary: buildWordMainStateSummary,
});
