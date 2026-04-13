import type { ViewCapabilityResult, ViewStateBinding } from "../../../runtime/view";
import { buildOperationError, toStringArray } from "../../shared/viewUtils";
import { cloneWordResource } from "./wordMain.view";

export function invokeWordMainCapability(
  capabilityId: string,
  input: Record<string, unknown>,
  state_binding: ViewStateBinding
): ViewCapabilityResult {
  const nextResource = cloneWordResource(state_binding);
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
      state_binding: nextResource,
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
      state_binding: nextResource,
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

export function buildWordMainStateSummary(state_binding: ViewStateBinding, activeAnchor?: string) {
  const word = String(state_binding.data.word || "").trim();
  const meaning = String(state_binding.data.meaning || "").trim();
  const etymology = toStringArray(state_binding.data.etymology);
  return {
    resource_title: state_binding.title || "",
    word,
    has_meaning: Boolean(meaning),
    etymology_count: etymology.length,
    active_anchor: activeAnchor || "",
  };
}
