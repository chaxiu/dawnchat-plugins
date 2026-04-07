import {
  buildAngleMarkerGeometry,
  buildAspectSafeBoundingBox,
  sampleArcPoints,
  sampleEllipsePoints,
  sampleRightAngleSquarePoints,
} from "../runtime/planeGeometry";

describe("planeGeometry", () => {
  it("samples ellipse points across the full shape", () => {
    const result = sampleEllipsePoints(2, 3, 4, 2, 8);

    expect(result.x).toHaveLength(9);
    expect(result.y).toHaveLength(9);
    expect(result.x[0]).toBeCloseTo(6);
    expect(result.y[0]).toBeCloseTo(3);
  });

  it("samples arc points from start angle to end angle", () => {
    const result = sampleArcPoints(0, 0, 2, 0, 90, 4);

    expect(result.x[0]).toBeCloseTo(2);
    expect(result.y[0]).toBeCloseTo(0);
    expect(result.x.at(-1) || 0).toBeCloseTo(0);
    expect(result.y.at(-1) || 0).toBeCloseTo(2);
  });

  it("builds clockwise and counterclockwise angle marker sweeps", () => {
    const counterclockwise = buildAngleMarkerGeometry(4, 0, 0, 0, 2, 2, "counterclockwise");
    const clockwise = buildAngleMarkerGeometry(2, 2, 4, 0, 6, 0, "clockwise");

    expect(counterclockwise.sweep_deg).toBeGreaterThan(0);
    expect(counterclockwise.bisector_angle_deg).toBeCloseTo(22.5);
    expect(clockwise.sweep_deg).toBeLessThan(0);
    expect(clockwise.bisector_angle_deg).toBeCloseTo(67.5);
  });

  it("samples a right-angle square polyline", () => {
    const points = sampleRightAngleSquarePoints(0, 0, 90, 0, 1);

    expect(points.x).toHaveLength(3);
    expect(points.y).toHaveLength(3);
    expect(points.x[0]).toBeCloseTo(0);
    expect(points.y[0]).toBeGreaterThan(0);
    expect(points.x[1]).toBeGreaterThan(0);
    expect(points.y[1]).toBeGreaterThan(0);
    expect(points.x[2]).toBeGreaterThan(0);
    expect(points.y[2]).toBeCloseTo(0);
  });

  it("expands bounding box to keep equal axis scale", () => {
    const box = buildAspectSafeBoundingBox({
      x_min: -10,
      x_max: 10,
      y_min: -6,
      y_max: 6,
      show_grid: true,
      show_axes: true,
    }, 200, 100);

    expect(box).toEqual([-12, 6, 12, -6]);
  });
});
