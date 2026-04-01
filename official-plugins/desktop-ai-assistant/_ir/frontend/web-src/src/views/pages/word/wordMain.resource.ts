import type { ViewOperationFailure, ViewOpenSuccess, ViewResourceBinding } from "../../../runtime/viewManifest";
import { cloneWordResource, WORD_DEFAULT_RESOURCE } from "./wordMain.contract";

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

export function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
}

export function buildOperationError(
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

export function isViewOperationFailure(
  value: ViewResourceBinding | ViewOperationFailure
): value is ViewOperationFailure {
  return "ok" in value && value.ok === false;
}

export function buildWordResourceId(word: string): string {
  const normalized = word.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized ? `word:${normalized}` : "word:assistant";
}

export function validateWordResource(payload: Record<string, unknown>): ViewResourceBinding | ViewOperationFailure {
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
}
