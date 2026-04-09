import type { PlaneAngleSweepDirection, PlaneViewport } from "../model/types";

export interface PlanePointSeries {
  x: number[];
  y: number[];
}

export interface PlaneAngleMarkerGeometry {
  start_angle_deg: number;
  end_angle_deg: number;
  sweep_deg: number;
  bisector_angle_deg: number;
}

export interface PlanePolylineSeries {
  x: number[];
  y: number[];
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sampleEllipsePoints(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  segmentCount = 96
): PlanePointSeries {
  const x: number[] = [];
  const y: number[] = [];
  for (let index = 0; index <= segmentCount; index += 1) {
    const theta = (index / segmentCount) * Math.PI * 2;
    x.push(centerX + (radiusX * Math.cos(theta)));
    y.push(centerY + (radiusY * Math.sin(theta)));
  }
  return { x, y };
}

export function sampleArcPoints(
  centerX: number,
  centerY: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
  segmentCount = 48
): PlanePointSeries {
  const x: number[] = [];
  const y: number[] = [];
  const start = (startAngleDeg * Math.PI) / 180;
  const end = (endAngleDeg * Math.PI) / 180;
  const total = end - start;
  for (let index = 0; index <= segmentCount; index += 1) {
    const theta = start + ((index / segmentCount) * total);
    x.push(centerX + (radius * Math.cos(theta)));
    y.push(centerY + (radius * Math.sin(theta)));
  }
  return { x, y };
}

function normalizeAngleDeg(angleDeg: number) {
  return ((angleDeg % 360) + 360) % 360;
}

export function buildAngleMarkerGeometry(
  ax: number,
  ay: number,
  vertexX: number,
  vertexY: number,
  bx: number,
  by: number,
  sweepDirection: PlaneAngleSweepDirection
): PlaneAngleMarkerGeometry {
  const startAngleDeg = normalizeAngleDeg((Math.atan2(ay - vertexY, ax - vertexX) * 180) / Math.PI);
  const endBaseAngleDeg = normalizeAngleDeg((Math.atan2(by - vertexY, bx - vertexX) * 180) / Math.PI);
  const counterclockwiseSweepDeg = normalizeAngleDeg(endBaseAngleDeg - startAngleDeg);
  const sweepDeg = sweepDirection === "clockwise"
    ? (counterclockwiseSweepDeg === 0 ? 0 : counterclockwiseSweepDeg - 360)
    : counterclockwiseSweepDeg;

  return {
    start_angle_deg: startAngleDeg,
    end_angle_deg: startAngleDeg + sweepDeg,
    sweep_deg: sweepDeg,
    bisector_angle_deg: startAngleDeg + (sweepDeg / 2),
  };
}

export function sampleRightAngleSquarePoints(
  vertexX: number,
  vertexY: number,
  startAngleDeg: number,
  endAngleDeg: number,
  radius: number
): PlanePolylineSeries {
  const startTheta = (startAngleDeg * Math.PI) / 180;
  const endTheta = (endAngleDeg * Math.PI) / 180;
  const side = radius * 0.72;
  const startPoint = {
    x: vertexX + (Math.cos(startTheta) * side),
    y: vertexY + (Math.sin(startTheta) * side),
  };
  const endPoint = {
    x: vertexX + (Math.cos(endTheta) * side),
    y: vertexY + (Math.sin(endTheta) * side),
  };
  const cornerPoint = {
    x: vertexX + (Math.cos(startTheta) * side) + (Math.cos(endTheta) * side),
    y: vertexY + (Math.sin(startTheta) * side) + (Math.sin(endTheta) * side),
  };

  return {
    x: [startPoint.x, cornerPoint.x, endPoint.x],
    y: [startPoint.y, cornerPoint.y, endPoint.y],
  };
}

export function buildAspectSafeBoundingBox(
  viewport: PlaneViewport,
  containerWidth: number,
  containerHeight: number
) {
  const xSpan = Math.max(0.0001, viewport.x_max - viewport.x_min);
  const ySpan = Math.max(0.0001, viewport.y_max - viewport.y_min);

  if (containerWidth <= 0 || containerHeight <= 0) {
    return [viewport.x_min, viewport.y_max, viewport.x_max, viewport.y_min] as const;
  }

  const containerAspect = containerWidth / containerHeight;
  const viewportAspect = xSpan / ySpan;
  const centerX = (viewport.x_min + viewport.x_max) / 2;
  const centerY = (viewport.y_min + viewport.y_max) / 2;

  if (containerAspect > viewportAspect) {
    const adjustedXSpan = ySpan * containerAspect;
    return [
      centerX - (adjustedXSpan / 2),
      viewport.y_max,
      centerX + (adjustedXSpan / 2),
      viewport.y_min,
    ] as const;
  }

  const adjustedYSpan = xSpan / containerAspect;
  return [
    viewport.x_min,
    centerY + (adjustedYSpan / 2),
    viewport.x_max,
    centerY - (adjustedYSpan / 2),
  ] as const;
}
