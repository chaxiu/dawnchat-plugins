import {
  coordinatePlaneMainView,
  COORDINATE_PLANE_DEFAULT_RESOURCE,
  normalizeCoordinatePlaneResource,
} from "../coordinatePlaneMain.view";
import { invokeCoordinatePlaneMainCapability } from "../capabilities";
import { coordinatePlaneMainExampleNames } from "../examples";

function collectCapabilityIds(value: unknown, collector = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectCapabilityIds(item, collector);
    }
    return collector;
  }
  if (!value || typeof value !== "object") {
    return collector;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.capability_id === "string") {
    collector.add(record.capability_id);
  }
  for (const nestedValue of Object.values(record)) {
    collectCapabilityIds(nestedValue, collector);
  }
  return collector;
}

describe("plane.main capabilities", () => {
  it("exposes expected capability catalog", () => {
    expect(coordinatePlaneMainView.route.full_path).toBe("/views/plane/main");
    expect(coordinatePlaneMainView.capabilities.map((item) => item.id)).toEqual([
      "plane.set_viewport",
      "plane.clear_scene",
      "plane.add_point",
      "plane.add_line",
      "plane.add_curve",
      "plane.add_circle",
      "plane.add_ellipse",
      "plane.add_polygon",
      "plane.add_arc",
      "plane.add_angle_marker",
      "plane.add_vector",
      "plane.add_annotation",
      "plane.show_formula_label",
      "plane.set_label",
      "plane.highlight",
      "plane.clear_highlight",
      "plane.set_style",
      "plane.focus_region",
      "plane.add_object",
      "plane.animate_object",
      "plane.get_scene_state",
    ]);
  });

  it("sets viewport and adds core scene objects", async () => {
    const viewportResult = await invokeCoordinatePlaneMainCapability("plane.set_viewport", {
      x_min: -1,
      x_max: 15,
      y_min: -3,
      y_max: 8,
      show_grid: false,
      show_axes: true,
    }, COORDINATE_PLANE_DEFAULT_RESOURCE);
    const withViewport = "ok" in viewportResult && viewportResult.ok === false
      ? COORDINATE_PLANE_DEFAULT_RESOURCE
      : (viewportResult.state_binding || COORDINATE_PLANE_DEFAULT_RESOURCE);

    const pointResult = await invokeCoordinatePlaneMainCapability("plane.add_point", {
      id: "point-a",
      x: 3,
      y: 4,
      label: "A",
    }, withViewport);
    const withPoint = "ok" in pointResult && pointResult.ok === false ? withViewport : (pointResult.state_binding || withViewport);

    const lineResult = await invokeCoordinatePlaneMainCapability("plane.add_line", {
      id: "segment-a",
      line_type: "segment",
      x1: 0,
      y1: 0,
      x2: 5,
      y2: 5,
    }, withPoint);
    const withLine = "ok" in lineResult && lineResult.ok === false ? withPoint : (lineResult.state_binding || withPoint);

    const curveResult = await invokeCoordinatePlaneMainCapability("plane.add_curve", {
      id: "curve-a",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0.5 },
      ],
    }, withLine);

    expect(curveResult).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        object_id: "curve-a",
        point_count: 3,
      }),
      state_binding: expect.objectContaining({
        data: expect.objectContaining({
          viewport: expect.objectContaining({
            x_min: -1,
            x_max: 15,
            show_grid: false,
          }),
          objects: expect.arrayContaining([
            expect.objectContaining({ id: "point-a", type: "point" }),
            expect.objectContaining({ id: "segment-a", type: "segment" }),
            expect.objectContaining({ id: "curve-a", type: "curve" }),
          ]),
        }),
      }),
    }));
  });

  it("adds annotations, highlights, and clears them", async () => {
    const resource = normalizeCoordinatePlaneResource({
      binding_type: "plane.scene",
      data: {
        objects: [
          { id: "point-a", type: "point", x: 1, y: 1, label: "A" },
        ],
      },
    });

    const annotationResult = await invokeCoordinatePlaneMainCapability("plane.add_annotation", {
      id: "label-a",
      annotation_type: "label",
      x: 1.2,
      y: 1.4,
      text: "关键点 A",
    }, resource);
    const withAnnotation = "ok" in annotationResult && annotationResult.ok === false
      ? resource
      : (annotationResult.state_binding || resource);

    const highlightResult = await invokeCoordinatePlaneMainCapability("plane.highlight", {
      id: "focus-a",
      target_ids: ["point-a"],
      label: "Look here",
    }, withAnnotation);

    expect(highlightResult).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        highlight_id: "focus-a",
        highlight_count: 1,
      }),
    }));

    const withHighlight = "ok" in highlightResult && highlightResult.ok === false
      ? withAnnotation
      : (highlightResult.state_binding || withAnnotation);
    const clearResult = await invokeCoordinatePlaneMainCapability("plane.clear_highlight", {}, withHighlight);

    expect(clearResult).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        highlight_count: 0,
      }),
      state_binding: expect.objectContaining({
        data: expect.objectContaining({
          highlights: [],
        }),
      }),
    }));
  });

  it("adds phase 2A geometry primitives and helper labels", async () => {
    const circleResult = await invokeCoordinatePlaneMainCapability("plane.add_circle", {
      id: "circle-o",
      center_x: 0,
      center_y: 0,
      radius: 4,
      label: "Circle O",
    }, COORDINATE_PLANE_DEFAULT_RESOURCE);
    const withCircle = "ok" in circleResult && circleResult.ok === false
      ? COORDINATE_PLANE_DEFAULT_RESOURCE
      : (circleResult.state_binding || COORDINATE_PLANE_DEFAULT_RESOURCE);

    const polygonResult = await invokeCoordinatePlaneMainCapability("plane.add_polygon", {
      id: "triangle-abc",
      points: [
        { x: -1, y: -1 },
        { x: 3, y: -1 },
        { x: 1, y: 2 },
      ],
    }, withCircle);
    const withPolygon = "ok" in polygonResult && polygonResult.ok === false
      ? withCircle
      : (polygonResult.state_binding || withCircle);

    const formulaResult = await invokeCoordinatePlaneMainCapability("plane.show_formula_label", {
      id: "formula-1",
      x: 1.5,
      y: 3.2,
      text: "r = OA = 4",
    }, withPolygon);

    expect(formulaResult).toEqual(expect.objectContaining({
      state_binding: expect.objectContaining({
        data: expect.objectContaining({
          objects: expect.arrayContaining([
            expect.objectContaining({ id: "circle-o", type: "circle", radius: 4 }),
            expect.objectContaining({ id: "triangle-abc", type: "polygon" }),
            expect.objectContaining({ id: "formula-1", type: "formula_label", text: "r = OA = 4" }),
          ]),
        }),
      }),
    }));
  });

  it("adds one angle marker with explicit sweep direction", async () => {
    const result = await invokeCoordinatePlaneMainCapability("plane.add_angle_marker", {
      id: "angle-cbd",
      ax: 2,
      ay: 2,
      vertex_x: 4,
      vertex_y: 0,
      bx: 6,
      by: 0,
      sweep_direction: "clockwise",
      marker_style: "right_angle_square",
      radius: 0.9,
      label: "∠CBD",
      width: 3,
    }, COORDINATE_PLANE_DEFAULT_RESOURCE);

    expect(result).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        object_id: "angle-cbd",
        object_type: "angle_marker",
        sweep_direction: "clockwise",
        marker_style: "right_angle_square",
        sweep_deg: expect.any(Number),
      }),
      state_binding: expect.objectContaining({
        data: expect.objectContaining({
          objects: expect.arrayContaining([
            expect.objectContaining({
              id: "angle-cbd",
              type: "angle_marker",
              sweep_direction: "clockwise",
              marker_style: "right_angle_square",
              radius: 0.9,
              label: "∠CBD",
            }),
          ]),
        }),
      }),
    }));
    expect("ok" in result && result.ok === false).toBe(false);
    if (!("ok" in result && result.ok === false)) {
      expect(Number(result.data?.sweep_deg)).toBeLessThan(0);
    }
  });

  it("patches object labels and lightweight label position", async () => {
    const resource = normalizeCoordinatePlaneResource({
      binding_type: "plane.scene",
      data: {
        objects: [
          {
            id: "radius-oa",
            type: "segment",
            x1: 0,
            y1: 0,
            x2: 4,
            y2: 0,
          },
        ],
      },
    });

    const labelResult = await invokeCoordinatePlaneMainCapability("plane.set_label", {
      target_id: "radius-oa",
      label: "OA",
      label_anchor: "midpoint",
      label_offset_dx: 0.2,
      label_offset_dy: 0.4,
    }, resource);

    expect(labelResult).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        target_id: "radius-oa",
        label: "OA",
        label_anchor: "midpoint",
        label_offset_dx: 0.2,
        label_offset_dy: 0.4,
      }),
      state_binding: expect.objectContaining({
        data: expect.objectContaining({
          objects: expect.arrayContaining([
            expect.objectContaining({
              id: "radius-oa",
              label: "OA",
              label_anchor: "midpoint",
              label_offset_dx: 0.2,
              label_offset_dy: 0.4,
            }),
          ]),
        }),
      }),
    }));
  });

  it("applies style patch and focuses one local region", async () => {
    const resource = normalizeCoordinatePlaneResource({
      binding_type: "plane.scene",
      data: {
        viewport: {
          x_min: -10,
          x_max: 10,
          y_min: -6,
          y_max: 6,
          show_grid: true,
          show_axes: true,
        },
        objects: [
          {
            id: "circle-o",
            type: "circle",
            center_x: 0,
            center_y: 0,
            radius: 4,
            color: "#69b7ff",
          },
        ],
      },
    });

    const styleResult = await invokeCoordinatePlaneMainCapability("plane.set_style", {
      target_ids: ["circle-o"],
      color: "#ffe08a",
      fill_color: "rgba(255, 224, 138, 0.12)",
      width: 4,
      opacity: 0.6,
    }, resource);
    const styledResource = "ok" in styleResult && styleResult.ok === false
      ? resource
      : (styleResult.state_binding || resource);
    const focusResult = await invokeCoordinatePlaneMainCapability("plane.focus_region", {
      center_x: 0,
      center_y: 0,
      x_span: 6,
      y_span: 6,
    }, styledResource);

    expect(focusResult).toEqual(expect.objectContaining({
      state_binding: expect.objectContaining({
        data: expect.objectContaining({
          viewport: expect.objectContaining({
            x_min: -3,
            x_max: 3,
            y_min: -3,
            y_max: 3,
          }),
          objects: expect.arrayContaining([
            expect.objectContaining({
              id: "circle-o",
              color: "#ffe08a",
              fill_color: "rgba(255, 224, 138, 0.12)",
              width: 4,
              opacity: 0.6,
            }),
          ]),
        }),
      }),
    }));
  });

  it("adds and animates moving objects", async () => {
    const addObjectResult = await invokeCoordinatePlaneMainCapability("plane.add_object", {
      id: "car-a",
      shape: "rect",
      x: 0,
      y: 1,
      label: "Car A",
    }, COORDINATE_PLANE_DEFAULT_RESOURCE);
    const withObject = "ok" in addObjectResult && addObjectResult.ok === false
      ? COORDINATE_PLANE_DEFAULT_RESOURCE
      : (addObjectResult.state_binding || COORDINATE_PLANE_DEFAULT_RESOURCE);

    const animateResult = await invokeCoordinatePlaneMainCapability("plane.animate_object", {
      object_id: "car-a",
      to_x: 8,
      to_y: 1,
      duration_ms: 1500,
    }, withObject);

    expect(animateResult).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        object_id: "car-a",
        duration_ms: 1500,
        to_x: 8,
        to_y: 1,
      }),
      state_binding: expect.objectContaining({
        data: expect.objectContaining({
          animation_state: expect.objectContaining({
            status: "playing",
            object_id: "car-a",
            duration_ms: 1500,
            to_x: 8,
            to_y: 1,
          }),
          objects: expect.arrayContaining([
            expect.objectContaining({
              id: "car-a",
              type: "object",
              x: 8,
              y: 1,
            }),
          ]),
        }),
      }),
    }));
  });

  it("reads current scene state and exposes geometry-oriented examples", async () => {
    const resource = normalizeCoordinatePlaneResource({
      binding_type: "plane.scene",
      data: {
        objects: [
          { id: "point-a", type: "point", x: 2, y: 3, label: "A" },
          { id: "car-a", type: "object", shape: "rect", x: 4, y: 1, label: "Car A" },
        ],
        highlights: [
          { id: "focus-1", target_ids: ["car-a"], label: "Follow car A" },
        ],
        animation_state: {
          status: "playing",
          object_id: "car-a",
          from_x: 2,
          from_y: 1,
          to_x: 4,
          to_y: 1,
          duration_ms: 1200,
          token: 2,
        },
      },
    });

    const result = await invokeCoordinatePlaneMainCapability("plane.get_scene_state", {}, resource);

    expect(result).toEqual(expect.objectContaining({
      activeAnchor: "plane.header",
      data: expect.objectContaining({
        object_count: 2,
        highlight_count: 1,
        object_types: expect.objectContaining({
          point: 1,
          object: 1,
        }),
        animation_state: expect.objectContaining({
          status: "playing",
          object_id: "car-a",
        }),
      }),
    }));

    expect(coordinatePlaneMainView.interaction_hints).toEqual(expect.objectContaining({
      recommended_mode: "session_start",
      decision_rule: expect.stringContaining("guide.narrate"),
      key_events: expect.arrayContaining([
        expect.objectContaining({
          type: "assistant.plane.animation_completed",
        }),
      ]),
      examples: expect.arrayContaining([
        expect.objectContaining({
          name: "session_draw_circle_and_radius",
          call: expect.objectContaining({
            payload: expect.objectContaining({
              steps: expect.arrayContaining([
                expect.objectContaining({
                  action: expect.objectContaining({
                    type: "view.capability.invoke",
                    payload: expect.objectContaining({
                      capability_id: "plane.add_circle",
                    }),
                  }),
                }),
                expect.objectContaining({
                  action: expect.objectContaining({
                    type: "view.capability.invoke",
                    payload: expect.objectContaining({
                      capability_id: "plane.set_label",
                    }),
                  }),
                }),
              ]),
            }),
          }),
        }),
        expect.objectContaining({
          name: "session_geometry_solution_steps_with_angle_marker",
        }),
        expect.objectContaining({
          name: "session_emphasize_formula_with_style_and_label",
        }),
      ]),
    }));

    const exampleNames = coordinatePlaneMainView.interaction_hints?.examples?.map((example) => example.name) || [];
    expect(exampleNames).toEqual(coordinatePlaneMainExampleNames);

    const declaredCapabilityIds = new Set(coordinatePlaneMainView.capabilities.map((item) => item.id));
    const referencedCapabilityIds = collectCapabilityIds(coordinatePlaneMainView.interaction_hints?.examples);
    expect(Array.from(referencedCapabilityIds).every((capabilityId) => declaredCapabilityIds.has(capabilityId))).toBe(true);
  });
});
