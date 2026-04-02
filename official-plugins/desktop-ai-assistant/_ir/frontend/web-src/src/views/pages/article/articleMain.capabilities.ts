import type { ViewCapabilityResult, ViewResourceBinding } from "../../../runtime/view";
import { cloneArticleResource } from "./articleMain.contract";
import { buildOperationError } from "./articleMain.resource";

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
}

export function invokeArticleMainCapability(
  capabilityId: string,
  input: Record<string, unknown>,
  resource: ViewResourceBinding
): ViewCapabilityResult {
  const nextResource = cloneArticleResource(resource);
  if (capabilityId === "highlight_summary") {
    return {
      activeAnchor: "article.summary",
      data: {
        status: "applied",
        highlighted_anchor: "article.summary",
      },
    };
  }
  if (capabilityId === "append_annotation") {
    const items = toStringArray(input.items);
    if (items.length === 0) {
      return buildOperationError(
        "invalid_view_capability_input",
        "append_annotation requires input.items to be a non-empty string array"
      );
    }
    const currentAnnotations = toStringArray(nextResource.data.annotations);
    nextResource.data = {
      ...nextResource.data,
      annotations: [...currentAnnotations, ...items],
    };
    return {
      resource: nextResource,
      activeAnchor: "article.annotations",
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
      activeAnchor: "article.header",
      data: {
        status: "applied",
        title,
      },
    };
  }
  return buildOperationError(
    "view_capability_not_found",
    `View capability not found: ${capabilityId}`
  );
}

export function buildArticleMainStateSummary(resource: ViewResourceBinding, activeAnchor?: string) {
  const summary = String(resource.data.summary || "").trim();
  const sections = toStringArray(resource.data.sections);
  const annotations = toStringArray(resource.data.annotations);
  return {
    resource_title: resource.title || "",
    has_summary: Boolean(summary),
    section_count: sections.length,
    annotation_count: annotations.length,
    active_anchor: activeAnchor || "",
  };
}
