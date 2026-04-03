import type { ViewCapabilityResult, ViewResourceBinding } from "../../../runtime/view";
import { buildOperationError, toStringArray } from "../../shared/viewUtils";
import { cloneWordResource } from "./wordMain.view";

export function invokeWordMainCapability(
  capabilityId: string,
  input: Record<string, unknown>,
  resource: ViewResourceBinding
): ViewCapabilityResult {
  const nextResource = cloneWordResource(resource);
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
}

export function buildWordMainStateSummary(resource: ViewResourceBinding, activeAnchor?: string) {
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
}
