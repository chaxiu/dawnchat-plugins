import { computed } from "vue";

import { useViewState } from "../../../../runtime/view/state";
import { readCoordinatePlaneResourceData } from "../model/resource";

export function useCoordinatePlaneScene() {
  const { activeViewId, currentResource } = useViewState();

  const isCoordinatePlaneActive = computed(() => activeViewId.value === "plane.main");
  const scene = computed(() => {
    if (!currentResource.value || !isCoordinatePlaneActive.value) {
      return null;
    }
    return readCoordinatePlaneResourceData(currentResource.value);
  });
  const stageTitle = computed(() => currentResource.value?.title || "Coordinate Lab");

  return {
    currentResource,
    isCoordinatePlaneActive,
    scene,
    stageTitle,
  };
}
