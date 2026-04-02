import type { ViewOperationFailure, ViewOpenSuccess, ViewResourceBinding } from "../../../runtime/view";
import { ARTICLE_DEFAULT_RESOURCE, cloneArticleResource } from "./articleMain.contract";

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

export function buildArticleResourceId(title: string): string {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized ? `article:${normalized}` : "article:workspace";
}

export function validateArticleResource(payload: Record<string, unknown>): ViewResourceBinding | ViewOperationFailure {
  if (Object.keys(payload).length === 0) {
    return cloneArticleResource(ARTICLE_DEFAULT_RESOURCE);
  }

  const resourceType = typeof payload.resource_type === "string" && payload.resource_type.trim()
    ? payload.resource_type.trim()
    : "article";
  if (resourceType !== "article") {
    return buildOperationError(
      "invalid_view_resource",
      "article.main requires resource.resource_type to be 'article'"
    );
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) {
    return buildOperationError(
      "invalid_view_resource",
      "article.main requires resource.title to be a non-empty string"
    );
  }

  const rawData = payload.data;
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return buildOperationError(
      "invalid_view_resource",
      "article.main requires resource.data to be an object"
    );
  }

  const data = toRecord(rawData);
  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  if (!summary) {
    return buildOperationError(
      "invalid_view_resource",
      "article.main requires resource.data.summary to be a non-empty string"
    );
  }

  const sectionsInput = data.sections;
  if (
    sectionsInput !== undefined
    && (!Array.isArray(sectionsInput) || sectionsInput.some((item) => typeof item !== "string"))
  ) {
    return buildOperationError(
      "invalid_view_resource",
      "article.main requires resource.data.sections to be a string array when provided"
    );
  }

  const annotationsInput = data.annotations;
  if (
    annotationsInput !== undefined
    && (!Array.isArray(annotationsInput) || annotationsInput.some((item) => typeof item !== "string"))
  ) {
    return buildOperationError(
      "invalid_view_resource",
      "article.main requires resource.data.annotations to be a string array when provided"
    );
  }

  const tagsInput = data.tags;
  if (
    tagsInput !== undefined
    && (!Array.isArray(tagsInput) || tagsInput.some((item) => typeof item !== "string"))
  ) {
    return buildOperationError(
      "invalid_view_resource",
      "article.main requires resource.data.tags to be a string array when provided"
    );
  }

  return {
    resource_type: "article",
    resource_id: typeof payload.resource_id === "string" && payload.resource_id.trim()
      ? payload.resource_id.trim()
      : buildArticleResourceId(title),
    title,
    data: {
      summary,
      sections: sectionsInput !== undefined
        ? toStringArray(sectionsInput)
        : toStringArray(ARTICLE_DEFAULT_RESOURCE.data.sections),
      annotations: annotationsInput !== undefined
        ? toStringArray(annotationsInput)
        : toStringArray(ARTICLE_DEFAULT_RESOURCE.data.annotations),
      tags: tagsInput !== undefined
        ? toStringArray(tagsInput)
        : toStringArray(ARTICLE_DEFAULT_RESOURCE.data.tags),
    },
  };
}

export function openArticleMainView(payload: Record<string, unknown>): ViewOpenSuccess | ViewOperationFailure {
  const input = toRecord(payload);
  const rawResource = toRecord(input.resource);
  const normalizedResource = validateArticleResource(rawResource);
  if (isViewOperationFailure(normalizedResource)) {
    return normalizedResource;
  }
  const initialAnchor = typeof input.initial_anchor === "string" ? input.initial_anchor.trim() : "";
  return {
    resource: normalizedResource,
    activeAnchor: initialAnchor || "article.header",
    data: {
      status: "applied",
      resource_id: normalizedResource.resource_id || "",
    },
  };
}
