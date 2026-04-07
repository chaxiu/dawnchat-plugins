import {
  buildBoardMainStateSummary,
  openBoardMainView,
  validateBoardResource,
} from "../boardMain.view";

describe("board.main resource", () => {
  it("opens board.main with normalized board payload", () => {
    const result = openBoardMainView({
      resource: {
        resource_type: "board.workspace",
        title: "Case Cluster",
        data: {
          board_id: "board:case-cluster",
          description: "Track linked entities across one visual board.",
          nodes: [
            {
              id: "node-alpha",
              title: "Alpha",
              description: "Lead note",
              media_type: "text",
              semantic_type: "note",
              tags: ["lead"],
              position: { x: 12, y: 24 },
              size: { width: 240, height: 148 },
              pinned: false,
              data: {
                content: "alpha",
              },
            },
            {
              id: "node-beta",
              title: "Beta",
              description: "Evidence node",
              media_type: "image",
              semantic_type: "evidence",
              tags: ["photo"],
              position: { x: 300, y: 120 },
              size: { width: 240, height: 148 },
              pinned: true,
              data: {},
            },
          ],
          edges: [
            {
              id: "edge-alpha-beta",
              source: "node-alpha",
              target: "node-beta",
              ports_mode: "fixed",
              source_handle: undefined,
              target_handle: undefined,
              directed: true,
              label: "links",
            },
          ],
          viewport: { x: 0, y: 0, zoom: 1 },
          selection: {
            selected_node_ids: ["node-alpha"],
            selected_edge_ids: [],
            focused_node_id: "node-alpha",
          },
          layout_mode: "mixed",
          style_settings: {
            layout_algorithm: "mindmap",
          },
        },
      },
    });

    expect(result).toEqual(expect.objectContaining({
      resource: expect.objectContaining({
        resource_type: "board.workspace",
        resource_id: "board:holographic-clue-wall",
        title: "Case Cluster",
        data: expect.objectContaining({
          board_id: "board:case-cluster",
          description: "Track linked entities across one visual board.",
          layout_mode: "mixed",
          style_settings: expect.objectContaining({
            layout_algorithm: "mindmap",
          }),
          nodes: expect.arrayContaining([
            expect.objectContaining({
              id: "node-alpha",
              title: "Alpha",
              media_type: "text",
              semantic_type: "note",
            }),
            expect.objectContaining({
              id: "node-beta",
              pinned: true,
            }),
          ]),
          edges: [
            {
              id: "edge-alpha-beta",
              source: "node-alpha",
              target: "node-beta",
              ports_mode: "fixed",
              source_handle: undefined,
              target_handle: undefined,
              directed: true,
              label: "links",
            },
          ],
        }),
      }),
      activeAnchor: "board.canvas",
      data: {
        status: "applied",
        resource_id: "board:holographic-clue-wall",
      },
    }));
  });

  it("defaults style_settings.layout_algorithm to stress for legacy payload", () => {
    const result = openBoardMainView({
      resource: {
        resource_type: "board.workspace",
        data: {
          nodes: [],
          edges: [],
          style_settings: {
            handles_mode: "left-right",
          },
        },
      },
    });
    if ("ok" in result && result.ok === false) {
      throw new Error(result.message);
    }
    expect(result.resource?.data?.style_settings).toEqual(expect.objectContaining({
      layout_algorithm: "stress",
    }));
  });

  it("rejects invalid board resource payload", () => {
    const result = validateBoardResource({
      resource_type: "wrong.type",
      data: {},
    });

    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_resource",
      message: "board.main requires resource.resource_type to be 'board.workspace'",
      data: undefined,
    });
  });

  it("builds lightweight board summary with configurable limits", () => {
    const openResult = openBoardMainView({});
    if ("ok" in openResult && openResult.ok === false) {
      throw new Error(openResult.message);
    }
    const summary = buildBoardMainStateSummary(openResult.resource, "board.canvas", {
      max_nodes: 2,
      max_edges: 1,
    });

    expect(summary).toEqual(expect.objectContaining({
      node_count: 3,
      edge_count: 2,
      nodes_brief: [
        expect.objectContaining({
          id: "node-case-brief",
          title: "Case Brief",
        }),
        expect.objectContaining({
          id: "node-suspect-photo",
          title: "Suspect Photo",
        }),
      ],
      edges_brief: [
        expect.objectContaining({
          id: "edge-case-photo",
        }),
      ],
      title_index: expect.objectContaining({
        "case brief": ["node-case-brief"],
      }),
      summary_limits: {
        applied_max_nodes: 2,
        applied_max_edges: 1,
        has_more_nodes: true,
        has_more_edges: true,
      },
    }));
  });
});
