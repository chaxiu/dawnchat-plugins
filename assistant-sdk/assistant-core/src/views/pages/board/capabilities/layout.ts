import type { ViewStateBinding } from "../../../../runtime/view";
import {
  createBrowserElkLayoutEngine,
  type ElkLayoutResult,
} from "../adapters/elk";
import {
  cloneBoardStateBinding,
  readBoardStateBindingData,
} from "../model/resource";
import type {
  BoardEdge,
  BoardNode,
  BoardResourceData,
  BoardAvoidOverlapStrength,
  BoardStyleSettings,
} from "../model/types";

const elk = createBrowserElkLayoutEngine();
const algorithmAvailabilityCache = new Map<string, Promise<boolean>>();

function isBoardResourceData(raw: unknown): raw is BoardResourceData {
  return Boolean(
    raw
    && typeof raw === "object"
    && !Array.isArray(raw)
    && Array.isArray((raw as BoardResourceData).nodes)
    && Array.isArray((raw as BoardResourceData).edges)
  );
}

function toRoundedPosition(raw: { x?: number; y?: number }) {
  return {
    x: Math.round(Number(raw.x) || 0),
    y: Math.round(Number(raw.y) || 0),
  };
}

function resolveSpacingByOverlap(strength: BoardAvoidOverlapStrength) {
  if (strength === "low") {
    return {
      betweenLayers: "72",
      betweenNodes: "52",
      edgeNode: "36",
    };
  }
  if (strength === "high") {
    return {
      betweenLayers: "168",
      betweenNodes: "112",
      edgeNode: "72",
    };
  }
  return {
    betweenLayers: "112",
    betweenNodes: "76",
    edgeNode: "52",
  };
}

function resolveOverlapGap(strength: BoardAvoidOverlapStrength): number {
  if (strength === "low") {
    return 40;
  }
  if (strength === "high") {
    return 96;
  }
  return 64;
}

function resolveLayeredLayoutOptions(style: BoardStyleSettings): Record<string, string> {
  const spacing = resolveSpacingByOverlap(style.avoid_overlap_strength);
  return {
    "elk.algorithm": "layered",
    "elk.direction": style.layout_direction === "TB" ? "DOWN" : "RIGHT",
    "elk.layered.spacing.nodeNodeBetweenLayers": spacing.betweenLayers,
    "elk.spacing.nodeNode": spacing.betweenNodes,
    "elk.padding": "[top=36,left=36,bottom=36,right=36]",
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.spacing.edgeNode": spacing.edgeNode,
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  };
}

function resolveStressLayoutOptions(style: BoardStyleSettings): Record<string, string> {
  const spacing = resolveSpacingByOverlap(style.avoid_overlap_strength);
  const desiredEdgeLength = style.avoid_overlap_strength === "low"
    ? "180"
    : style.avoid_overlap_strength === "high"
      ? "340"
      : "260";
  return {
    "elk.algorithm": "stress",
    "elk.padding": "[top=56,left=56,bottom=56,right=56]",
    "elk.spacing.nodeNode": spacing.betweenNodes,
    "elk.spacing.componentComponent": style.avoid_overlap_strength === "high" ? "240" : "180",
    "elk.separateConnectedComponents": "true",
    "elk.stress.desiredEdgeLength": desiredEdgeLength,
    "elk.stress.iterationLimit": style.avoid_overlap_strength === "high" ? "320" : "260",
    "elk.stress.epsilon": "0.0005",
    "elk.stress.dimension": "XY",
    "elk.interactive": "false",
    "elk.randomSeed": "1",
  };
}

function resolveMindmapLayoutOptions(
  style: BoardStyleSettings,
  algorithm: "radial" | "mrtree",
  centerNodeId: string
): Record<string, string> {
  const spacing = resolveSpacingByOverlap(style.avoid_overlap_strength);
  if (algorithm === "mrtree") {
    return {
      "elk.algorithm": "mrtree",
      "elk.direction": style.layout_direction === "TB" ? "DOWN" : "RIGHT",
      "elk.padding": "[top=40,left=40,bottom=40,right=40]",
      "elk.spacing.nodeNode": spacing.betweenNodes,
      "elk.mrtree.searchOrder": "DFS",
      "elk.mrtree.root": centerNodeId,
    };
  }
  return {
    "elk.algorithm": "radial",
    "elk.padding": "[top=40,left=40,bottom=40,right=40]",
    "elk.spacing.nodeNode": spacing.betweenNodes,
  };
}

async function isElkAlgorithmAvailable(algorithm: string): Promise<boolean> {
  const cached = algorithmAvailabilityCache.get(algorithm);
  if (cached) {
    return cached;
  }
  const probing = elk.layout({
    id: `probe-${algorithm}`,
    layoutOptions: {
      "elk.algorithm": algorithm,
    },
    children: [
      { id: "a", width: 120, height: 80 },
      { id: "b", width: 120, height: 80 },
    ],
    edges: [
      { id: "e1", sources: ["a"], targets: ["b"] },
    ],
  }).then(() => true).catch(() => false);
  algorithmAvailabilityCache.set(algorithm, probing);
  return probing;
}

function resolveCenterNodeId(board: BoardResourceData, nodes: BoardNode[]): string {
  const focusedNodeId = board.selection?.focused_node_id || "";
  if (focusedNodeId && nodes.some((node) => node.id === focusedNodeId)) {
    return focusedNodeId;
  }
  return nodes[0]?.id || "";
}

type LayoutResolution = {
  options: Record<string, string>;
  isMindmap: boolean;
};

async function resolveElkLayoutOptions(
  style: BoardStyleSettings,
  centerNodeId: string
): Promise<LayoutResolution> {
  if (style.layout_algorithm === "stress") {
    const stressSupported = await isElkAlgorithmAvailable("stress");
    if (stressSupported) {
      return {
        options: resolveStressLayoutOptions(style),
        isMindmap: false,
      };
    }
    return {
      options: resolveLayeredLayoutOptions(style),
      isMindmap: false,
    };
  }
  if (style.layout_algorithm === "layered") {
    return {
      options: resolveLayeredLayoutOptions(style),
      isMindmap: false,
    };
  }
  const radialSupported = await isElkAlgorithmAvailable("radial");
  if (radialSupported) {
    return {
      options: resolveMindmapLayoutOptions(style, "radial", centerNodeId),
      isMindmap: true,
    };
  }
  const treeSupported = await isElkAlgorithmAvailable("mrtree");
  if (treeSupported) {
    return {
      options: resolveMindmapLayoutOptions(style, "mrtree", centerNodeId),
      isMindmap: true,
    };
  }
  return {
    options: resolveLayeredLayoutOptions(style),
    isMindmap: false,
  };
}

function buildMindmapTreeEdges(nodes: BoardNode[], edges: BoardEdge[], centerNodeId: string) {
  const nodeIdSet = new Set(nodes.map((node) => node.id));
  if (!nodeIdSet.has(centerNodeId)) {
    return edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    }));
  }
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set<string>());
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }
  const visited = new Set<string>([centerNodeId]);
  const queue: string[] = [centerNodeId];
  const treeEdges: Array<{ id: string; sources: string[]; targets: string[] }> = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = [...(adjacency.get(current) || [])];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      queue.push(neighbor);
      treeEdges.push({
        id: `mindmap-tree-${current}-${neighbor}`,
        sources: [current],
        targets: [neighbor],
      });
    }
  }
  for (const node of nodes) {
    if (node.id === centerNodeId || visited.has(node.id)) {
      continue;
    }
    treeEdges.push({
      id: `mindmap-fallback-${centerNodeId}-${node.id}`,
      sources: [centerNodeId],
      targets: [node.id],
    });
  }
  return treeEdges;
}

function buildLayoutGraph(
  nodes: BoardNode[],
  edges: BoardEdge[],
  layoutOptions: Record<string, string>,
  useMindmapTree: boolean,
  centerNodeId: string
) {
  const orderedNodes = centerNodeId
    ? [
        ...nodes.filter((node) => node.id === centerNodeId),
        ...nodes.filter((node) => node.id !== centerNodeId),
      ]
    : nodes;
  const layoutEdges = useMindmapTree
    ? buildMindmapTreeEdges(nodes, edges, centerNodeId)
    : edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      }));
  return {
    id: "board-root",
    layoutOptions,
    children: orderedNodes.map((node) => ({
      id: node.id,
      width: node.size.width,
      height: node.size.height,
    })),
    edges: layoutEdges,
  };
}

type PositionedNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fixed: boolean;
};

function resolveNodeOverlaps(
  nodes: PositionedNode[],
  strength: BoardAvoidOverlapStrength
): Map<string, { x: number; y: number }> {
  const gap = resolveOverlapGap(strength);
  const working = nodes.map((node) => ({ ...node }));
  const maxIterations = 48;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let moved = false;

    for (let i = 0; i < working.length; i += 1) {
      for (let j = i + 1; j < working.length; j += 1) {
        const a = working[i];
        const b = working[j];
        const ax = a.x + a.width / 2;
        const ay = a.y + a.height / 2;
        const bx = b.x + b.width / 2;
        const by = b.y + b.height / 2;
        const dx = bx - ax;
        const dy = by - ay;
        const overlapX = (a.width + b.width) / 2 + gap - Math.abs(dx);
        const overlapY = (a.height + b.height) / 2 + gap - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }

        moved = true;
        const separateOnX = overlapX <= overlapY;
        const direction = separateOnX
          ? (dx >= 0 ? 1 : -1)
          : (dy >= 0 ? 1 : -1);
        const overlapAmount = separateOnX ? overlapX : overlapY;
        const shift = (a.fixed || b.fixed ? overlapAmount : overlapAmount / 2) + 0.5;

        if (separateOnX) {
          if (!a.fixed) {
            a.x -= direction * shift;
          }
          if (!b.fixed) {
            b.x += direction * shift;
          }
        } else {
          if (!a.fixed) {
            a.y -= direction * shift;
          }
          if (!b.fixed) {
            b.y += direction * shift;
          }
        }
      }
    }

    if (!moved) {
      break;
    }
  }

  return new Map(
    working.map((node) => [node.id, toRoundedPosition({ x: node.x, y: node.y })])
  );
}

export async function arrangeBoardResourceLayout(
  state_binding: ViewStateBinding,
  options?: {
    preservePinned?: boolean;
  }
): Promise<ViewStateBinding> {
  const nextResource = cloneBoardStateBinding(state_binding);
  if (!isBoardResourceData(nextResource.data)) {
    return nextResource;
  }

  const preservePinned = options?.preservePinned !== false;
  const board = readBoardStateBindingData(nextResource);
  const nodes = board.nodes;
  const edges = board.edges.filter((edge) =>
    nodes.some((node) => node.id === edge.source) && nodes.some((node) => node.id === edge.target)
  );
  if (nodes.length === 0) {
    board.layout_mode = "auto";
    return nextResource;
  }

  const centerNodeId = resolveCenterNodeId(board, nodes);
  const resolvedLayout = await resolveElkLayoutOptions(board.style_settings, centerNodeId);
  let layout;
  try {
    layout = await elk.layout(
      buildLayoutGraph(
        nodes,
        edges,
        resolvedLayout.options,
        resolvedLayout.isMindmap,
        centerNodeId
      )
    );
  } catch {
    layout = await elk.layout(
      buildLayoutGraph(
        nodes,
        edges,
        resolveLayeredLayoutOptions(board.style_settings),
        false,
        centerNodeId
      )
    );
  }
  const positionedChildren = Array.isArray(layout.children) ? layout.children : [];
  const rawPositionMap = new Map(
    positionedChildren.map((child) => [child.id, toRoundedPosition({ x: child.x, y: child.y })])
  );
  const positionMap = resolveNodeOverlaps(
    nodes.map((node) => {
      const nextPosition = preservePinned && node.pinned
        ? node.position
        : rawPositionMap.get(node.id) || node.position;
      return {
        id: node.id,
        x: nextPosition.x,
        y: nextPosition.y,
        width: node.size.width,
        height: node.size.height,
        fixed: preservePinned && node.pinned,
      };
    }),
    board.style_settings.avoid_overlap_strength
  );

  board.nodes = nodes.map((node) => {
    if (preservePinned && node.pinned) {
      return node;
    }
    const nextPosition = positionMap.get(node.id);
    return nextPosition
      ? {
          ...node,
          position: nextPosition,
        }
      : node;
  });
  board.edges = edges;
  board.layout_mode = board.nodes.some((node) => node.pinned) ? "mixed" : "auto";
  return nextResource;
}
