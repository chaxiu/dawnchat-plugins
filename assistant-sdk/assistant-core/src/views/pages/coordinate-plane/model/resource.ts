import type {
  ViewOpenSuccess,
  ViewOperationFailure,
  ViewResourceBinding,
} from "../../../../runtime/view/manifest";
import {
  buildOperationError,
  cloneViewResource,
  isViewOperationFailure,
  toRecord,
} from "../../../shared/viewUtils";
import {
  PLANE_ANGLE_SWEEP_DIRECTIONS,
  PLANE_ANGLE_MARKER_STYLES,
  createDefaultCoordinatePlaneResourceData,
  createDefaultPlaneAnimationState,
  createDefaultPlaneViewport,
  PLANE_LABEL_ANCHORS,
  PLANE_OBJECT_SHAPES,
  PLANE_SCENE_OBJECT_TYPES,
  type PlaneAngleMarkerObject,
  type PlaneAngleMarkerStyle,
  type PlaneAngleSweepDirection,
  type PlaneLabelAnchor,
  type PlaneArcObject,
  type CoordinatePlaneResourceData,
  type PlaneAnimationState,
  type PlaneCircleObject,
  type PlaneCurveObject,
  type PlaneEllipseObject,
  type PlaneFormulaLabelObject,
  type PlaneHighlight,
  type PlaneLabelObject,
  type PlaneLineObject,
  type PlaneMarkerObject,
  type PlaneMovingObject,
  type PlanePointCoordinate,
  type PlanePointObject,
  type PlanePolygonObject,
  type PlaneSceneObject,
  type PlaneSegmentObject,
  type PlaneVectorObject,
  type PlaneViewport,
} from "./types";

const COORDINATE_PLANE_RESOURCE_TYPE = "plane.scene";
const COORDINATE_PLANE_RESOURCE_ID = "plane:coordinate-lab";
const COORDINATE_PLANE_RESOURCE_TITLE = "Coordinate Lab";

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

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCoordinate(
  raw: unknown,
  index: number
): PlanePointCoordinate {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    x: normalizeNumber(source.x, index),
    y: normalizeNumber(source.y, 0),
  };
}

function normalizeViewport(raw: unknown): PlaneViewport {
  const defaults = createDefaultPlaneViewport();
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const xMin = normalizeNumber(source.x_min, defaults.x_min);
  const xMax = normalizeNumber(source.x_max, defaults.x_max);
  const yMin = normalizeNumber(source.y_min, defaults.y_min);
  const yMax = normalizeNumber(source.y_max, defaults.y_max);
  if (xMin >= xMax || yMin >= yMax) {
    return defaults;
  }
  return {
    x_min: xMin,
    x_max: xMax,
    y_min: yMin,
    y_max: yMax,
    show_grid: normalizeBoolean(source.show_grid, defaults.show_grid),
    show_axes: normalizeBoolean(source.show_axes, defaults.show_axes),
  };
}

function normalizeObjectColor(raw: Record<string, unknown>, fallback: string) {
  return normalizeString(raw.color, fallback) || fallback;
}

function normalizeFillColor(raw: Record<string, unknown>, fallback: string) {
  return normalizeString(raw.fill_color, fallback) || fallback;
}

function normalizeOpacity(raw: Record<string, unknown>, fallback = 1): number {
  return clampNumber(raw.opacity, fallback, 0, 1);
}

function normalizeLabelAnchor(raw: Record<string, unknown>, fallback: PlaneLabelAnchor = "auto"): PlaneLabelAnchor {
  return PLANE_LABEL_ANCHORS.includes(raw.label_anchor as PlaneLabelAnchor)
    ? raw.label_anchor as PlaneLabelAnchor
    : fallback;
}

function normalizeLabelOffset(raw: Record<string, unknown>, key: "label_offset_dx" | "label_offset_dy"): number {
  return normalizeNumber(raw[key], 0);
}

function normalizeSweepDirection(
  raw: Record<string, unknown>,
  fallback: PlaneAngleSweepDirection = "counterclockwise"
): PlaneAngleSweepDirection {
  return PLANE_ANGLE_SWEEP_DIRECTIONS.includes(raw.sweep_direction as PlaneAngleSweepDirection)
    ? raw.sweep_direction as PlaneAngleSweepDirection
    : fallback;
}

function normalizeAngleMarkerStyle(
  raw: Record<string, unknown>,
  fallback: PlaneAngleMarkerStyle = "arc"
): PlaneAngleMarkerStyle {
  return PLANE_ANGLE_MARKER_STYLES.includes(raw.marker_style as PlaneAngleMarkerStyle)
    ? raw.marker_style as PlaneAngleMarkerStyle
    : fallback;
}

function normalizePointObject(raw: Record<string, unknown>, index: number): PlanePointObject {
  return {
    id: normalizeString(raw.id, `point-${index + 1}`) || `point-${index + 1}`,
    type: "point",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "top"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#8dd3ff"),
    fill_color: normalizeFillColor(raw, "#8dd3ff"),
    opacity: normalizeOpacity(raw),
    x: normalizeNumber(raw.x, 0),
    y: normalizeNumber(raw.y, 0),
    size: clampNumber(raw.size, 3, 1, 12),
  };
}

function normalizeSegmentLikeObject(
  raw: Record<string, unknown>,
  index: number,
  type: "segment" | "line"
): PlaneSegmentObject | PlaneLineObject {
  return {
    id: normalizeString(raw.id, `${type}-${index + 1}`) || `${type}-${index + 1}`,
    type,
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, type === "segment" ? "midpoint" : "right"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, type === "line" ? "#7df4cf" : "#ffd36f"),
    fill_color: normalizeFillColor(raw, type === "line" ? "#7df4cf" : "#ffd36f"),
    opacity: normalizeOpacity(raw),
    x1: normalizeNumber(raw.x1, -2),
    y1: normalizeNumber(raw.y1, 0),
    x2: normalizeNumber(raw.x2, 2),
    y2: normalizeNumber(raw.y2, 0),
    width: clampNumber(raw.width, 2, 1, 8),
    dashed: normalizeBoolean(raw.dashed, false),
  };
}

function normalizeCurveObject(raw: Record<string, unknown>, index: number): PlaneCurveObject {
  const rawPoints = Array.isArray(raw.points) ? raw.points : [];
  const points = rawPoints.length >= 2
    ? rawPoints.map((point, pointIndex) => normalizeCoordinate(point, pointIndex))
    : [{ x: -2, y: -1 }, { x: 0, y: 1 }, { x: 2, y: 0 }];
  return {
    id: normalizeString(raw.id, `curve-${index + 1}`) || `curve-${index + 1}`,
    type: "curve",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "midpoint"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#ff8dcc"),
    fill_color: normalizeFillColor(raw, "#ff8dcc"),
    opacity: normalizeOpacity(raw),
    points,
    width: clampNumber(raw.width, 2, 1, 8),
  };
}

function normalizeCircleObject(raw: Record<string, unknown>, index: number): PlaneCircleObject {
  return {
    id: normalizeString(raw.id, `circle-${index + 1}`) || `circle-${index + 1}`,
    type: "circle",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "top"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#69b7ff"),
    fill_color: normalizeFillColor(raw, "rgba(105, 183, 255, 0.16)"),
    opacity: normalizeOpacity(raw, 0.9),
    center_x: normalizeNumber(raw.center_x, 0),
    center_y: normalizeNumber(raw.center_y, 0),
    radius: clampNumber(raw.radius, 2, 0.0001, 999999),
    width: clampNumber(raw.width, 2, 1, 8),
  };
}

function normalizeEllipseObject(raw: Record<string, unknown>, index: number): PlaneEllipseObject {
  return {
    id: normalizeString(raw.id, `ellipse-${index + 1}`) || `ellipse-${index + 1}`,
    type: "ellipse",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "top"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#7ce0ff"),
    fill_color: normalizeFillColor(raw, "rgba(124, 224, 255, 0.14)"),
    opacity: normalizeOpacity(raw, 0.9),
    center_x: normalizeNumber(raw.center_x, 0),
    center_y: normalizeNumber(raw.center_y, 0),
    radius_x: clampNumber(raw.radius_x, 3, 0.0001, 999999),
    radius_y: clampNumber(raw.radius_y, 2, 0.0001, 999999),
    width: clampNumber(raw.width, 2, 1, 8),
  };
}

function normalizePolygonObject(raw: Record<string, unknown>, index: number): PlanePolygonObject {
  const rawPoints = Array.isArray(raw.points) ? raw.points : [];
  const points = rawPoints.length >= 3
    ? rawPoints.map((point, pointIndex) => normalizeCoordinate(point, pointIndex))
    : [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 1 }];
  return {
    id: normalizeString(raw.id, `polygon-${index + 1}`) || `polygon-${index + 1}`,
    type: "polygon",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "top"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#f5b861"),
    fill_color: normalizeFillColor(raw, "rgba(245, 184, 97, 0.18)"),
    opacity: normalizeOpacity(raw, 0.9),
    points,
    width: clampNumber(raw.width, 2, 1, 8),
  };
}

function normalizeArcObject(raw: Record<string, unknown>, index: number): PlaneArcObject {
  return {
    id: normalizeString(raw.id, `arc-${index + 1}`) || `arc-${index + 1}`,
    type: "arc",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "top"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#f4a3ff"),
    fill_color: normalizeFillColor(raw, "rgba(244, 163, 255, 0.08)"),
    opacity: normalizeOpacity(raw, 0.92),
    center_x: normalizeNumber(raw.center_x, 0),
    center_y: normalizeNumber(raw.center_y, 0),
    radius: clampNumber(raw.radius, 2, 0.0001, 999999),
    start_angle_deg: normalizeNumber(raw.start_angle_deg, 0),
    end_angle_deg: normalizeNumber(raw.end_angle_deg, 90),
    width: clampNumber(raw.width, 2, 1, 8),
  };
}

function normalizeAngleMarkerObject(raw: Record<string, unknown>, index: number): PlaneAngleMarkerObject {
  return {
    id: normalizeString(raw.id, `angle-marker-${index + 1}`) || `angle-marker-${index + 1}`,
    type: "angle_marker",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "midpoint"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#ffb86b"),
    fill_color: normalizeFillColor(raw, "rgba(255, 184, 107, 0.12)"),
    opacity: normalizeOpacity(raw, 1),
    ax: normalizeNumber(raw.ax, -1),
    ay: normalizeNumber(raw.ay, 0),
    vertex_x: normalizeNumber(raw.vertex_x, 0),
    vertex_y: normalizeNumber(raw.vertex_y, 0),
    bx: normalizeNumber(raw.bx, 1),
    by: normalizeNumber(raw.by, 0),
    radius: clampNumber(raw.radius, 1.2, 0.0001, 999999),
    sweep_direction: normalizeSweepDirection(raw),
    marker_style: normalizeAngleMarkerStyle(raw),
    width: clampNumber(raw.width, 2, 1, 8),
  };
}

function normalizeVectorObject(raw: Record<string, unknown>, index: number): PlaneVectorObject {
  return {
    id: normalizeString(raw.id, `vector-${index + 1}`) || `vector-${index + 1}`,
    type: "vector",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "midpoint"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#9cffb1"),
    fill_color: normalizeFillColor(raw, "#9cffb1"),
    opacity: normalizeOpacity(raw, 1),
    x1: normalizeNumber(raw.x1, 0),
    y1: normalizeNumber(raw.y1, 0),
    x2: normalizeNumber(raw.x2, 2),
    y2: normalizeNumber(raw.y2, 1),
    width: clampNumber(raw.width, 2, 1, 8),
    dashed: normalizeBoolean(raw.dashed, false),
  };
}

function normalizeLabelObject(raw: Record<string, unknown>, index: number): PlaneLabelObject {
  const text = normalizeString(raw.text) || normalizeString(raw.label) || "Annotation";
  return {
    id: normalizeString(raw.id, `label-${index + 1}`) || `label-${index + 1}`,
    type: "label",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "center"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#eaf2ff"),
    fill_color: normalizeFillColor(raw, "#eaf2ff"),
    opacity: normalizeOpacity(raw),
    x: normalizeNumber(raw.x, 0),
    y: normalizeNumber(raw.y, 0),
    text,
  };
}

function normalizeFormulaLabelObject(raw: Record<string, unknown>, index: number): PlaneFormulaLabelObject {
  const text = normalizeString(raw.text) || normalizeString(raw.label) || "Formula";
  return {
    id: normalizeString(raw.id, `formula-${index + 1}`) || `formula-${index + 1}`,
    type: "formula_label",
    label: normalizeString(raw.label),
    label_anchor: normalizeLabelAnchor(raw, "center"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#ffe8a6"),
    fill_color: normalizeFillColor(raw, "#ffe8a6"),
    opacity: normalizeOpacity(raw),
    x: normalizeNumber(raw.x, 0),
    y: normalizeNumber(raw.y, 0),
    text,
  };
}

function normalizeMarkerObject(raw: Record<string, unknown>, index: number): PlaneMarkerObject {
  return {
    id: normalizeString(raw.id, `marker-${index + 1}`) || `marker-${index + 1}`,
    type: "marker",
    label: normalizeString(raw.label) || "Marker",
    label_anchor: normalizeLabelAnchor(raw, "top"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#f7f79a"),
    fill_color: normalizeFillColor(raw, "#f7f79a"),
    opacity: normalizeOpacity(raw),
    x: normalizeNumber(raw.x, 0),
    y: normalizeNumber(raw.y, 0),
    size: clampNumber(raw.size, 4, 1, 12),
  };
}

function normalizeMovingObject(raw: Record<string, unknown>, index: number): PlaneMovingObject {
  return {
    id: normalizeString(raw.id, `object-${index + 1}`) || `object-${index + 1}`,
    type: "object",
    label: normalizeString(raw.label) || "Object",
    label_anchor: normalizeLabelAnchor(raw, "top"),
    label_offset_dx: normalizeLabelOffset(raw, "label_offset_dx"),
    label_offset_dy: normalizeLabelOffset(raw, "label_offset_dy"),
    color: normalizeObjectColor(raw, "#8eff9b"),
    fill_color: normalizeFillColor(raw, "#8eff9b"),
    opacity: normalizeOpacity(raw),
    x: normalizeNumber(raw.x, 0),
    y: normalizeNumber(raw.y, 0),
    shape: PLANE_OBJECT_SHAPES.includes(raw.shape as PlaneMovingObject["shape"])
      ? raw.shape as PlaneMovingObject["shape"]
      : "circle",
    size: clampNumber(raw.size, 6, 2, 18),
  };
}

function normalizeSceneObject(raw: unknown, index: number): PlaneSceneObject {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const objectType = PLANE_SCENE_OBJECT_TYPES.includes(source.type as PlaneSceneObject["type"])
    ? source.type as PlaneSceneObject["type"]
    : "point";
  if (objectType === "point") {
    return normalizePointObject(source, index);
  }
  if (objectType === "segment") {
    return normalizeSegmentLikeObject(source, index, "segment");
  }
  if (objectType === "line") {
    return normalizeSegmentLikeObject(source, index, "line");
  }
  if (objectType === "curve") {
    return normalizeCurveObject(source, index);
  }
  if (objectType === "circle") {
    return normalizeCircleObject(source, index);
  }
  if (objectType === "ellipse") {
    return normalizeEllipseObject(source, index);
  }
  if (objectType === "polygon") {
    return normalizePolygonObject(source, index);
  }
  if (objectType === "arc") {
    return normalizeArcObject(source, index);
  }
  if (objectType === "angle_marker") {
    return normalizeAngleMarkerObject(source, index);
  }
  if (objectType === "vector") {
    return normalizeVectorObject(source, index);
  }
  if (objectType === "label") {
    return normalizeLabelObject(source, index);
  }
  if (objectType === "formula_label") {
    return normalizeFormulaLabelObject(source, index);
  }
  if (objectType === "marker") {
    return normalizeMarkerObject(source, index);
  }
  return normalizeMovingObject(source, index);
}

function normalizeHighlight(
  raw: unknown,
  index: number,
  objects: PlaneSceneObject[]
): PlaneHighlight | null {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const rawTargetIds = Array.isArray(source.target_ids) ? source.target_ids : [];
  const targetIds = rawTargetIds
    .map((item) => normalizeString(item))
    .filter((item) => item.length > 0 && objects.some((object) => object.id === item));
  if (targetIds.length === 0) {
    return null;
  }
  return {
    id: normalizeString(source.id, `highlight-${index + 1}`) || `highlight-${index + 1}`,
    target_ids: Array.from(new Set(targetIds)),
    label: normalizeString(source.label),
    color: normalizeString(source.color, "#ffe08a") || "#ffe08a",
  };
}

function normalizeAnimationState(
  raw: unknown,
  objects: PlaneSceneObject[]
): PlaneAnimationState {
  const defaults = createDefaultPlaneAnimationState();
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const objectId = normalizeString(source.object_id);
  const targetObject = objects.find((item): item is PlaneMovingObject => item.id === objectId && item.type === "object");
  if (!targetObject) {
    return defaults;
  }
  return {
    status: source.status === "playing" ? "playing" : "idle",
    object_id: objectId,
    from_x: normalizeNumber(source.from_x, targetObject.x),
    from_y: normalizeNumber(source.from_y, targetObject.y),
    to_x: normalizeNumber(source.to_x, targetObject.x),
    to_y: normalizeNumber(source.to_y, targetObject.y),
    duration_ms: clampNumber(source.duration_ms, 0, 0, 30000),
    token: Math.max(0, Math.trunc(normalizeNumber(source.token, 0))),
  };
}

export const COORDINATE_PLANE_DEFAULT_RESOURCE: ViewResourceBinding = {
  resource_type: COORDINATE_PLANE_RESOURCE_TYPE,
  resource_id: COORDINATE_PLANE_RESOURCE_ID,
  title: COORDINATE_PLANE_RESOURCE_TITLE,
  data: createDefaultCoordinatePlaneResourceData() as unknown as Record<string, unknown>,
};

export function cloneCoordinatePlaneResource(resource: ViewResourceBinding): ViewResourceBinding {
  return cloneViewResource(resource);
}

export function readCoordinatePlaneResourceData(resource: ViewResourceBinding): CoordinatePlaneResourceData {
  return resource.data as unknown as CoordinatePlaneResourceData;
}

export function normalizeCoordinatePlaneResource(raw: Record<string, unknown>): ViewResourceBinding {
  const defaults = createDefaultCoordinatePlaneResourceData();
  const rawData = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
    ? raw.data as Record<string, unknown>
    : {};
  const viewport = normalizeViewport(rawData.viewport);
  const objects = Array.isArray(rawData.objects)
    ? rawData.objects.map((item, index) => normalizeSceneObject(item, index))
    : defaults.objects;
  const highlights = Array.isArray(rawData.highlights)
    ? rawData.highlights
      .map((item, index) => normalizeHighlight(item, index, objects))
      .filter((item): item is PlaneHighlight => item !== null)
    : defaults.highlights;
  const animationState = normalizeAnimationState(rawData.animation_state, objects);
  return {
    resource_type: COORDINATE_PLANE_RESOURCE_TYPE,
    resource_id: normalizeString(raw.resource_id, COORDINATE_PLANE_RESOURCE_ID) || COORDINATE_PLANE_RESOURCE_ID,
    title: normalizeString(raw.title, COORDINATE_PLANE_RESOURCE_TITLE) || COORDINATE_PLANE_RESOURCE_TITLE,
    data: {
      viewport,
      objects,
      highlights,
      animation_state: animationState,
    } as unknown as Record<string, unknown>,
  };
}

export function validateCoordinatePlaneResource(
  payload: Record<string, unknown>
): ViewResourceBinding | ViewOperationFailure {
  if (Object.keys(payload).length === 0) {
    return cloneCoordinatePlaneResource(COORDINATE_PLANE_DEFAULT_RESOURCE);
  }
  const resourceType = normalizeString(payload.resource_type, COORDINATE_PLANE_RESOURCE_TYPE);
  if (resourceType !== COORDINATE_PLANE_RESOURCE_TYPE) {
    return buildOperationError(
      "invalid_view_resource",
      `plane.main requires resource.resource_type to be '${COORDINATE_PLANE_RESOURCE_TYPE}'`
    );
  }
  const rawData = payload.data;
  if (rawData !== undefined && (!rawData || typeof rawData !== "object" || Array.isArray(rawData))) {
    return buildOperationError(
      "invalid_view_resource",
      "plane.main requires resource.data to be an object"
    );
  }
  return normalizeCoordinatePlaneResource(payload);
}

export function openCoordinatePlaneMainView(payload: Record<string, unknown>): ViewOpenSuccess | ViewOperationFailure {
  const input = toRecord(payload);
  const normalizedResource = validateCoordinatePlaneResource(toRecord(input.resource));
  if (isViewOperationFailure(normalizedResource)) {
    return normalizedResource;
  }
  const initialAnchor = normalizeString(input.initial_anchor);
  return {
    resource: normalizedResource,
    activeAnchor: initialAnchor || "plane.stage",
    data: {
      status: "applied",
      resource_id: normalizedResource.resource_id || "",
      object_count: readCoordinatePlaneResourceData(normalizedResource).objects.length,
    },
  };
}
