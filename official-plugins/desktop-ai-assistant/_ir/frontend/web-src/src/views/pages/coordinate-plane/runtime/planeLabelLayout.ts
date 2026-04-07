import type { PlaneViewport } from "../model/types";
import { buildAngleMarkerGeometry, clampNumber, sampleArcPoints } from "./planeGeometry";

export interface PlaneLabelLayoutContext {
  viewport: PlaneViewport;
  containerWidth: number;
  containerHeight: number;
}

export interface PlaneLabelRenderMetrics {
  fontSizePx: number;
  formulaFontSizePx: number;
  haloPaddingPx: number;
  defaultOffsetWorldUnits: number;
}

export function readLabelAnchor(object: Record<string, unknown>) {
  return String(object.label_anchor || "auto");
}

export function readLabelOffset(object: Record<string, unknown>, key: "label_offset_dx" | "label_offset_dy") {
  const value = Number(object[key]);
  return Number.isFinite(value) ? value : 0;
}

export function shouldRenderCustomLabel(type: string) {
  return ["point", "segment", "line", "curve", "circle", "ellipse", "polygon", "arc", "angle_marker", "vector"].includes(type);
}

export function getLabelRenderMetrics(context: PlaneLabelLayoutContext): PlaneLabelRenderMetrics {
  const containerWidth = Math.max(context.containerWidth, 1);
  const containerHeight = Math.max(context.containerHeight, 1);
  const xSpan = Math.max(0.0001, context.viewport.x_max - context.viewport.x_min);
  const ySpan = Math.max(0.0001, context.viewport.y_max - context.viewport.y_min);
  const spanFactor = Math.max(xSpan / 20, ySpan / 12, 1);
  const worldUnitsPerPixel = Math.max(xSpan / containerWidth, ySpan / containerHeight);
  const fontSizePx = clampNumber(19 - (Math.log2(spanFactor) * 1.5), 14, 20);
  const formulaFontSizePx = clampNumber(fontSizePx + 2, 16, 24);
  const haloPaddingPx = clampNumber(Math.round(fontSizePx * 0.45), 5, 10);
  const defaultOffsetWorldUnits = clampNumber(
    worldUnitsPerPixel * (fontSizePx * 1.8),
    0.16,
    Math.max(xSpan, ySpan) * 0.08
  );
  return {
    fontSizePx,
    formulaFontSizePx,
    haloPaddingPx,
    defaultOffsetWorldUnits,
  };
}

export function computeBoxAnchor(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  anchor: string
) {
  if (anchor === "center" || anchor === "auto") {
    return { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2 };
  }
  if (anchor === "top") {
    return { x: (xMin + xMax) / 2, y: yMax };
  }
  if (anchor === "right") {
    return { x: xMax, y: (yMin + yMax) / 2 };
  }
  if (anchor === "bottom") {
    return { x: (xMin + xMax) / 2, y: yMin };
  }
  if (anchor === "left") {
    return { x: xMin, y: (yMin + yMax) / 2 };
  }
  return { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2 };
}

export function computeCustomLabelPosition(
  object: Record<string, unknown>,
  context: PlaneLabelLayoutContext
) {
  const type = String(object.type || "");
  const anchor = readLabelAnchor(object);
  const dx = readLabelOffset(object, "label_offset_dx");
  const dy = readLabelOffset(object, "label_offset_dy");
  const metrics = getLabelRenderMetrics(context);

  if (type === "point") {
    const pointX = Number(object.x || 0);
    const pointY = Number(object.y || 0);
    const defaultOffset = metrics.defaultOffsetWorldUnits;
    let base = { x: pointX, y: pointY + defaultOffset };
    if (anchor === "center") {
      base = { x: pointX, y: pointY };
    } else if (anchor === "right") {
      base = { x: pointX + defaultOffset, y: pointY };
    } else if (anchor === "bottom") {
      base = { x: pointX, y: pointY - defaultOffset };
    } else if (anchor === "left") {
      base = { x: pointX - defaultOffset, y: pointY };
    }
    return { x: base.x + dx, y: base.y + dy };
  }

  if (type === "segment" || type === "line" || type === "vector") {
    const x1 = Number(object.x1 || 0);
    const y1 = Number(object.y1 || 0);
    const x2 = Number(object.x2 || 0);
    const y2 = Number(object.y2 || 0);
    let base = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    if (anchor === "start") {
      base = { x: x1, y: y1 };
    } else if (anchor === "end") {
      base = { x: x2, y: y2 };
    } else if (anchor !== "midpoint" && anchor !== "auto") {
      base = computeBoxAnchor(Math.min(x1, x2), Math.max(x1, x2), Math.min(y1, y2), Math.max(y1, y2), anchor);
    }
    return { x: base.x + dx, y: base.y + dy };
  }

  if (type === "circle") {
    const centerX = Number(object.center_x || 0);
    const centerY = Number(object.center_y || 0);
    const radius = Math.max(0.0001, Number(object.radius || 1));
    const edgeOffset = Math.max(metrics.defaultOffsetWorldUnits * 0.8, 0.12);
    let base = { x: centerX, y: centerY + radius + edgeOffset };
    if (anchor === "center") {
      base = { x: centerX, y: centerY };
    } else if (anchor === "right") {
      base = { x: centerX + radius + edgeOffset, y: centerY };
    } else if (anchor === "bottom") {
      base = { x: centerX, y: centerY - radius - edgeOffset };
    } else if (anchor === "left") {
      base = { x: centerX - radius - edgeOffset, y: centerY };
    }
    return { x: base.x + dx, y: base.y + dy };
  }

  if (type === "ellipse") {
    const centerX = Number(object.center_x || 0);
    const centerY = Number(object.center_y || 0);
    const radiusX = Math.max(0.0001, Number(object.radius_x || 1));
    const radiusY = Math.max(0.0001, Number(object.radius_y || 1));
    const edgeOffset = Math.max(metrics.defaultOffsetWorldUnits * 0.8, 0.12);
    let base = { x: centerX, y: centerY + radiusY + edgeOffset };
    if (anchor === "center") {
      base = { x: centerX, y: centerY };
    } else if (anchor === "right") {
      base = { x: centerX + radiusX + edgeOffset, y: centerY };
    } else if (anchor === "bottom") {
      base = { x: centerX, y: centerY - radiusY - edgeOffset };
    } else if (anchor === "left") {
      base = { x: centerX - radiusX - edgeOffset, y: centerY };
    }
    return { x: base.x + dx, y: base.y + dy };
  }

  if (type === "polygon") {
    const points = Array.isArray(object.points) ? object.points as Array<{ x: number; y: number }> : [];
    if (points.length === 0) {
      return { x: dx, y: dy };
    }
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const centroid = {
      x: xs.reduce((sum, value) => sum + value, 0) / xs.length,
      y: ys.reduce((sum, value) => sum + value, 0) / ys.length,
    };
    const base = anchor === "center" || anchor === "auto"
      ? centroid
      : computeBoxAnchor(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), anchor);
    return { x: base.x + dx, y: base.y + dy };
  }

  if (type === "arc") {
    const points = sampleArcPoints(
      Number(object.center_x || 0),
      Number(object.center_y || 0),
      Math.max(0.0001, Number(object.radius || 1)),
      Number(object.start_angle_deg || 0),
      Number(object.end_angle_deg || 90)
    );
    const pointIndex = Math.floor(points.x.length / 2);
    const defaultPoint = { x: points.x[pointIndex] || 0, y: points.y[pointIndex] || 0 };
    if (anchor === "midpoint" || anchor === "auto") {
      return { x: defaultPoint.x + dx, y: defaultPoint.y + dy };
    }
    const base = computeBoxAnchor(
      Math.min(...points.x),
      Math.max(...points.x),
      Math.min(...points.y),
      Math.max(...points.y),
      anchor
    );
    return { x: base.x + dx, y: base.y + dy };
  }

  if (type === "angle_marker") {
    const vertexX = Number(object.vertex_x || 0);
    const vertexY = Number(object.vertex_y || 0);
    const radius = Math.max(0.0001, Number(object.radius || 1));
    const sweepDirection = object.sweep_direction === "clockwise" ? "clockwise" : "counterclockwise";
    const geometry = buildAngleMarkerGeometry(
      Number(object.ax || 0),
      Number(object.ay || 0),
      vertexX,
      vertexY,
      Number(object.bx || 0),
      Number(object.by || 0),
      sweepDirection
    );
    const labelRadius = anchor === "center"
      ? Math.max(radius * 0.68, radius - metrics.defaultOffsetWorldUnits)
      : radius + Math.max(metrics.defaultOffsetWorldUnits * 0.5, 0.1);
    const theta = (geometry.bisector_angle_deg * Math.PI) / 180;
    const midpointBase = {
      x: vertexX + (Math.cos(theta) * labelRadius),
      y: vertexY + (Math.sin(theta) * labelRadius),
    };
    if (anchor === "midpoint" || anchor === "auto" || anchor === "center") {
      return { x: midpointBase.x + dx, y: midpointBase.y + dy };
    }
    const points = sampleArcPoints(
      vertexX,
      vertexY,
      radius,
      geometry.start_angle_deg,
      geometry.end_angle_deg
    );
    const base = computeBoxAnchor(
      Math.min(...points.x),
      Math.max(...points.x),
      Math.min(...points.y),
      Math.max(...points.y),
      anchor
    );
    return { x: base.x + dx, y: base.y + dy };
  }

  if (type === "curve") {
    const points = Array.isArray(object.points) ? object.points as Array<{ x: number; y: number }> : [];
    if (points.length === 0) {
      return { x: dx, y: dy };
    }
    const midpoint = points[Math.floor(points.length / 2)];
    if (anchor === "midpoint" || anchor === "auto") {
      return { x: midpoint.x + dx, y: midpoint.y + dy };
    }
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const base = computeBoxAnchor(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), anchor);
    return { x: base.x + dx, y: base.y + dy };
  }

  return { x: dx, y: dy };
}
