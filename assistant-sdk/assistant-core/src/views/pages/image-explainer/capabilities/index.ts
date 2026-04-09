import type { ViewCapabilityResult, ViewResourceBinding } from "../../../../runtime/view";
import { buildOperationError } from "../../../shared/viewUtils";
import { readImageExplainerResourceData } from "../model/resource";
import {
  mutateClearHighlight,
  mutateHighlightRegion,
  mutateSetPages,
  mutateSetTitle,
  mutateShowPage,
} from "./mutations";

export async function invokeImageExplainerMainCapability(
  capabilityId: string,
  input: Record<string, unknown>,
  resource: ViewResourceBinding
): Promise<ViewCapabilityResult> {
  if (capabilityId === "image.set_pages") {
    return mutateSetPages(resource, input);
  }
  if (capabilityId === "image.show_page") {
    return mutateShowPage(resource, input);
  }
  if (capabilityId === "image.set_title") {
    return mutateSetTitle(resource, input);
  }
  if (capabilityId === "image.highlight_region") {
    return mutateHighlightRegion(resource, input);
  }
  if (capabilityId === "image.clear_highlight") {
    return mutateClearHighlight(resource);
  }
  if (capabilityId === "image.get_scene_state") {
    const deck = readImageExplainerResourceData(resource).deck;
    const currentPage = deck.pages[deck.current_page_index];
    return {
      resource,
      activeAnchor: "image.header",
      data: {
        status: "applied",
        deck_title: deck.title,
        page_count: deck.pages.length,
        current_page_index: deck.current_page_index,
        current_page_id: currentPage?.id || "",
        current_layout: currentPage?.layout || "",
        current_image_count: currentPage?.images.length || 0,
        current_highlight_count: currentPage?.highlights.length || 0,
      },
    };
  }
  return buildOperationError(
    "view_capability_not_found",
    `View capability not found: ${capabilityId}`
  );
}
