import { computed } from "vue";

import { useViewState } from "../../../../runtime/view/state";
import { readImageExplainerResourceData } from "../model/resource";

export function useImageExplainerScene() {
  const { activeViewId, currentResource } = useViewState();

  const isImageExplainerActive = computed(() => activeViewId.value === "image.explainer");
  const deck = computed(() => {
    if (!currentResource.value || !isImageExplainerActive.value) {
      return null;
    }
    return readImageExplainerResourceData(currentResource.value).deck;
  });
  const currentPage = computed(() => {
    if (!deck.value) {
      return null;
    }
    return deck.value.pages[deck.value.current_page_index] || null;
  });
  const stageTitle = computed(() => {
    if (!deck.value) {
      return "";
    }
    return currentPage.value?.title || deck.value.title || currentResource.value?.title || "";
  });

  function getHighlightsForImage(imageId: string) {
    return currentPage.value?.highlights.filter((item) => item.target_image_id === imageId) || [];
  }

  return {
    currentPage,
    deck,
    getHighlightsForImage,
    isImageExplainerActive,
    stageTitle,
  };
}
