import type {
  ViewOpenSuccess,
  ViewOperationFailure,
  ViewResourceBinding,
} from "../../../../runtime/view/manifest";
import {
  buildOperationError,
  cloneViewResource,
  isViewOperationFailure,
  toRecord,
  toStringArray,
} from "../../../shared/viewUtils";
import {
  BOARD_DEFAULT_NODE_SIZE,
  BOARD_DESCRIPTION_LIMIT,
  BOARD_MEDIA_TYPES,
  BOARD_SEMANTIC_TYPES,
  BOARD_TAG_LENGTH_LIMIT,
  BOARD_TAG_LIMIT,
  BOARD_TITLE_LIMIT,
  type BoardEdge,
  type BoardMediaType,
  type BoardNode,
  type BoardNodePosition,
  type BoardNodeSize,
  type BoardResourceData,
  type BoardEdgePortsMode,
  type BoardSemanticType,
  type BoardStyleSettings,
  type BoardHandleSide,
} from "./types";
import { isBoardHandleSide } from "./handles";

function trimLimitedText(raw: unknown, maxLength: number, fallback = ""): string {
  const value = String(raw || "").trim();
  if (!value) {
    return fallback;
  }
  return value.slice(0, maxLength);
}

function readMediaType(raw: unknown): BoardMediaType {
  return BOARD_MEDIA_TYPES.includes(raw as BoardMediaType) ? raw as BoardMediaType : "plain";
}

function readSemanticType(raw: unknown): BoardSemanticType {
  return BOARD_SEMANTIC_TYPES.includes(raw as BoardSemanticType) ? raw as BoardSemanticType : "unknown";
}

function readTags(raw: unknown): string[] {
  return toStringArray(raw)
    .slice(0, BOARD_TAG_LIMIT)
    .map((tag) => tag.slice(0, BOARD_TAG_LENGTH_LIMIT));
}

function readHandleSide(raw: unknown): BoardHandleSide | undefined {
  if (isBoardHandleSide(raw)) {
    return raw;
  }
  return undefined;
}

function readPortsMode(raw: unknown): BoardEdgePortsMode | undefined {
  if (raw === "auto" || raw === "fixed") {
    return raw;
  }
  return undefined;
}

function clampCurvature(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, raw));
}

function readStyleSettings(raw: unknown, fallback: BoardStyleSettings): BoardStyleSettings {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    layout_algorithm: source.layout_algorithm === "layered" || source.layout_algorithm === "mindmap"
      ? source.layout_algorithm
      : "stress",
    layout_direction: source.layout_direction === "TB" ? "TB" : "LR",
    edge_style: source.edge_style === "smoothstep" || source.edge_style === "straight"
      ? source.edge_style
      : "bezier",
    edge_curvature: clampCurvature(source.edge_curvature, fallback.edge_curvature),
    handles_mode:
      source.handles_mode === "left-right"
      || source.handles_mode === "four-sides"
      || source.handles_mode === "eight-points"
        ? source.handles_mode
        : fallback.handles_mode,
    auto_layout_on_add: typeof source.auto_layout_on_add === "boolean"
      ? source.auto_layout_on_add
      : fallback.auto_layout_on_add,
    avoid_overlap_strength: source.avoid_overlap_strength === "low" || source.avoid_overlap_strength === "high"
      ? source.avoid_overlap_strength
      : "medium",
  };
}

function readPosition(raw: unknown, fallbackX: number, fallbackY: number): BoardNodePosition {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    x: typeof source.x === "number" ? Math.round(source.x) : fallbackX,
    y: typeof source.y === "number" ? Math.round(source.y) : fallbackY,
  };
}

function readSize(raw: unknown): BoardNodeSize {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const width = typeof source.width === "number" && source.width > 120
    ? Math.round(source.width)
    : BOARD_DEFAULT_NODE_SIZE.width;
  const height = typeof source.height === "number" && source.height > 80
    ? Math.round(source.height)
    : BOARD_DEFAULT_NODE_SIZE.height;
  return { width, height };
}

export function createDefaultBoardData(): BoardResourceData {
  return {
    board_id: "board:holographic-clue-wall",
    description: "A dark analytic board for arranging evidence, entities, and references into a readable graph.",
    nodes: [
      {
        id: "node-case-brief",
        title: "Case Brief",
        description: "A compact text summary that frames the current investigation scope and open questions.",
        media_type: "text",
        semantic_type: "note",
        tags: ["brief", "context"],
        position: { x: 60, y: 72 },
        size: { width: 260, height: 156 },
        pinned: false,
        data: {
          content: "User provided an initial case brief and wants the assistant to organize evidence into a visual board.",
        },
      },
      {
        id: "node-suspect-photo",
        title: "Suspect Photo",
        description: "Image placeholder representing a visual clue that can be linked back to notes and references.",
        media_type: "image",
        semantic_type: "person",
        tags: ["visual", "suspect"],
        position: { x: 420, y: 56 },
        size: { width: 232, height: 164 },
        pinned: false,
        data: {
          image_url: "https://example.invalid/suspect-photo.png",
        },
      },
      {
        id: "node-web-report",
        title: "Archived Report",
        description: "A webpage reference connected to the photo to demonstrate directional evidence links.",
        media_type: "webpage",
        semantic_type: "evidence",
        tags: ["report", "reference"],
        position: { x: 756, y: 188 },
        size: { width: 248, height: 152 },
        pinned: false,
        data: {
          url: "https://example.invalid/report",
        },
      },
    ],
    edges: [
      {
        id: "edge-case-photo",
        source: "node-case-brief",
        target: "node-suspect-photo",
        ports_mode: "fixed",
        source_handle: "right",
        target_handle: "left",
        directed: true,
        label: "mentions",
      },
      {
        id: "edge-photo-report",
        source: "node-suspect-photo",
        target: "node-web-report",
        ports_mode: "fixed",
        source_handle: "right",
        target_handle: "left",
        directed: true,
        label: "referenced_by",
      },
    ],
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    selection: {
      selected_node_ids: ["node-case-brief"],
      selected_edge_ids: [],
      focused_node_id: "node-case-brief",
    },
    layout_mode: "auto",
    style_settings: {
      layout_algorithm: "stress",
      layout_direction: "LR",
      edge_style: "bezier",
      edge_curvature: 0.5,
      handles_mode: "eight-points",
      auto_layout_on_add: true,
      avoid_overlap_strength: "medium",
    },
  };
}

export const BOARD_DEFAULT_RESOURCE: ViewResourceBinding = {
  resource_type: "board.workspace",
  resource_id: "board:holographic-clue-wall",
  title: "Holographic Clue Wall",
  data: createDefaultBoardData() as unknown as Record<string, unknown>,
};

export function cloneBoardResource(resource: ViewResourceBinding): ViewResourceBinding {
  return cloneViewResource(resource);
}

export function readBoardResourceData(resource: ViewResourceBinding): BoardResourceData {
  return resource.data as unknown as BoardResourceData;
}

export function normalizeBoardResource(raw: Record<string, unknown>): ViewResourceBinding {
  const defaults = createDefaultBoardData();
  const rawData = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
    ? raw.data as Record<string, unknown>
    : {};
  const rawNodes = Array.isArray(rawData.nodes) ? rawData.nodes : defaults.nodes;
  const nodes = rawNodes.map((item, index) => {
    const source = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return {
      id: trimLimitedText(source.id, 64, `node-${index + 1}`),
      title: trimLimitedText(source.title, BOARD_TITLE_LIMIT, `Node ${index + 1}`),
      description: trimLimitedText(source.description, BOARD_DESCRIPTION_LIMIT),
      media_type: readMediaType(source.media_type),
      semantic_type: readSemanticType(source.semantic_type),
      tags: readTags(source.tags),
      position: readPosition(source.position, 72 + index * 180, 84 + index * 96),
      size: readSize(source.size),
      pinned: Boolean(source.pinned),
      data: toRecord(source.data),
    } satisfies BoardNode;
  }).filter((node, index, collection) => node.id && collection.findIndex((item) => item.id === node.id) === index);

  const allowedNodeIds = new Set(nodes.map((node) => node.id));
  const rawEdges = Array.isArray(rawData.edges) ? rawData.edges : defaults.edges;
  const edges = rawEdges.map((item, index) => {
    const source = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    const explicitPortsMode = readPortsMode(source.ports_mode);
    const sourceHandle = readHandleSide(source.source_handle);
    const targetHandle = readHandleSide(source.target_handle);
    const portsMode = explicitPortsMode || "fixed";
    return {
      id: trimLimitedText(source.id, 64, `edge-${index + 1}`),
      source: trimLimitedText(source.source, 64),
      target: trimLimitedText(source.target, 64),
      ports_mode: portsMode,
      source_handle: sourceHandle,
      target_handle: targetHandle,
      directed: true as const,
      label: trimLimitedText(source.label, 48),
    } satisfies BoardEdge;
  }).filter((edge, index, collection) =>
    edge.id
    && edge.source
    && edge.target
    && edge.source !== edge.target
    && allowedNodeIds.has(edge.source)
    && allowedNodeIds.has(edge.target)
    && collection.findIndex((item) => item.id === edge.id) === index
  );

  const rawViewport = rawData.viewport && typeof rawData.viewport === "object" && !Array.isArray(rawData.viewport)
    ? rawData.viewport as Record<string, unknown>
    : {};
  const rawSelection = rawData.selection && typeof rawData.selection === "object" && !Array.isArray(rawData.selection)
    ? rawData.selection as Record<string, unknown>
    : {};
  const selectedNodeIds = toStringArray(rawSelection.selected_node_ids).filter((nodeId) => allowedNodeIds.has(nodeId));
  const selectedEdgeIds = toStringArray(rawSelection.selected_edge_ids).filter((edgeId) =>
    edges.some((edge) => edge.id === edgeId)
  );
  const focusedNodeId = trimLimitedText(rawSelection.focused_node_id, 64);

  return {
    resource_type: "board.workspace",
    resource_id: trimLimitedText(raw.resource_id, 96, String(BOARD_DEFAULT_RESOURCE.resource_id || "board:holographic-clue-wall")),
    title: trimLimitedText(raw.title, BOARD_TITLE_LIMIT, String(BOARD_DEFAULT_RESOURCE.title || "Holographic Clue Wall")),
    data: {
      board_id: trimLimitedText(rawData.board_id, 96, defaults.board_id),
      description: trimLimitedText(rawData.description, BOARD_DESCRIPTION_LIMIT, defaults.description),
      nodes,
      edges,
      viewport: {
        x: typeof rawViewport.x === "number" ? Math.round(rawViewport.x) : defaults.viewport.x,
        y: typeof rawViewport.y === "number" ? Math.round(rawViewport.y) : defaults.viewport.y,
        zoom: typeof rawViewport.zoom === "number" && rawViewport.zoom > 0 ? rawViewport.zoom : defaults.viewport.zoom,
      },
      selection: {
        selected_node_ids: selectedNodeIds,
        selected_edge_ids: selectedEdgeIds,
        focused_node_id: allowedNodeIds.has(focusedNodeId) ? focusedNodeId : selectedNodeIds[0] || "",
      },
      layout_mode: rawData.layout_mode === "mixed" ? "mixed" : "auto",
      style_settings: readStyleSettings(rawData.style_settings, defaults.style_settings),
    } as unknown as Record<string, unknown>,
  };
}

export function validateBoardResource(
  payload: Record<string, unknown>
): ViewResourceBinding | ViewOperationFailure {
  if (Object.keys(payload).length === 0) {
    return cloneBoardResource(BOARD_DEFAULT_RESOURCE);
  }

  const resourceType = trimLimitedText(payload.resource_type, 64, "board.workspace");
  if (resourceType !== "board.workspace") {
    return buildOperationError(
      "invalid_view_resource",
      "board.main requires resource.resource_type to be 'board.workspace'"
    );
  }

  const rawData = payload.data;
  if (rawData !== undefined && (!rawData || typeof rawData !== "object" || Array.isArray(rawData))) {
    return buildOperationError(
      "invalid_view_resource",
      "board.main requires resource.data to be an object"
    );
  }

  return normalizeBoardResource(payload);
}

export function openBoardMainView(payload: Record<string, unknown>): ViewOpenSuccess | ViewOperationFailure {
  const input = toRecord(payload);
  const normalizedResource = validateBoardResource(toRecord(input.resource));
  if (isViewOperationFailure(normalizedResource)) {
    return normalizedResource;
  }
  const initialAnchor = trimLimitedText(input.initial_anchor, 64);
  return {
    resource: normalizedResource,
    activeAnchor: initialAnchor || "board.canvas",
    data: {
      status: "applied",
      resource_id: normalizedResource.resource_id || "",
    },
  };
}
