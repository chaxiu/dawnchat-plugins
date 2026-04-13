import type { ViewCapabilityResult, ViewStateBinding } from "../../../../runtime/view";
import { buildOperationError } from "../../../shared/viewUtils";
import {
  BOARD_DEFAULT_NODE_SIZE,
  BOARD_DESCRIPTION_LIMIT,
  BOARD_MEDIA_TYPES,
  BOARD_SEMANTIC_TYPES,
  BOARD_TAG_LENGTH_LIMIT,
  BOARD_TAG_LIMIT,
  BOARD_TITLE_LIMIT,
  type BoardEdge,
  type BoardHandleSide,
  type BoardMediaType,
  type BoardNode,
  type BoardSemanticType,
} from "../model/types";
import {
  cloneBoardStateBinding,
  readBoardStateBindingData,
} from "../model/resource";
import {
  getOppositeHandle,
  inferClosestHandles,
  isBoardHandleSide,
} from "../model/handles";
import { arrangeBoardResourceLayout } from "./layout";

function createNodeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `node-${crypto.randomUUID()}`;
  }
  return `node-${Date.now()}`;
}

function createEdgeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `edge-${crypto.randomUUID()}`;
  }
  return `edge-${Date.now()}`;
}

function trimText(raw: unknown, limit: number): string {
  return String(raw || "").trim().slice(0, limit);
}

function readMediaType(raw: unknown): BoardMediaType {
  return BOARD_MEDIA_TYPES.includes(raw as BoardMediaType) ? raw as BoardMediaType : "plain";
}

function readSemanticType(raw: unknown): BoardSemanticType {
  return BOARD_SEMANTIC_TYPES.includes(raw as BoardSemanticType) ? raw as BoardSemanticType : "unknown";
}

function readTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0)
    .slice(0, BOARD_TAG_LIMIT)
    .map((item) => item.slice(0, BOARD_TAG_LENGTH_LIMIT));
}

function readNode(state_binding: ViewStateBinding, nodeId: string): BoardNode | null {
  return readBoardStateBindingData(state_binding).nodes.find((node) => node.id === nodeId) || null;
}

function readHandleSide(raw: unknown): BoardHandleSide | undefined {
  if (isBoardHandleSide(raw)) {
    return raw;
  }
  return undefined;
}

function readNodePosition(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const source = raw as Record<string, unknown>;
  if (typeof source.x !== "number" || typeof source.y !== "number") {
    return null;
  }
  return {
    x: Math.round(source.x),
    y: Math.round(source.y),
  };
}

function buildDefaultNode(input: Record<string, unknown>, existingCount: number): BoardNode {
  const title = trimText(input.title, BOARD_TITLE_LIMIT);
  return {
    id: createNodeId(),
    title,
    description: trimText(input.description, BOARD_DESCRIPTION_LIMIT),
    media_type: readMediaType(input.media_type),
    semantic_type: readSemanticType(input.semantic_type || "note"),
    tags: readTags(input.tags),
    position: {
      x: 96 + existingCount * 36,
      y: 96 + existingCount * 24,
    },
    size: { ...BOARD_DEFAULT_NODE_SIZE },
    pinned: Boolean(input.pinned),
    data: input.data && typeof input.data === "object" && !Array.isArray(input.data)
      ? { ...(input.data as Record<string, unknown>) }
      : {},
  };
}

function nextSelectionForNode(nodeId: string) {
  return {
    selected_node_ids: [nodeId],
    selected_edge_ids: [],
    focused_node_id: nodeId,
  };
}

export async function addBoardNode(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>
): Promise<ViewCapabilityResult> {
  const title = trimText(input.title, BOARD_TITLE_LIMIT);
  if (!title) {
    return buildOperationError(
      "invalid_view_capability_input",
      "board.add_node requires input.title to be a non-empty string"
    );
  }

  const nextResource = cloneBoardStateBinding(state_binding);
  const board = readBoardStateBindingData(nextResource);
  const node = buildDefaultNode(input, board.nodes.length);
  board.nodes = [...board.nodes, node];
  board.selection = nextSelectionForNode(node.id);

  const shouldAutoLayout = Boolean(readBoardStateBindingData(nextResource).style_settings.auto_layout_on_add);
  const arranged = (node.pinned || !shouldAutoLayout)
    ? nextResource
    : await arrangeBoardResourceLayout(nextResource, { preservePinned: true });
  return {
    state_binding: arranged,
    activeAnchor: "board.canvas",
    data: {
      status: "applied",
      node_id: node.id,
      selected_node_ids: [node.id],
    },
  };
}

export function updateBoardNode(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nodeId = trimText(input.node_id, 64);
  if (!nodeId) {
    return buildOperationError(
      "invalid_view_capability_input",
      "board.update_node requires input.node_id to be a non-empty string"
    );
  }

  const existing = readNode(state_binding, nodeId);
  if (!existing) {
    return buildOperationError("board_node_not_found", `Board node not found: ${nodeId}`);
  }

  const nextResource = cloneBoardStateBinding(state_binding);
  const board = readBoardStateBindingData(nextResource);
  const nextPosition = readNodePosition(input.position);
  let positionChanged = false;

  board.nodes = board.nodes.map((node) => {
    if (node.id !== nodeId) {
      return node;
    }
    
    if (nextPosition && (nextPosition.x !== node.position.x || nextPosition.y !== node.position.y)) {
      positionChanged = true;
    }

    return {
      ...node,
      title: input.title !== undefined ? trimText(input.title, BOARD_TITLE_LIMIT) || node.title : node.title,
      description: input.description !== undefined
        ? trimText(input.description, BOARD_DESCRIPTION_LIMIT)
        : node.description,
      media_type: input.media_type !== undefined ? readMediaType(input.media_type) : node.media_type,
      semantic_type: input.semantic_type !== undefined ? readSemanticType(input.semantic_type) : node.semantic_type,
      tags: input.tags !== undefined ? readTags(input.tags) : node.tags,
      pinned: typeof input.pinned === "boolean" ? input.pinned : node.pinned,
      position: nextPosition || node.position,
      data: input.data && typeof input.data === "object" && !Array.isArray(input.data)
        ? { ...(input.data as Record<string, unknown>) }
        : node.data,
    };
  });
  board.selection = nextSelectionForNode(nodeId);

  // If ONLY the position changed (drag), don't force open the inspector.
  // Otherwise, the user might be actively mutating the node via capabilities, so focus it.
  const isPureDrag = positionChanged && 
    input.title === undefined && 
    input.description === undefined && 
    input.media_type === undefined && 
    input.semantic_type === undefined && 
    input.tags === undefined && 
    input.data === undefined;

  return {
    state_binding: nextResource,
    activeAnchor: isPureDrag ? "board.canvas" : "board.inspector",
    data: {
      status: "applied",
      node_id: nodeId,
    },
  };
}

export async function removeBoardNode(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>
): Promise<ViewCapabilityResult> {
  const nodeId = trimText(input.node_id, 64);
  if (!nodeId) {
    return buildOperationError(
      "invalid_view_capability_input",
      "board.remove_node requires input.node_id to be a non-empty string"
    );
  }
  if (!readNode(state_binding, nodeId)) {
    return buildOperationError("board_node_not_found", `Board node not found: ${nodeId}`);
  }

  const nextResource = cloneBoardStateBinding(state_binding);
  const board = readBoardStateBindingData(nextResource);
  board.nodes = board.nodes.filter((node) => node.id !== nodeId);
  board.edges = board.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
  const fallbackFocusedNodeId = board.nodes[0]?.id || "";
  board.selection = fallbackFocusedNodeId
    ? nextSelectionForNode(fallbackFocusedNodeId)
    : {
        selected_node_ids: [],
        selected_edge_ids: [],
        focused_node_id: "",
      };

  const arranged = board.nodes.length > 0
    ? await arrangeBoardResourceLayout(nextResource, { preservePinned: true })
    : nextResource;
  return {
    state_binding: arranged,
    activeAnchor: "board.canvas",
    data: {
      status: "applied",
      removed_node_id: nodeId,
    },
  };
}

export async function addBoardEdge(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>
): Promise<ViewCapabilityResult> {
  const sourceNodeId = trimText(input.source_node_id, 64);
  const targetNodeId = trimText(input.target_node_id, 64);
  if (!sourceNodeId || !targetNodeId) {
    return buildOperationError(
      "invalid_view_capability_input",
      "board.add_edge requires input.source_node_id and input.target_node_id"
    );
  }
  if (sourceNodeId === targetNodeId) {
    return buildOperationError(
      "invalid_view_capability_input",
      "board.add_edge requires different source_node_id and target_node_id"
    );
  }
  if (!readNode(state_binding, sourceNodeId) || !readNode(state_binding, targetNodeId)) {
    return buildOperationError(
      "board_node_not_found",
      `Board nodes must exist before adding an edge: ${sourceNodeId} -> ${targetNodeId}`
    );
  }
  const existingEdge = readBoardStateBindingData(state_binding).edges.find((edge) =>
    edge.source === sourceNodeId && edge.target === targetNodeId
  );
  if (existingEdge) {
    return buildOperationError(
      "board_edge_duplicate",
      `Board edge already exists: ${sourceNodeId} -> ${targetNodeId}`
    );
  }

  const nextResource = cloneBoardStateBinding(state_binding);
  const board = readBoardStateBindingData(nextResource);
  const sourceNode = readNode(nextResource, sourceNodeId);
  const targetNode = readNode(nextResource, targetNodeId);
  if (!sourceNode || !targetNode) {
    return buildOperationError(
      "board_node_not_found",
      `Board nodes must exist before adding an edge: ${sourceNodeId} -> ${targetNodeId}`
    );
  }
  const explicitSourceHandle = readHandleSide(input.source_handle);
  const explicitTargetHandle = readHandleSide(input.target_handle);
  const hasExplicitHandles = Boolean(explicitSourceHandle && explicitTargetHandle);
  const inferredHandles = inferClosestHandles(sourceNode, targetNode, board.style_settings.handles_mode);
  const sourceHandleForFixed = explicitSourceHandle || (explicitTargetHandle ? getOppositeHandle(explicitTargetHandle) : inferredHandles.sourceHandle);
  const targetHandleForFixed = explicitTargetHandle || (explicitSourceHandle ? getOppositeHandle(explicitSourceHandle) : inferredHandles.targetHandle);
  const edge: BoardEdge = {
    id: createEdgeId(),
    source: sourceNodeId,
    target: targetNodeId,
    ports_mode: hasExplicitHandles ? "fixed" : "auto",
    source_handle: hasExplicitHandles ? sourceHandleForFixed : undefined,
    target_handle: hasExplicitHandles ? targetHandleForFixed : undefined,
    directed: true,
    label: trimText(input.label, 48),
  };
  board.edges = [...board.edges, edge];
  return {
    state_binding: nextResource,
    activeAnchor: "board.canvas",
    data: {
      status: "applied",
      edge_id: edge.id,
    },
  };
}

export function removeBoardEdge(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const edgeId = trimText(input.edge_id, 64);
  if (!edgeId) {
    return buildOperationError(
      "invalid_view_capability_input",
      "board.remove_edge requires input.edge_id to be a non-empty string"
    );
  }
  const existing = readBoardStateBindingData(state_binding).edges.find((edge) => edge.id === edgeId);
  if (!existing) {
    return buildOperationError("board_edge_not_found", `Board edge not found: ${edgeId}`);
  }

  const nextResource = cloneBoardStateBinding(state_binding);
  const board = readBoardStateBindingData(nextResource);
  board.edges = board.edges.filter((edge) => edge.id !== edgeId);
  board.selection.selected_edge_ids = board.selection.selected_edge_ids.filter((item) => item !== edgeId);
  return {
    state_binding: nextResource,
    activeAnchor: "board.canvas",
    data: {
      status: "applied",
      removed_edge_id: edgeId,
    },
  };
}

export async function arrangeBoardLayout(state_binding: ViewStateBinding): Promise<ViewCapabilityResult> {
  const arranged = await arrangeBoardResourceLayout(state_binding, { preservePinned: true });
  return {
    state_binding: arranged,
    activeAnchor: "board.canvas",
    data: {
      status: "applied",
      layout_mode: readBoardStateBindingData(arranged).layout_mode,
    },
  };
}

export function pinBoardNode(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>,
  pinned: boolean
): ViewCapabilityResult {
  const nodeId = trimText(input.node_id, 64);
  if (!nodeId) {
    return buildOperationError(
      "invalid_view_capability_input",
      `board.${pinned ? "pin_node" : "unpin_node"} requires input.node_id to be a non-empty string`
    );
  }
  if (!readNode(state_binding, nodeId)) {
    return buildOperationError("board_node_not_found", `Board node not found: ${nodeId}`);
  }

  const nextResource = cloneBoardStateBinding(state_binding);
  const board = readBoardStateBindingData(nextResource);
  board.nodes = board.nodes.map((node) => node.id === nodeId ? { ...node, pinned } : node);
  board.layout_mode = board.nodes.some((node) => node.pinned) ? "mixed" : "auto";
  board.selection = nextSelectionForNode(nodeId);
  return {
    state_binding: nextResource,
    activeAnchor: "board.inspector",
    data: {
      status: "applied",
      node_id: nodeId,
      pinned,
    },
  };
}

export function focusBoardNode(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nodeId = typeof input.node_id === "string" ? input.node_id.trim() : "";
  
  if (!nodeId) {
    // If empty node_id is provided, interpret as deselecting all nodes
    const nextResource = cloneBoardStateBinding(state_binding);
    const board = readBoardStateBindingData(nextResource);
    board.selection = {
      selected_node_ids: [],
      selected_edge_ids: [],
      focused_node_id: "",
    };
    return {
      state_binding: nextResource,
      activeAnchor: "board.canvas",
      data: {
        status: "applied",
        node_id: "",
      },
    };
  }

  const targetNode = readNode(state_binding, nodeId);
  if (!targetNode) {
    return buildOperationError("board_node_not_found", `Board node not found: ${nodeId}`);
  }

  const nextResource = cloneBoardStateBinding(state_binding);
  const board = readBoardStateBindingData(nextResource);
  board.selection = nextSelectionForNode(nodeId);
  return {
    state_binding: nextResource,
    activeAnchor: "board.inspector",
    data: {
      status: "applied",
      node_id: nodeId,
      title: targetNode.title,
      media_type: targetNode.media_type,
      semantic_type: targetNode.semantic_type,
    },
  };
}
