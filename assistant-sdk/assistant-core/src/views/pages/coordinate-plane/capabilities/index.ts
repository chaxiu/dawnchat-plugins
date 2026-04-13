import type { ViewCapabilityResult, ViewStateBinding } from "../../../../runtime/view";
import { buildOperationError } from "../../../shared/viewUtils";
import { readCoordinatePlaneResourceData } from "../model/resource";
import {
  mutateAddArc,
  mutateAddAngleMarker,
  mutateAddCircle,
  mutateAddAnnotation,
  mutateAddCurve,
  mutateAddEllipse,
  mutateAddLine,
  mutateAddObject,
  mutateAddPoint,
  mutateAddPolygon,
  mutateAddVector,
  mutateAnimateObject,
  mutateClearHighlight,
  mutateClearScene,
  mutateFocusRegion,
  mutateHighlight,
  mutateSetLabel,
  mutateSetStyle,
  mutateSetViewport,
  mutateShowFormulaLabel,
} from "./mutations";

export async function invokeCoordinatePlaneMainCapability(
  capabilityId: string,
  input: Record<string, unknown>,
  state_binding: ViewStateBinding
): Promise<ViewCapabilityResult> {
  if (capabilityId === "plane.set_viewport") {
    return mutateSetViewport(state_binding, input);
  }
  if (capabilityId === "plane.clear_scene") {
    return mutateClearScene(state_binding, input);
  }
  if (capabilityId === "plane.add_point") {
    return mutateAddPoint(state_binding, input);
  }
  if (capabilityId === "plane.add_line") {
    return mutateAddLine(state_binding, input);
  }
  if (capabilityId === "plane.add_curve") {
    return mutateAddCurve(state_binding, input);
  }
  if (capabilityId === "plane.add_circle") {
    return mutateAddCircle(state_binding, input);
  }
  if (capabilityId === "plane.add_ellipse") {
    return mutateAddEllipse(state_binding, input);
  }
  if (capabilityId === "plane.add_polygon") {
    return mutateAddPolygon(state_binding, input);
  }
  if (capabilityId === "plane.add_arc") {
    return mutateAddArc(state_binding, input);
  }
  if (capabilityId === "plane.add_angle_marker") {
    return mutateAddAngleMarker(state_binding, input);
  }
  if (capabilityId === "plane.add_vector") {
    return mutateAddVector(state_binding, input);
  }
  if (capabilityId === "plane.add_annotation") {
    return mutateAddAnnotation(state_binding, input);
  }
  if (capabilityId === "plane.show_formula_label") {
    return mutateShowFormulaLabel(state_binding, input);
  }
  if (capabilityId === "plane.highlight") {
    return mutateHighlight(state_binding, input);
  }
  if (capabilityId === "plane.clear_highlight") {
    return mutateClearHighlight(state_binding);
  }
  if (capabilityId === "plane.set_style") {
    return mutateSetStyle(state_binding, input);
  }
  if (capabilityId === "plane.focus_region") {
    return mutateFocusRegion(state_binding, input);
  }
  if (capabilityId === "plane.set_label") {
    return mutateSetLabel(state_binding, input);
  }
  if (capabilityId === "plane.add_object") {
    return mutateAddObject(state_binding, input);
  }
  if (capabilityId === "plane.animate_object") {
    return mutateAnimateObject(state_binding, input);
  }
  if (capabilityId === "plane.get_scene_state") {
    const data = readCoordinatePlaneResourceData(state_binding);
    return {
      state_binding,
      activeAnchor: "plane.header",
      data: {
        status: "applied",
        viewport: { ...data.viewport },
        object_count: data.objects.length,
        object_ids: data.objects.map((object) => object.id),
        object_types: data.objects.reduce<Record<string, number>>((accumulator, object) => {
          accumulator[object.type] = (accumulator[object.type] || 0) + 1;
          return accumulator;
        }, {}),
        highlight_count: data.highlights.length,
        animation_state: { ...data.animation_state },
      },
    };
  }
  return buildOperationError(
    "view_capability_not_found",
    `View capability not found: ${capabilityId}`
  );
}
