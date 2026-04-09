export const PLANE_SCENE_OBJECT_TYPES = [
  "point",
  "segment",
  "line",
  "curve",
  "circle",
  "ellipse",
  "polygon",
  "arc",
  "angle_marker",
  "vector",
  "label",
  "formula_label",
  "marker",
  "object",
] as const;
export type PlaneSceneObjectType = (typeof PLANE_SCENE_OBJECT_TYPES)[number];

export const PLANE_OBJECT_SHAPES = ["circle", "rect"] as const;
export type PlaneObjectShape = (typeof PLANE_OBJECT_SHAPES)[number];

export const PLANE_ANGLE_SWEEP_DIRECTIONS = ["counterclockwise", "clockwise"] as const;
export type PlaneAngleSweepDirection = (typeof PLANE_ANGLE_SWEEP_DIRECTIONS)[number];

export const PLANE_ANGLE_MARKER_STYLES = ["arc", "right_angle_square"] as const;
export type PlaneAngleMarkerStyle = (typeof PLANE_ANGLE_MARKER_STYLES)[number];

export const PLANE_LABEL_ANCHORS = [
  "auto",
  "center",
  "midpoint",
  "start",
  "end",
  "top",
  "right",
  "bottom",
  "left",
] as const;
export type PlaneLabelAnchor = (typeof PLANE_LABEL_ANCHORS)[number];

export interface PlaneViewport {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  show_grid: boolean;
  show_axes: boolean;
}

export interface PlanePointCoordinate {
  x: number;
  y: number;
}

export interface PlaneBaseObject {
  id: string;
  type: PlaneSceneObjectType;
  label: string;
  label_anchor: PlaneLabelAnchor;
  label_offset_dx: number;
  label_offset_dy: number;
  color: string;
  fill_color: string;
  opacity: number;
}

export interface PlanePointObject extends PlaneBaseObject {
  type: "point";
  x: number;
  y: number;
  size: number;
}

export interface PlaneSegmentObject extends PlaneBaseObject {
  type: "segment";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  dashed: boolean;
}

export interface PlaneLineObject extends PlaneBaseObject {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  dashed: boolean;
}

export interface PlaneCurveObject extends PlaneBaseObject {
  type: "curve";
  points: PlanePointCoordinate[];
  width: number;
}

export interface PlaneCircleObject extends PlaneBaseObject {
  type: "circle";
  center_x: number;
  center_y: number;
  radius: number;
  width: number;
}

export interface PlaneEllipseObject extends PlaneBaseObject {
  type: "ellipse";
  center_x: number;
  center_y: number;
  radius_x: number;
  radius_y: number;
  width: number;
}

export interface PlanePolygonObject extends PlaneBaseObject {
  type: "polygon";
  points: PlanePointCoordinate[];
  width: number;
}

export interface PlaneArcObject extends PlaneBaseObject {
  type: "arc";
  center_x: number;
  center_y: number;
  radius: number;
  start_angle_deg: number;
  end_angle_deg: number;
  width: number;
}

export interface PlaneAngleMarkerObject extends PlaneBaseObject {
  type: "angle_marker";
  ax: number;
  ay: number;
  vertex_x: number;
  vertex_y: number;
  bx: number;
  by: number;
  radius: number;
  sweep_direction: PlaneAngleSweepDirection;
  marker_style: PlaneAngleMarkerStyle;
  width: number;
}

export interface PlaneVectorObject extends PlaneBaseObject {
  type: "vector";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  dashed: boolean;
}

export interface PlaneLabelObject extends PlaneBaseObject {
  type: "label";
  x: number;
  y: number;
  text: string;
}

export interface PlaneFormulaLabelObject extends PlaneBaseObject {
  type: "formula_label";
  x: number;
  y: number;
  text: string;
}

export interface PlaneMarkerObject extends PlaneBaseObject {
  type: "marker";
  x: number;
  y: number;
  size: number;
}

export interface PlaneMovingObject extends PlaneBaseObject {
  type: "object";
  x: number;
  y: number;
  shape: PlaneObjectShape;
  size: number;
}

export type PlaneSceneObject =
  | PlanePointObject
  | PlaneSegmentObject
  | PlaneLineObject
  | PlaneCurveObject
  | PlaneCircleObject
  | PlaneEllipseObject
  | PlanePolygonObject
  | PlaneArcObject
  | PlaneAngleMarkerObject
  | PlaneVectorObject
  | PlaneLabelObject
  | PlaneFormulaLabelObject
  | PlaneMarkerObject
  | PlaneMovingObject;

export interface PlaneHighlight {
  id: string;
  target_ids: string[];
  label: string;
  color: string;
}

export interface PlaneAnimationState {
  status: "idle" | "playing";
  object_id: string;
  from_x: number;
  from_y: number;
  to_x: number;
  to_y: number;
  duration_ms: number;
  token: number;
}

export interface CoordinatePlaneResourceData {
  viewport: PlaneViewport;
  objects: PlaneSceneObject[];
  highlights: PlaneHighlight[];
  animation_state: PlaneAnimationState;
}

export function createDefaultPlaneViewport(): PlaneViewport {
  return {
    x_min: -10,
    x_max: 10,
    y_min: -6,
    y_max: 6,
    show_grid: true,
    show_axes: true,
  };
}

export function createDefaultPlaneAnimationState(): PlaneAnimationState {
  return {
    status: "idle",
    object_id: "",
    from_x: 0,
    from_y: 0,
    to_x: 0,
    to_y: 0,
    duration_ms: 0,
    token: 0,
  };
}

export function createDefaultCoordinatePlaneResourceData(): CoordinatePlaneResourceData {
  return {
    viewport: createDefaultPlaneViewport(),
    objects: [],
    highlights: [],
    animation_state: createDefaultPlaneAnimationState(),
  };
}
