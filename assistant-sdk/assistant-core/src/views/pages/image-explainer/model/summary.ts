import type { ViewStateBinding } from "../../../../runtime/view";
import { readImageExplainerResourceData } from "./resource";

export function buildImageExplainerMainStateSummary(state_binding: ViewStateBinding, activeAnchor?: string) {
  const deck = readImageExplainerResourceData(state_binding).deck;
  const currentPage = deck.pages[deck.current_page_index];
  return {
    resource_title: state_binding.title || "",
    deck_title: deck.title || "",
    page_count: deck.pages.length,
    current_page_index: deck.current_page_index,
    current_page_id: currentPage?.id || "",
    current_page_title: currentPage?.title || "",
    current_layout: currentPage?.layout || "",
    current_image_count: currentPage?.images.length || 0,
    current_image_ids: currentPage?.images.map((item) => item.id) || [],
    current_highlight_count: currentPage?.highlights.length || 0,
    active_anchor: activeAnchor || "",
  };
}
