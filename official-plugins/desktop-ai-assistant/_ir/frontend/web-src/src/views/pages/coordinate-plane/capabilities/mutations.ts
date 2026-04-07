import type { ViewCapabilityResult, ViewResourceBinding } from "../../../../runtime/view";
import { buildOperationError } from "../../../shared/viewUtils";
import { buildAngleMarkerGeometry } from "../runtime/planeGeometry";
import {
  cloneCoordinatePlaneResource,
  readCoordinatePlaneResourceData,
} from "../model/resource";
import {
  createDefaultPlaneAnimationState,
  PLANE_ANGLE_SWEEP_DIRECTIONS,
  PLANE_ANGLE_MARKER_STYLES,
  PLANE_LABEL_ANCHORS,
  PLANE_OBJECT_SHAPES,
  type PlaneAngleMarkerObject,
  type PlaneAngleMarkerStyle,
  type PlaneAngleSweepDirection,
  type PlaneArcObject,
  type PlaneCircleObject,
  type PlaneCurveObject,
  type PlaneEllipseObject,
  type PlaneFormulaLabelObject,
  type PlaneHighlight,
  type PlaneLabelObject,
  type PlaneLineObject,
  type PlaneMarkerObject,
  type PlaneMovingObject,
  type PlaneLabelAnchor,
  type PlanePointCoordinate,
  type PlanePointObject,
  type PlanePolygonObject,
  type PlaneSceneObject,
  type PlaneSegmentObject,
  type PlaneVectorObject,
} from "../model/types";

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return value;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeLabelAnchor(value: unknown, fallback: PlaneLabelAnchor = "auto"): PlaneLabelAnchor {
  return PLANE_LABEL_ANCHORS.includes(value as PlaneLabelAnchor)
    ? value as PlaneLabelAnchor
    : fallback;
}

function normalizeSweepDirection(
  value: unknown,
  fallback: PlaneAngleSweepDirection = "counterclockwise"
): PlaneAngleSweepDirection {
  return PLANE_ANGLE_SWEEP_DIRECTIONS.includes(value as PlaneAngleSweepDirection)
    ? value as PlaneAngleSweepDirection
    : fallback;
}

function normalizeAngleMarkerStyle(
  value: unknown,
  fallback: PlaneAngleMarkerStyle = "arc"
): PlaneAngleMarkerStyle {
  return PLANE_ANGLE_MARKER_STYLES.includes(value as PlaneAngleMarkerStyle)
    ? value as PlaneAngleMarkerStyle
    : fallback;
}

function normalizeCoordinate(raw: unknown, index: number): PlanePointCoordinate {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    x: normalizeNumber(source.x, index),
    y: normalizeNumber(source.y, 0),
  };
}

function upsertSceneObject(
  objects: PlaneSceneObject[],
  nextObject: PlaneSceneObject
) {
  const existingIndex = objects.findIndex((item) => item.id === nextObject.id);
  if (existingIndex >= 0) {
    objects.splice(existingIndex, 1, nextObject);
    return;
  }
  objects.push(nextObject);
}

function removeInvalidHighlights(resource: ViewResourceBinding) {
  const data = readCoordinatePlaneResourceData(resource);
  const objectIds = new Set(data.objects.map((object) => object.id));
  data.highlights = data.highlights
    .map((highlight) => ({
      ...highlight,
      target_ids: highlight.target_ids.filter((targetId) => objectIds.has(targetId)),
    }))
    .filter((highlight) => highlight.target_ids.length > 0);
}

function resetAnimation(resource: ViewResourceBinding) {
  readCoordinatePlaneResourceData(resource).animation_state = createDefaultPlaneAnimationState();
}

function collectTargetIds(
  input: Record<string, unknown>,
  availableIds: string[]
): string[] {
  const rawTargetIds = Array.isArray(input.target_ids)
    ? input.target_ids
    : [input.target_id];
  return Array.from(new Set(
    rawTargetIds
      .map((item) => normalizeString(item))
      .filter((item) => item.length > 0 && availableIds.includes(item))
  ));
}

function applyStylePatchToObject(
  object: PlaneSceneObject,
  input: Record<string, unknown>
) {
  const color = normalizeString(input.color);
  const fillColor = normalizeString(input.fill_color);
  if (color) {
    object.color = color;
  }
  if (fillColor) {
    object.fill_color = fillColor;
  }
  if (typeof input.opacity === "number" && !Number.isNaN(input.opacity)) {
    object.opacity = clampNumber(input.opacity, object.opacity, 0, 1);
  }
  if ("width" in object && typeof input.width === "number" && !Number.isNaN(input.width)) {
    object.width = clampNumber(input.width, object.width, 1, 8);
  }
  if ("dashed" in object && typeof input.dashed === "boolean") {
    object.dashed = input.dashed;
  }
  if ("size" in object && typeof input.size === "number" && !Number.isNaN(input.size)) {
    object.size = clampNumber(input.size, object.size, 1, 18);
  }
}

export function mutateSetViewport(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const xMin = input.x_min;
  const xMax = input.x_max;
  const yMin = input.y_min;
  const yMax = input.y_max;
  if (
    typeof xMin !== "number"
    || typeof xMax !== "number"
    || typeof yMin !== "number"
    || typeof yMax !== "number"
    || Number.isNaN(xMin)
    || Number.isNaN(xMax)
    || Number.isNaN(yMin)
    || Number.isNaN(yMax)
    || xMin >= xMax
    || yMin >= yMax
  ) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.set_viewport requires valid x_min, x_max, y_min, y_max with min < max"
    );
  }
  const nextResource = cloneCoordinatePlaneResource(resource);
  const viewport = readCoordinatePlaneResourceData(nextResource).viewport;
  viewport.x_min = xMin;
  viewport.x_max = xMax;
  viewport.y_min = yMin;
  viewport.y_max = yMax;
  viewport.show_grid = normalizeBoolean(input.show_grid, viewport.show_grid);
  viewport.show_axes = normalizeBoolean(input.show_axes, viewport.show_axes);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      viewport: { ...viewport },
    },
  };
}

export function mutateClearScene(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nextResource = cloneCoordinatePlaneResource(resource);
  const data = readCoordinatePlaneResourceData(nextResource);
  data.objects = [];
  data.highlights = [];
  resetAnimation(nextResource);
  if (normalizeBoolean(input.reset_viewport, false)) {
    data.viewport = {
      x_min: -10,
      x_max: 10,
      y_min: -6,
      y_max: 6,
      show_grid: true,
      show_axes: true,
    };
  }
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_count: 0,
      highlight_count: 0,
    },
  };
}

export function mutateAddPoint(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nextResource = cloneCoordinatePlaneResource(resource);
  const point: PlanePointObject = {
    id: normalizeString(input.id) || `point-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "point",
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, "top"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#8dd3ff",
    fill_color: normalizeString(input.fill_color) || "#8dd3ff",
    opacity: clampNumber(input.opacity, 1, 0, 1),
    x: normalizeNumber(input.x, 0),
    y: normalizeNumber(input.y, 0),
    size: clampNumber(input.size, 3, 1, 12),
  };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, point);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: point.id,
      object_type: point.type,
    },
  };
}

export function mutateAddLine(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const lineType = input.line_type === "line" ? "line" : "segment";
  const nextResource = cloneCoordinatePlaneResource(resource);
  const nextLine: PlaneSegmentObject | PlaneLineObject = {
    id: normalizeString(input.id) || `${lineType}-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: lineType,
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, lineType === "segment" ? "midpoint" : "right"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || (lineType === "line" ? "#7df4cf" : "#ffd36f"),
    fill_color: normalizeString(input.fill_color) || (lineType === "line" ? "#7df4cf" : "#ffd36f"),
    opacity: clampNumber(input.opacity, 1, 0, 1),
    x1: normalizeNumber(input.x1, -2),
    y1: normalizeNumber(input.y1, 0),
    x2: normalizeNumber(input.x2, 2),
    y2: normalizeNumber(input.y2, 0),
    width: clampNumber(input.width, 2, 1, 8),
    dashed: normalizeBoolean(input.dashed, false),
  };
  if (nextLine.x1 === nextLine.x2 && nextLine.y1 === nextLine.y2) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.add_line requires two distinct points"
    );
  }
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, nextLine);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: nextLine.id,
      object_type: nextLine.type,
    },
  };
}

export function mutateAddCurve(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const rawPoints = Array.isArray(input.points) ? input.points : [];
  if (rawPoints.length < 2) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.add_curve requires input.points with at least two coordinate points"
    );
  }
  const points = rawPoints.map((point, index) => {
    const source = point && typeof point === "object" && !Array.isArray(point) ? point as Record<string, unknown> : {};
    return {
      x: normalizeNumber(source.x, index),
      y: normalizeNumber(source.y, 0),
    };
  });
  const nextResource = cloneCoordinatePlaneResource(resource);
  const curve: PlaneCurveObject = {
    id: normalizeString(input.id) || `curve-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "curve",
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, "midpoint"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#ff8dcc",
    fill_color: normalizeString(input.fill_color) || "#ff8dcc",
    opacity: clampNumber(input.opacity, 1, 0, 1),
    points,
    width: clampNumber(input.width, 2, 1, 8),
  };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, curve);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: curve.id,
      object_type: curve.type,
      point_count: curve.points.length,
    },
  };
}

export function mutateAddCircle(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nextResource = cloneCoordinatePlaneResource(resource);
  const circle: PlaneCircleObject = {
    id: normalizeString(input.id) || `circle-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "circle",
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, "top"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#69b7ff",
    fill_color: normalizeString(input.fill_color) || "rgba(105, 183, 255, 0.16)",
    opacity: clampNumber(input.opacity, 0.9, 0, 1),
    center_x: normalizeNumber(input.center_x, 0),
    center_y: normalizeNumber(input.center_y, 0),
    radius: clampNumber(input.radius, 2, 0.0001, 999999),
    width: clampNumber(input.width, 2, 1, 8),
  };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, circle);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: circle.id,
      object_type: circle.type,
      radius: circle.radius,
    },
  };
}

export function mutateAddEllipse(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nextResource = cloneCoordinatePlaneResource(resource);
  const ellipse: PlaneEllipseObject = {
    id: normalizeString(input.id) || `ellipse-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "ellipse",
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, "top"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#7ce0ff",
    fill_color: normalizeString(input.fill_color) || "rgba(124, 224, 255, 0.14)",
    opacity: clampNumber(input.opacity, 0.9, 0, 1),
    center_x: normalizeNumber(input.center_x, 0),
    center_y: normalizeNumber(input.center_y, 0),
    radius_x: clampNumber(input.radius_x, 3, 0.0001, 999999),
    radius_y: clampNumber(input.radius_y, 2, 0.0001, 999999),
    width: clampNumber(input.width, 2, 1, 8),
  };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, ellipse);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: ellipse.id,
      object_type: ellipse.type,
    },
  };
}

export function mutateAddPolygon(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const rawPoints = Array.isArray(input.points) ? input.points : [];
  if (rawPoints.length < 3) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.add_polygon requires input.points with at least three coordinate points"
    );
  }
  const points = rawPoints.map((point, index) => normalizeCoordinate(point, index));
  const nextResource = cloneCoordinatePlaneResource(resource);
  const polygon: PlanePolygonObject = {
    id: normalizeString(input.id) || `polygon-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "polygon",
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, "top"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#f5b861",
    fill_color: normalizeString(input.fill_color) || "rgba(245, 184, 97, 0.18)",
    opacity: clampNumber(input.opacity, 0.9, 0, 1),
    points,
    width: clampNumber(input.width, 2, 1, 8),
  };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, polygon);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: polygon.id,
      object_type: polygon.type,
      point_count: polygon.points.length,
    },
  };
}

export function mutateAddArc(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nextResource = cloneCoordinatePlaneResource(resource);
  const arc: PlaneArcObject = {
    id: normalizeString(input.id) || `arc-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "arc",
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, "top"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#f4a3ff",
    fill_color: normalizeString(input.fill_color) || "rgba(244, 163, 255, 0.08)",
    opacity: clampNumber(input.opacity, 0.92, 0, 1),
    center_x: normalizeNumber(input.center_x, 0),
    center_y: normalizeNumber(input.center_y, 0),
    radius: clampNumber(input.radius, 2, 0.0001, 999999),
    start_angle_deg: normalizeNumber(input.start_angle_deg, 0),
    end_angle_deg: normalizeNumber(input.end_angle_deg, 90),
    width: clampNumber(input.width, 2, 1, 8),
  };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, arc);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: arc.id,
      object_type: arc.type,
    },
  };
}

export function mutateAddAngleMarker(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const ax = normalizeNumber(input.ax, Number.NaN);
  const ay = normalizeNumber(input.ay, Number.NaN);
  const vertexX = normalizeNumber(input.vertex_x, Number.NaN);
  const vertexY = normalizeNumber(input.vertex_y, Number.NaN);
  const bx = normalizeNumber(input.bx, Number.NaN);
  const by = normalizeNumber(input.by, Number.NaN);
  const radius = clampNumber(input.radius, 1.2, 0.0001, 999999);
  const sweepDirection = normalizeSweepDirection(input.sweep_direction);
  const markerStyle = normalizeAngleMarkerStyle(input.marker_style);

  if (
    Number.isNaN(ax)
    || Number.isNaN(ay)
    || Number.isNaN(vertexX)
    || Number.isNaN(vertexY)
    || Number.isNaN(bx)
    || Number.isNaN(by)
  ) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.add_angle_marker requires ax, ay, vertex_x, vertex_y, bx, by"
    );
  }
  if ((ax === vertexX && ay === vertexY) || (bx === vertexX && by === vertexY)) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.add_angle_marker requires A and B to be distinct from the vertex"
    );
  }

  const geometry = buildAngleMarkerGeometry(ax, ay, vertexX, vertexY, bx, by, sweepDirection);
  if (Math.abs(geometry.sweep_deg) < 0.0001) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.add_angle_marker requires two non-collinear rays with a non-zero swept angle"
    );
  }

  const nextResource = cloneCoordinatePlaneResource(resource);
  const angleMarker: PlaneAngleMarkerObject = {
    id: normalizeString(input.id) || `angle-marker-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "angle_marker",
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, "midpoint"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#ffb86b",
    fill_color: normalizeString(input.fill_color) || "rgba(255, 184, 107, 0.12)",
    opacity: clampNumber(input.opacity, 1, 0, 1),
    ax,
    ay,
    vertex_x: vertexX,
    vertex_y: vertexY,
    bx,
    by,
    radius,
    sweep_direction: sweepDirection,
    marker_style: markerStyle,
    width: clampNumber(input.width, 2, 1, 8),
  };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, angleMarker);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: angleMarker.id,
      object_type: angleMarker.type,
      sweep_direction: angleMarker.sweep_direction,
      marker_style: angleMarker.marker_style,
      sweep_deg: geometry.sweep_deg,
    },
  };
}

export function mutateAddVector(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nextResource = cloneCoordinatePlaneResource(resource);
  const vector: PlaneVectorObject = {
    id: normalizeString(input.id) || `vector-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "vector",
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, "midpoint"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#9cffb1",
    fill_color: normalizeString(input.fill_color) || "#9cffb1",
    opacity: clampNumber(input.opacity, 1, 0, 1),
    x1: normalizeNumber(input.x1, 0),
    y1: normalizeNumber(input.y1, 0),
    x2: normalizeNumber(input.x2, 2),
    y2: normalizeNumber(input.y2, 1),
    width: clampNumber(input.width, 2, 1, 8),
    dashed: normalizeBoolean(input.dashed, false),
  };
  if (vector.x1 === vector.x2 && vector.y1 === vector.y2) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.add_vector requires two distinct points"
    );
  }
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, vector);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: vector.id,
      object_type: vector.type,
    },
  };
}

export function mutateAddAnnotation(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const annotationType = input.annotation_type === "marker" ? "marker" : "label";
  const nextResource = cloneCoordinatePlaneResource(resource);
  const object: PlaneLabelObject | PlaneMarkerObject = annotationType === "marker"
    ? {
      id: normalizeString(input.id) || `marker-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
      type: "marker",
      label: normalizeString(input.label) || "Marker",
      label_anchor: normalizeLabelAnchor(input.label_anchor, "top"),
      label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
      label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
      color: normalizeString(input.color) || "#f7f79a",
      fill_color: normalizeString(input.fill_color) || "#f7f79a",
      opacity: clampNumber(input.opacity, 1, 0, 1),
      x: normalizeNumber(input.x, 0),
      y: normalizeNumber(input.y, 0),
      size: clampNumber(input.size, 4, 1, 12),
    }
    : {
      id: normalizeString(input.id) || `label-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
      type: "label",
      label: normalizeString(input.label),
      label_anchor: normalizeLabelAnchor(input.label_anchor, "center"),
      label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
      label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
      color: normalizeString(input.color) || "#eaf2ff",
      fill_color: normalizeString(input.fill_color) || "#eaf2ff",
      opacity: clampNumber(input.opacity, 1, 0, 1),
      x: normalizeNumber(input.x, 0),
      y: normalizeNumber(input.y, 0),
      text: normalizeString(input.text) || normalizeString(input.label) || "Annotation",
    };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, object);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: object.id,
      object_type: object.type,
    },
  };
}

export function mutateShowFormulaLabel(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const text = normalizeString(input.text);
  if (!text) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.show_formula_label requires input.text"
    );
  }
  const nextResource = cloneCoordinatePlaneResource(resource);
  const formulaLabel: PlaneFormulaLabelObject = {
    id: normalizeString(input.id) || `formula-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "formula_label",
    label: normalizeString(input.label),
    label_anchor: normalizeLabelAnchor(input.label_anchor, "center"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#ffe8a6",
    fill_color: normalizeString(input.fill_color) || "#ffe8a6",
    opacity: clampNumber(input.opacity, 1, 0, 1),
    x: normalizeNumber(input.x, 0),
    y: normalizeNumber(input.y, 0),
    text,
  };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, formulaLabel);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: formulaLabel.id,
      object_type: formulaLabel.type,
    },
  };
}

export function mutateHighlight(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nextResource = cloneCoordinatePlaneResource(resource);
  const data = readCoordinatePlaneResourceData(nextResource);
  const targetIds = collectTargetIds(input, data.objects.map((object) => object.id));
  if (targetIds.length === 0) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.highlight requires one or more valid target_ids"
    );
  }
  const highlight: PlaneHighlight = {
    id: normalizeString(input.id) || `highlight-${data.highlights.length + 1}`,
    target_ids: Array.from(new Set(targetIds)),
    label: normalizeString(input.label),
    color: normalizeString(input.color) || "#ffe08a",
  };
  const existingIndex = data.highlights.findIndex((item) => item.id === highlight.id);
  if (existingIndex >= 0) {
    data.highlights.splice(existingIndex, 1, highlight);
  } else {
    data.highlights.push(highlight);
  }
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      highlight_id: highlight.id,
      highlight_count: data.highlights.length,
    },
  };
}

export function mutateSetStyle(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nextResource = cloneCoordinatePlaneResource(resource);
  const data = readCoordinatePlaneResourceData(nextResource);
  const targetIds = collectTargetIds(input, data.objects.map((object) => object.id));
  if (targetIds.length === 0) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.set_style requires one or more valid target_ids"
    );
  }
  const updatedIds: string[] = [];
  for (const object of data.objects) {
    if (!targetIds.includes(object.id)) {
      continue;
    }
    applyStylePatchToObject(object, input);
    updatedIds.push(object.id);
  }
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      target_ids: updatedIds,
      patch: {
        color: normalizeString(input.color),
        fill_color: normalizeString(input.fill_color),
        width: typeof input.width === "number" ? input.width : undefined,
        dashed: typeof input.dashed === "boolean" ? input.dashed : undefined,
        opacity: typeof input.opacity === "number" ? input.opacity : undefined,
        size: typeof input.size === "number" ? input.size : undefined,
      },
    },
  };
}

export function mutateFocusRegion(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  let xMin = Number.NaN;
  let xMax = Number.NaN;
  let yMin = Number.NaN;
  let yMax = Number.NaN;
  if (
    typeof input.x_min === "number"
    && typeof input.x_max === "number"
    && typeof input.y_min === "number"
    && typeof input.y_max === "number"
  ) {
    xMin = input.x_min;
    xMax = input.x_max;
    yMin = input.y_min;
    yMax = input.y_max;
  } else if (
    typeof input.center_x === "number"
    && typeof input.center_y === "number"
    && typeof input.x_span === "number"
    && typeof input.y_span === "number"
  ) {
    const xSpan = Math.max(0.0001, input.x_span);
    const ySpan = Math.max(0.0001, input.y_span);
    xMin = input.center_x - (xSpan / 2);
    xMax = input.center_x + (xSpan / 2);
    yMin = input.center_y - (ySpan / 2);
    yMax = input.center_y + (ySpan / 2);
  }
  if (
    Number.isNaN(xMin)
    || Number.isNaN(xMax)
    || Number.isNaN(yMin)
    || Number.isNaN(yMax)
    || xMin >= xMax
    || yMin >= yMax
  ) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.focus_region requires either x_min/x_max/y_min/y_max or center_x/center_y/x_span/y_span"
    );
  }
  const nextResource = cloneCoordinatePlaneResource(resource);
  const viewport = readCoordinatePlaneResourceData(nextResource).viewport;
  viewport.x_min = xMin;
  viewport.x_max = xMax;
  viewport.y_min = yMin;
  viewport.y_max = yMax;
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      viewport: { ...viewport },
    },
  };
}

export function mutateSetLabel(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const targetId = normalizeString(input.target_id);
  if (!targetId) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.set_label requires input.target_id"
    );
  }
  const nextResource = cloneCoordinatePlaneResource(resource);
  const data = readCoordinatePlaneResourceData(nextResource);
  const target = data.objects.find((object) => object.id === targetId);
  if (!target) {
    return buildOperationError(
      "invalid_view_capability_input",
      `plane.set_label requires an existing object id: ${targetId}`
    );
  }
  if ("label" in input) {
    target.label = normalizeString(input.label);
  }
  if ("label_anchor" in input) {
    target.label_anchor = normalizeLabelAnchor(input.label_anchor, target.label_anchor);
  }
  if ("label_offset_dx" in input) {
    target.label_offset_dx = normalizeNumber(input.label_offset_dx, target.label_offset_dx);
  }
  if ("label_offset_dy" in input) {
    target.label_offset_dy = normalizeNumber(input.label_offset_dy, target.label_offset_dy);
  }
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      target_id: target.id,
      label: target.label,
      label_anchor: target.label_anchor,
      label_offset_dx: target.label_offset_dx,
      label_offset_dy: target.label_offset_dy,
    },
  };
}

export function mutateClearHighlight(resource: ViewResourceBinding): ViewCapabilityResult {
  const nextResource = cloneCoordinatePlaneResource(resource);
  readCoordinatePlaneResourceData(nextResource).highlights = [];
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      highlight_count: 0,
    },
  };
}

export function mutateAddObject(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const shape = PLANE_OBJECT_SHAPES.includes(input.shape as PlaneMovingObject["shape"])
    ? input.shape as PlaneMovingObject["shape"]
    : "circle";
  const nextResource = cloneCoordinatePlaneResource(resource);
  const object: PlaneMovingObject = {
    id: normalizeString(input.id) || `object-${readCoordinatePlaneResourceData(nextResource).objects.length + 1}`,
    type: "object",
    label: normalizeString(input.label) || "Object",
    label_anchor: normalizeLabelAnchor(input.label_anchor, "top"),
    label_offset_dx: normalizeNumber(input.label_offset_dx, 0),
    label_offset_dy: normalizeNumber(input.label_offset_dy, 0),
    color: normalizeString(input.color) || "#8eff9b",
    fill_color: normalizeString(input.fill_color) || "#8eff9b",
    opacity: clampNumber(input.opacity, 1, 0, 1),
    x: normalizeNumber(input.x, 0),
    y: normalizeNumber(input.y, 0),
    shape,
    size: clampNumber(input.size, 6, 2, 18),
  };
  upsertSceneObject(readCoordinatePlaneResourceData(nextResource).objects, object);
  removeInvalidHighlights(nextResource);
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: object.id,
      object_type: object.type,
      shape: object.shape,
    },
  };
}

export function mutateAnimateObject(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const objectId = normalizeString(input.object_id);
  if (!objectId) {
    return buildOperationError(
      "invalid_view_capability_input",
      "plane.animate_object requires input.object_id"
    );
  }
  const nextResource = cloneCoordinatePlaneResource(resource);
  const data = readCoordinatePlaneResourceData(nextResource);
  const object = data.objects.find((item): item is PlaneMovingObject => item.id === objectId && item.type === "object");
  if (!object) {
    return buildOperationError(
      "plane_object_not_found",
      `Plane object not found: ${objectId}`
    );
  }
  const fromX = object.x;
  const fromY = object.y;
  const toX = normalizeNumber(input.to_x, object.x);
  const toY = normalizeNumber(input.to_y, object.y);
  const durationMs = clampNumber(input.duration_ms, 1200, 0, 30000);
  object.x = toX;
  object.y = toY;
  data.animation_state = {
    status: "playing",
    object_id: object.id,
    from_x: fromX,
    from_y: fromY,
    to_x: toX,
    to_y: toY,
    duration_ms: durationMs,
    token: data.animation_state.token + 1,
  };
  return {
    resource: nextResource,
    activeAnchor: "plane.stage",
    data: {
      status: "applied",
      object_id: object.id,
      duration_ms: durationMs,
      from_x: fromX,
      from_y: fromY,
      to_x: toX,
      to_y: toY,
    },
  };
}
