import {
  buildAngleMarkerGeometry,
  sampleArcPoints,
  sampleEllipsePoints,
  sampleRightAngleSquarePoints,
} from "./planeGeometry";
import {
  computeCustomLabelPosition,
  getLabelRenderMetrics,
  shouldRenderCustomLabel,
  type PlaneLabelLayoutContext,
} from "./planeLabelLayout";

export interface JxgElementLike {
  setAttribute: (attributes: Record<string, unknown>) => void;
  moveTo?: (coordinates: number[], durationMs?: number) => void;
  coords?: {
    usrCoords?: number[];
  };
}

export interface JxgBoardLike {
  create: (type: string, args: unknown[], options?: Record<string, unknown>) => any;
}

export interface PlaneRenderedSceneEntry {
  element: JxgElementLike;
  extraElements?: JxgElementLike[];
  type: string;
  color: string;
  fillColor: string;
  opacity: number;
  width: number;
}

function readStrokeWidth(object: Record<string, unknown>, fallback = 2) {
  return Number(object.width || fallback);
}

function readFillColor(object: Record<string, unknown>, fallback: string) {
  return String(object.fill_color || fallback);
}

function readOpacity(object: Record<string, unknown>, fallback = 1) {
  const value = Number(object.opacity);
  return Number.isFinite(value) ? value : fallback;
}

function buildTextStyle(fontSizePx: number, haloPaddingPx: number, emphasized = false) {
  const fontWeight = emphasized ? 700 : 650;
  const blur = Math.max(haloPaddingPx - 2, 2);
  return [
    `font-size:${fontSizePx}px`,
    `font-weight:${fontWeight}`,
    "letter-spacing:0.02em",
    `text-shadow:0 0 ${blur}px rgba(4, 10, 20, 0.92), 0 0 ${haloPaddingPx}px rgba(4, 10, 20, 0.76)`,
  ].join(";");
}

function buildTextElement(
  board: JxgBoardLike,
  context: PlaneLabelLayoutContext,
  x: number,
  y: number,
  text: string,
  color: string,
  options?: {
    cssClass?: string;
    emphasized?: boolean;
  }
) {
  const metrics = getLabelRenderMetrics(context);
  const emphasized = options?.emphasized || false;
  const fontSizePx = emphasized ? metrics.formulaFontSizePx : metrics.fontSizePx;
  return board.create("text", [x, y, text], {
    fixed: true,
    highlight: false,
    cssClass: options?.cssClass || "plane-board-text",
    cssStyle: buildTextStyle(fontSizePx, metrics.haloPaddingPx, emphasized),
    strokeColor: color,
  }) as JxgElementLike;
}

function buildCustomLabelElements(
  board: JxgBoardLike,
  object: Record<string, unknown>,
  color: string,
  context: PlaneLabelLayoutContext
) {
  const label = String(object.label || "");
  if (!shouldRenderCustomLabel(String(object.type || "")) || !label) {
    return [] as JxgElementLike[];
  }
  const position = computeCustomLabelPosition(object, context);
  return [buildTextElement(board, context, position.x, position.y, label, color)];
}

export function applyVisualState(
  element: JxgElementLike,
  {
    color,
    fillColor,
    width,
    opacity,
  }: {
    color: string;
    fillColor: string;
    width: number;
    opacity: number;
  }
) {
  element.setAttribute({
    strokeColor: color,
    fillColor,
    strokeWidth: width,
    fillOpacity: opacity,
    strokeOpacity: opacity,
  });
}

export function createSceneElement(
  board: JxgBoardLike,
  object: Record<string, unknown>,
  context: PlaneLabelLayoutContext
): PlaneRenderedSceneEntry | null {
  const type = String(object.type || "");
  const color = String(object.color || "#8dd3ff");
  if (type === "point") {
    const fillColor = readFillColor(object, color);
    const opacity = readOpacity(object, 1);
    return {
      element: board.create("point", [object.x, object.y], {
        name: "",
        withLabel: false,
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        fillOpacity: opacity,
        strokeOpacity: opacity,
        size: object.size || 3,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width: 2,
    };
  }
  if (type === "segment") {
    const fillColor = readFillColor(object, color);
    const opacity = readOpacity(object, 1);
    const width = readStrokeWidth(object);
    return {
      element: board.create("segment", [[object.x1, object.y1], [object.x2, object.y2]], {
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        strokeWidth: width,
        strokeOpacity: opacity,
        dash: object.dashed ? 2 : 0,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width,
    };
  }
  if (type === "line") {
    const fillColor = readFillColor(object, color);
    const opacity = readOpacity(object, 1);
    const width = readStrokeWidth(object);
    return {
      element: board.create("line", [[object.x1, object.y1], [object.x2, object.y2]], {
        straightFirst: true,
        straightLast: true,
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        strokeWidth: width,
        strokeOpacity: opacity,
        dash: object.dashed ? 2 : 0,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width,
    };
  }
  if (type === "curve") {
    const points = Array.isArray(object.points) ? object.points as Array<{ x: number; y: number }> : [];
    const fillColor = readFillColor(object, color);
    const opacity = readOpacity(object, 1);
    const width = readStrokeWidth(object);
    return {
      element: board.create("curve", [
        points.map((point) => point.x),
        points.map((point) => point.y),
      ], {
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        strokeWidth: width,
        strokeOpacity: opacity,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width,
    };
  }
  if (type === "circle") {
    const fillColor = readFillColor(object, "rgba(105, 183, 255, 0.16)");
    const opacity = readOpacity(object, 0.9);
    const width = readStrokeWidth(object);
    const centerX = Number(object.center_x || 0);
    const centerY = Number(object.center_y || 0);
    const radius = Math.max(0.0001, Number(object.radius || 1));
    return {
      element: board.create("circle", [[centerX, centerY], [centerX + radius, centerY]], {
        name: "",
        withLabel: false,
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        strokeWidth: width,
        fillOpacity: opacity,
        strokeOpacity: opacity,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width,
    };
  }
  if (type === "ellipse") {
    const fillColor = readFillColor(object, "rgba(124, 224, 255, 0.14)");
    const opacity = readOpacity(object, 0.9);
    const width = readStrokeWidth(object);
    const points = sampleEllipsePoints(
      Number(object.center_x || 0),
      Number(object.center_y || 0),
      Math.max(0.0001, Number(object.radius_x || 1)),
      Math.max(0.0001, Number(object.radius_y || 1))
    );
    return {
      element: board.create("curve", [points.x, points.y], {
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        strokeWidth: width,
        fillOpacity: opacity,
        strokeOpacity: opacity,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width,
    };
  }
  if (type === "polygon") {
    const points = Array.isArray(object.points) ? object.points as Array<{ x: number; y: number }> : [];
    const fillColor = readFillColor(object, "rgba(245, 184, 97, 0.18)");
    const opacity = readOpacity(object, 0.9);
    const width = readStrokeWidth(object);
    return {
      element: board.create("polygon", points.map((point) => [point.x, point.y]), {
        withLabel: false,
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        borders: {
          strokeColor: color,
          strokeWidth: width,
          strokeOpacity: opacity,
        },
        fillOpacity: opacity,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width,
    };
  }
  if (type === "arc") {
    const fillColor = readFillColor(object, "rgba(244, 163, 255, 0.08)");
    const opacity = readOpacity(object, 0.92);
    const width = readStrokeWidth(object);
    const points = sampleArcPoints(
      Number(object.center_x || 0),
      Number(object.center_y || 0),
      Math.max(0.0001, Number(object.radius || 1)),
      Number(object.start_angle_deg || 0),
      Number(object.end_angle_deg || 90)
    );
    return {
      element: board.create("curve", [points.x, points.y], {
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        strokeWidth: width,
        strokeOpacity: opacity,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width,
    };
  }
  if (type === "angle_marker") {
    const fillColor = readFillColor(object, "rgba(255, 184, 107, 0.12)");
    const opacity = readOpacity(object, 1);
    const width = readStrokeWidth(object);
    const geometry = buildAngleMarkerGeometry(
      Number(object.ax || 0),
      Number(object.ay || 0),
      Number(object.vertex_x || 0),
      Number(object.vertex_y || 0),
      Number(object.bx || 0),
      Number(object.by || 0),
      object.sweep_direction === "clockwise" ? "clockwise" : "counterclockwise"
    );
    const markerStyle = String(object.marker_style || "arc");
    const points = markerStyle === "right_angle_square"
      ? sampleRightAngleSquarePoints(
        Number(object.vertex_x || 0),
        Number(object.vertex_y || 0),
        geometry.start_angle_deg,
        geometry.end_angle_deg,
        Math.max(0.0001, Number(object.radius || 1))
      )
      : sampleArcPoints(
        Number(object.vertex_x || 0),
        Number(object.vertex_y || 0),
        Math.max(0.0001, Number(object.radius || 1)),
        geometry.start_angle_deg,
        geometry.end_angle_deg
      );
    return {
      element: board.create("curve", [points.x, points.y], {
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        strokeWidth: width,
        strokeOpacity: opacity,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width,
    };
  }
  if (type === "vector") {
    const fillColor = readFillColor(object, color);
    const opacity = readOpacity(object, 1);
    const width = readStrokeWidth(object);
    return {
      element: board.create("arrow", [[object.x1, object.y1], [object.x2, object.y2]], {
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        strokeWidth: width,
        strokeOpacity: opacity,
        fillOpacity: opacity,
        dash: object.dashed ? 2 : 0,
      }),
      type,
      extraElements: buildCustomLabelElements(board, object, color, context),
      color,
      fillColor,
      opacity,
      width,
    };
  }
  if (type === "label") {
    const fillColor = readFillColor(object, color);
    const opacity = readOpacity(object, 1);
    return {
      element: buildTextElement(
        board,
        context,
        Number(object.x || 0),
        Number(object.y || 0),
        String(object.text || object.label || ""),
        color,
        { cssClass: "plane-board-text" }
      ),
      type,
      color,
      fillColor,
      opacity,
      width: 1,
    };
  }
  if (type === "formula_label") {
    const fillColor = readFillColor(object, color);
    const opacity = readOpacity(object, 1);
    return {
      element: buildTextElement(
        board,
        context,
        Number(object.x || 0),
        Number(object.y || 0),
        String(object.text || ""),
        color,
        { cssClass: "plane-formula-text", emphasized: true }
      ),
      type,
      color,
      fillColor,
      opacity,
      width: 1,
    };
  }
  if (type === "marker") {
    const fillColor = readFillColor(object, color);
    const opacity = readOpacity(object, 1);
    return {
      element: board.create("point", [object.x, object.y], {
        name: object.label || "",
        withLabel: Boolean(object.label),
        face: "x",
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        fillOpacity: opacity,
        strokeOpacity: opacity,
        size: object.size || 4,
      }),
      type,
      color,
      fillColor,
      opacity,
      width: 2,
    };
  }
  if (type === "object") {
    const fillColor = readFillColor(object, color);
    const opacity = readOpacity(object, 1);
    return {
      element: board.create("point", [object.x, object.y], {
        name: object.label || "",
        withLabel: Boolean(object.label),
        face: object.shape === "rect" ? "[]" : "o",
        fixed: true,
        highlight: false,
        strokeColor: color,
        fillColor,
        fillOpacity: opacity,
        strokeOpacity: opacity,
        size: object.size || 6,
      }),
      type,
      color,
      fillColor,
      opacity,
      width: 2,
    };
  }
  return null;
}
