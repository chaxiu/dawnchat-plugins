import { computed } from "vue";

import { useViewState } from "../../../../runtime/view/state";
import { readCoordinatePlaneResourceData } from "../model/resource";

export function useCoordinatePlaneScene() {
  const { activeViewId, currentStateBinding } = useViewState();

  const isCoordinatePlaneActive = computed(() => activeViewId.value === "plane.main");
  const scene = computed(() => {
    if (!currentStateBinding.value || !isCoordinatePlaneActive.value) {
      return null;
    }
    return readCoordinatePlaneResourceData(currentStateBinding.value);
  });
  const stageTitle = computed(() => currentStateBinding.value?.title || "Coordinate Lab");

  return {
    currentStateBinding,
    isCoordinatePlaneActive,
    scene,
    stageTitle,
  };
}
