import type { ViewResourceBinding } from "../../../../runtime/view";
import { readCoordinatePlaneResourceData } from "./resource";

export function buildCoordinatePlaneMainStateSummary(resource: ViewResourceBinding, activeAnchor?: string) {
  const data = readCoordinatePlaneResourceData(resource);
  const typeCount = data.objects.reduce<Record<string, number>>((accumulator, object) => {
    accumulator[object.type] = (accumulator[object.type] || 0) + 1;
    return accumulator;
  }, {});
  return {
    resource_title: resource.title || "",
    object_count: data.objects.length,
    object_types: typeCount,
    highlight_count: data.highlights.length,
    animation_status: data.animation_state.status,
    animated_object_id: data.animation_state.object_id,
    viewport: {
      x_min: data.viewport.x_min,
      x_max: data.viewport.x_max,
      y_min: data.viewport.y_min,
      y_max: data.viewport.y_max,
      show_grid: data.viewport.show_grid,
      show_axes: data.viewport.show_axes,
    },
    active_anchor: activeAnchor || "",
  };
}
