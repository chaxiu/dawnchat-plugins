import {
  boardMainView,
  BOARD_DEFAULT_RESOURCE,
  cloneBoardResource,
} from "../boardMain.view";
import { invokeBoardMainCapability } from "../capabilities";

function nodesOverlap(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  gap = 0
) {
  const aPosition = a.position as Record<string, number>;
  const bPosition = b.position as Record<string, number>;
  const aSize = a.size as Record<string, number>;
  const bSize = b.size as Record<string, number>;
  return !(
    aPosition.x + aSize.width + gap <= bPosition.x
    || bPosition.x + bSize.width + gap <= aPosition.x
    || aPosition.y + aSize.height + gap <= bPosition.y
    || bPosition.y + bSize.height + gap <= aPosition.y
  );
}

describe("board.main capabilities", () => {
  it("exposes the expected board capability catalog", () => {
    expect(boardMainView.route.full_path).toBe("/views/board/main");
    expect((BOARD_DEFAULT_RESOURCE.data as Record<string, unknown>).style_settings).toEqual(expect.objectContaining({
      layout_algorithm: "stress",
    }));
    expect(boardMainView.capabilities.map((item) => item.id)).toEqual([
      "board.add_node",
      "board.update_node",
      "board.remove_node",
      "board.add_edge",
      "board.remove_edge",
      "board.arrange_layout",
      "board.pin_node",
      "board.unpin_node",
      "board.focus_node",
    ]);
  });

  it("adds and focuses board nodes, then preserves pinned positions across layout", async () => {
    const addResult = await invokeBoardMainCapability("board.add_node", {
      title: "New Clue",
      description: "Track a new lead",
      media_type: "text",
      semantic_type: "note",
      tags: ["lead"],
    }, BOARD_DEFAULT_RESOURCE);

    expect(addResult).toEqual(expect.objectContaining({
      resource: expect.objectContaining({
        resource_type: "board.workspace",
        data: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              title: "New Clue",
              media_type: "text",
              semantic_type: "note",
            }),
          ]),
        }),
      }),
      activeAnchor: "board.canvas",
      data: expect.objectContaining({
        status: "applied",
        node_id: expect.any(String),
      }),
    }));
    if ("ok" in addResult && addResult.ok === false) {
      throw new Error(addResult.message);
    }

    const addedNodeId = String(addResult.data?.node_id || "");
    const focusResult = await invokeBoardMainCapability("board.focus_node", {
      node_id: addedNodeId,
    }, addResult.resource!);
    expect(focusResult).toEqual(expect.objectContaining({
      activeAnchor: "board.inspector",
      data: expect.objectContaining({
        node_id: addedNodeId,
        title: "New Clue",
      }),
    }));
    if ("ok" in focusResult && focusResult.ok === false) {
      throw new Error(focusResult.message);
    }

    const pinResult = await invokeBoardMainCapability("board.pin_node", {
      node_id: "node-case-brief",
    }, addResult.resource!);
    if ("ok" in pinResult && pinResult.ok === false) {
      throw new Error(pinResult.message);
    }
    const pinnedResource = pinResult.resource!;
    const pinnedNode = (pinnedResource.data.nodes as Array<Record<string, unknown>>)
      .find((node) => node.id === "node-case-brief");
    expect(pinnedNode?.pinned).toBe(true);
    const originalPosition = pinnedNode?.position;

    const arrangedResult = await invokeBoardMainCapability("board.arrange_layout", {}, pinnedResource);
    expect(arrangedResult).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        layout_mode: "mixed",
      }),
    }));
    if ("ok" in arrangedResult && arrangedResult.ok === false) {
      throw new Error(arrangedResult.message);
    }
    const arrangedPinnedNode = (arrangedResult.resource!.data.nodes as Array<Record<string, unknown>>)
      .find((node) => node.id === "node-case-brief");
    expect(arrangedPinnedNode?.position).toEqual(originalPosition);
    expect((arrangedResult.resource!.data.style_settings as Record<string, unknown>).layout_algorithm).toBe("stress");
  });

  it("creates auto edge by default and fixed edge when handles are explicit", async () => {
    const originalSourceNode = (BOARD_DEFAULT_RESOURCE.data.nodes as Array<Record<string, unknown>>)
      .find((node) => node.id === "node-case-brief");
    const originalTargetNode = (BOARD_DEFAULT_RESOURCE.data.nodes as Array<Record<string, unknown>>)
      .find((node) => node.id === "node-web-report");

    const autoEdgeResult = await invokeBoardMainCapability("board.add_edge", {
      source_node_id: "node-case-brief",
      target_node_id: "node-web-report",
    }, BOARD_DEFAULT_RESOURCE);
    if ("ok" in autoEdgeResult && autoEdgeResult.ok === false) {
      throw new Error(autoEdgeResult.message);
    }
    const autoEdge = (autoEdgeResult.resource!.data.edges as Array<Record<string, unknown>>)
      .find((edge) => edge.source === "node-case-brief" && edge.target === "node-web-report");
    expect(autoEdge).toEqual(expect.objectContaining({
      ports_mode: "auto",
    }));
    expect(autoEdge?.source_handle).toBeUndefined();
    expect(autoEdge?.target_handle).toBeUndefined();
    const autoSourceNode = (autoEdgeResult.resource!.data.nodes as Array<Record<string, unknown>>)
      .find((node) => node.id === "node-case-brief");
    const autoTargetNode = (autoEdgeResult.resource!.data.nodes as Array<Record<string, unknown>>)
      .find((node) => node.id === "node-web-report");
    expect(autoSourceNode?.position).toEqual(originalSourceNode?.position);
    expect(autoTargetNode?.position).toEqual(originalTargetNode?.position);

    const fixedEdgeResult = await invokeBoardMainCapability("board.add_edge", {
      source_node_id: "node-case-brief",
      target_node_id: "node-web-report",
      source_handle: "bottom-right",
      target_handle: "top-left",
    }, BOARD_DEFAULT_RESOURCE);
    if ("ok" in fixedEdgeResult && fixedEdgeResult.ok === false) {
      throw new Error(fixedEdgeResult.message);
    }
    const fixedEdge = (fixedEdgeResult.resource!.data.edges as Array<Record<string, unknown>>)
      .find((edge) => edge.source === "node-case-brief" && edge.target === "node-web-report");
    expect(fixedEdge).toEqual(expect.objectContaining({
      ports_mode: "fixed",
      source_handle: "bottom-right",
      target_handle: "top-left",
    }));
    const fixedSourceNode = (fixedEdgeResult.resource!.data.nodes as Array<Record<string, unknown>>)
      .find((node) => node.id === "node-case-brief");
    const fixedTargetNode = (fixedEdgeResult.resource!.data.nodes as Array<Record<string, unknown>>)
      .find((node) => node.id === "node-web-report");
    expect(fixedSourceNode?.position).toEqual(originalSourceNode?.position);
    expect(fixedTargetNode?.position).toEqual(originalTargetNode?.position);
  });

  it("arranges board with mindmap algorithm without breaking pin and edge semantics", async () => {
    const resource = cloneBoardResource(BOARD_DEFAULT_RESOURCE);
    const styleSettings = (resource.data as Record<string, unknown>).style_settings as Record<string, unknown>;
    styleSettings.layout_algorithm = "mindmap";

    const arrangedResult = await invokeBoardMainCapability("board.arrange_layout", {}, resource);
    if ("ok" in arrangedResult && arrangedResult.ok === false) {
      throw new Error(arrangedResult.message);
    }

    expect(arrangedResult.data?.layout_mode).toBe("auto");
    const edges = arrangedResult.resource!.data.edges as Array<Record<string, unknown>>;
    expect(edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "edge-case-photo",
        ports_mode: "fixed",
      }),
      expect.objectContaining({
        id: "edge-photo-report",
        ports_mode: "fixed",
      }),
    ]));
  });

  it("separates dense stress layout nodes to avoid overlap", async () => {
    const resource = cloneBoardResource(BOARD_DEFAULT_RESOURCE);
    const data = resource.data as Record<string, unknown>;
    const nodes = data.nodes as Array<Record<string, unknown>>;
    const edges = data.edges as Array<Record<string, unknown>>;
    const styleSettings = data.style_settings as Record<string, unknown>;

    styleSettings.layout_algorithm = "stress";
    styleSettings.avoid_overlap_strength = "high";

    nodes.push(
      {
        id: "node-extra-a",
        title: "Extra A",
        description: "Dense graph node A",
        media_type: "text",
        semantic_type: "note",
        tags: [],
        position: { x: 120, y: 120 },
        size: { width: 240, height: 148 },
        pinned: false,
        data: {},
      },
      {
        id: "node-extra-b",
        title: "Extra B",
        description: "Dense graph node B",
        media_type: "text",
        semantic_type: "note",
        tags: [],
        position: { x: 120, y: 120 },
        size: { width: 240, height: 148 },
        pinned: false,
        data: {},
      }
    );
    edges.push(
      {
        id: "edge-extra-a",
        source: "node-case-brief",
        target: "node-extra-a",
        ports_mode: "auto",
        directed: true,
      },
      {
        id: "edge-extra-b",
        source: "node-case-brief",
        target: "node-extra-b",
        ports_mode: "auto",
        directed: true,
      }
    );

    const arrangedResult = await invokeBoardMainCapability("board.arrange_layout", {}, resource);
    if ("ok" in arrangedResult && arrangedResult.ok === false) {
      throw new Error(arrangedResult.message);
    }

    const arrangedNodes = arrangedResult.resource!.data.nodes as Array<Record<string, unknown>>;
    for (let i = 0; i < arrangedNodes.length; i += 1) {
      for (let j = i + 1; j < arrangedNodes.length; j += 1) {
        expect(nodesOverlap(arrangedNodes[i], arrangedNodes[j], 24)).toBe(false);
      }
    }
  });
});
