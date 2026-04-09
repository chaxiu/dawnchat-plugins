import {
  computeCustomLabelPosition,
  getLabelRenderMetrics,
  shouldRenderCustomLabel,
} from "../runtime/planeLabelLayout";

const layoutContext = {
  viewport: {
    x_min: -10,
    x_max: 10,
    y_min: -6,
    y_max: 6,
    show_grid: true,
    show_axes: true,
  },
  containerWidth: 1000,
  containerHeight: 600,
};

describe("planeLabelLayout", () => {
  it("keeps a readable minimum font size on large viewports", () => {
    const metrics = getLabelRenderMetrics({
      ...layoutContext,
      viewport: {
        ...layoutContext.viewport,
        x_min: -50,
        x_max: 500,
        y_min: -50,
        y_max: 250,
      },
    });

    expect(metrics.fontSizePx).toBeGreaterThanOrEqual(14);
    expect(metrics.formulaFontSizePx).toBeGreaterThan(metrics.fontSizePx);
  });

  it("computes point label position outside the point by default", () => {
    const position = computeCustomLabelPosition({
      type: "point",
      x: 2,
      y: 3,
      label_anchor: "auto",
      label_offset_dx: 0,
      label_offset_dy: 0,
    }, layoutContext);

    expect(position.x).toBeCloseTo(2);
    expect(position.y).toBeGreaterThan(3);
  });

  it("computes segment midpoint label position", () => {
    const position = computeCustomLabelPosition({
      type: "segment",
      x1: 0,
      y1: 0,
      x2: 4,
      y2: 0,
      label_anchor: "midpoint",
      label_offset_dx: 0,
      label_offset_dy: 0.5,
    }, layoutContext);

    expect(position.x).toBeCloseTo(2);
    expect(position.y).toBeCloseTo(0.5);
  });

  it("computes angle marker label position along the selected bisector", () => {
    const position = computeCustomLabelPosition({
      type: "angle_marker",
      ax: 4,
      ay: 0,
      vertex_x: 0,
      vertex_y: 0,
      bx: 2,
      by: 2,
      radius: 0.8,
      sweep_direction: "counterclockwise",
      label_anchor: "midpoint",
      label_offset_dx: 0,
      label_offset_dy: 0,
    }, layoutContext);

    expect(position.x).toBeGreaterThan(0.4);
    expect(position.y).toBeGreaterThan(0.4);
  });

  it("marks supported scene objects for custom label rendering", () => {
    expect(shouldRenderCustomLabel("point")).toBe(true);
    expect(shouldRenderCustomLabel("arc")).toBe(true);
    expect(shouldRenderCustomLabel("angle_marker")).toBe(true);
    expect(shouldRenderCustomLabel("formula_label")).toBe(false);
  });
});
