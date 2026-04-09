import {
  buildCoordinatePlaneMainStateSummary,
  normalizeCoordinatePlaneResource,
} from "../coordinatePlaneMain.view";

describe("plane.main summary", () => {
  it("builds a compact scene summary", () => {
    const resource = normalizeCoordinatePlaneResource({
      resource_type: "plane.scene",
      title: "Coordinate Lab",
      data: {
        viewport: {
          x_min: 0,
          x_max: 20,
          y_min: -5,
          y_max: 10,
          show_grid: true,
          show_axes: false,
        },
        objects: [
          { id: "p1", type: "point", x: 2, y: 3, label: "P1" },
          { id: "car-a", type: "object", shape: "rect", x: 3, y: 1, label: "Car A" },
        ],
        highlights: [
          { id: "focus-1", target_ids: ["car-a"], label: "Follow the car" },
        ],
        animation_state: {
          status: "playing",
          object_id: "car-a",
          from_x: 1,
          from_y: 1,
          to_x: 7,
          to_y: 1,
          duration_ms: 1200,
          token: 1,
        },
      },
    });

    expect(buildCoordinatePlaneMainStateSummary(resource, "plane.stage")).toEqual({
      resource_title: "Coordinate Lab",
      object_count: 2,
      object_types: {
        point: 1,
        object: 1,
      },
      highlight_count: 1,
      animation_status: "playing",
      animated_object_id: "car-a",
      viewport: {
        x_min: 0,
        x_max: 20,
        y_min: -5,
        y_max: 10,
        show_grid: true,
        show_axes: false,
      },
      active_anchor: "plane.stage",
    });
  });
});
