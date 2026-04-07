import {
  COORDINATE_PLANE_DEFAULT_RESOURCE,
  normalizeCoordinatePlaneResource,
  openCoordinatePlaneMainView,
  validateCoordinatePlaneResource,
} from "../coordinatePlaneMain.view";

describe("plane.main resource", () => {
  it("normalizes viewport defaults and scene data", () => {
    const resource = normalizeCoordinatePlaneResource({
      resource_type: "plane.scene",
      title: "Physics Lab",
      data: {
        viewport: {
          x_min: -4,
          x_max: 12,
          y_min: -3,
          y_max: 9,
          show_grid: false,
          show_axes: true,
        },
        objects: [
          {
            id: "car-a",
            type: "object",
            shape: "rect",
            x: 1,
            y: 2,
            label: "Car A",
          },
          {
            id: "circle-a",
            type: "circle",
            center_x: 0,
            center_y: 0,
            radius: 4,
          },
          {
            id: "angle-a",
            type: "angle_marker",
            ax: 4,
            ay: 0,
            vertex_x: 0,
            vertex_y: 0,
            bx: 2,
            by: 2,
            sweep_direction: "counterclockwise",
            radius: 0.8,
            label: "∠BAC",
          },
          {
            id: "formula-1",
            type: "formula_label",
            x: 2,
            y: 3,
            text: "r = 4",
          },
        ],
        highlights: [
          {
            id: "focus-1",
            target_ids: ["car-a", "circle-a"],
            label: "Observe car A",
          },
        ],
      },
    });

    expect(resource).toEqual(expect.objectContaining({
      resource_type: "plane.scene",
      title: "Physics Lab",
      data: expect.objectContaining({
        viewport: expect.objectContaining({
          x_min: -4,
          x_max: 12,
          y_min: -3,
          y_max: 9,
          show_grid: false,
          show_axes: true,
        }),
        objects: [
          expect.objectContaining({
            id: "car-a",
            type: "object",
            shape: "rect",
            label_anchor: "top",
          }),
          expect.objectContaining({
            id: "circle-a",
            type: "circle",
            radius: 4,
            label_anchor: "top",
          }),
          expect.objectContaining({
            id: "angle-a",
            type: "angle_marker",
            sweep_direction: "counterclockwise",
            marker_style: "arc",
            radius: 0.8,
            label_anchor: "midpoint",
          }),
          expect.objectContaining({
            id: "formula-1",
            type: "formula_label",
            text: "r = 4",
            label_anchor: "center",
          }),
        ],
        highlights: [
          expect.objectContaining({
            target_ids: ["car-a", "circle-a"],
          }),
        ],
      }),
    }));
  });

  it("rejects invalid resource types", () => {
    const result = validateCoordinatePlaneResource({
      resource_type: "image.deck",
    });

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      error_code: "invalid_view_resource",
    }));
  });

  it("opens with default anchor and default resource", () => {
    const result = openCoordinatePlaneMainView({ resource: {} });

    expect(result).toEqual(expect.objectContaining({
      activeAnchor: "plane.stage",
      resource: COORDINATE_PLANE_DEFAULT_RESOURCE,
    }));
  });
});
