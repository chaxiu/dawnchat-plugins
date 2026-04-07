import type { ViewCapabilityResult, ViewResourceBinding } from "../../../../runtime/view";
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
  resource: ViewResourceBinding
): Promise<ViewCapabilityResult> {
  if (capabilityId === "plane.set_viewport") {
    return mutateSetViewport(resource, input);
  }
  if (capabilityId === "plane.clear_scene") {
    return mutateClearScene(resource, input);
  }
  if (capabilityId === "plane.add_point") {
    return mutateAddPoint(resource, input);
  }
  if (capabilityId === "plane.add_line") {
    return mutateAddLine(resource, input);
  }
  if (capabilityId === "plane.add_curve") {
    return mutateAddCurve(resource, input);
  }
  if (capabilityId === "plane.add_circle") {
    return mutateAddCircle(resource, input);
  }
  if (capabilityId === "plane.add_ellipse") {
    return mutateAddEllipse(resource, input);
  }
  if (capabilityId === "plane.add_polygon") {
    return mutateAddPolygon(resource, input);
  }
  if (capabilityId === "plane.add_arc") {
    return mutateAddArc(resource, input);
  }
  if (capabilityId === "plane.add_angle_marker") {
    return mutateAddAngleMarker(resource, input);
  }
  if (capabilityId === "plane.add_vector") {
    return mutateAddVector(resource, input);
  }
  if (capabilityId === "plane.add_annotation") {
    return mutateAddAnnotation(resource, input);
  }
  if (capabilityId === "plane.show_formula_label") {
    return mutateShowFormulaLabel(resource, input);
  }
  if (capabilityId === "plane.highlight") {
    return mutateHighlight(resource, input);
  }
  if (capabilityId === "plane.clear_highlight") {
    return mutateClearHighlight(resource);
  }
  if (capabilityId === "plane.set_style") {
    return mutateSetStyle(resource, input);
  }
  if (capabilityId === "plane.focus_region") {
    return mutateFocusRegion(resource, input);
  }
  if (capabilityId === "plane.set_label") {
    return mutateSetLabel(resource, input);
  }
  if (capabilityId === "plane.add_object") {
    return mutateAddObject(resource, input);
  }
  if (capabilityId === "plane.animate_object") {
    return mutateAnimateObject(resource, input);
  }
  if (capabilityId === "plane.get_scene_state") {
    const data = readCoordinatePlaneResourceData(resource);
    return {
      resource,
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
