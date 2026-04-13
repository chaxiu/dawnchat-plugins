import { computed, ref, watch, markRaw, onBeforeUnmount, type Component } from "vue";
import { MarkerType, type Edge, type Node } from "@vue-flow/core";

import { type ViewCapabilityResult, type ViewStateBinding } from "../../../../runtime/view/manifest";
import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../../../runtime/events";
import { emitAssistantRuntimeEvent } from "../../../../runtime/runtimeEventBridge";
import { useViewState } from "../../../../runtime/view/state";
import { logger } from "../../../../utils/logger";
import BoardCardNode from "../components/BoardCardNode.vue";
import { invokeBoardMainCapability } from "../capabilities";
import { buildBoardMainStateSummary } from "../model/summary";
import {
  BOARD_DEFAULT_RESOURCE,
  cloneBoardStateBinding,
  readBoardStateBindingData,
  validateBoardStateBinding,
} from "../model/resource";
import {
  getOppositeHandle,
  inferClosestHandles,
  isBoardHandleSide,
} from "../model/handles";
import type {
  BoardEdge,
  BoardFlowNodeData,
  BoardHandleSide,
  BoardNode,
  BoardResourceData,
  BoardStyleSettings,
} from "../model/types";

const nodeTypes: Record<string, Component> = {
  boardCard: markRaw(BoardCardNode) as Component,
};

const DEFAULT_STYLE_SETTINGS: BoardStyleSettings = {
  layout_algorithm: "stress",
  layout_direction: "LR",
  edge_style: "bezier",
  edge_curvature: 0.5,
  handles_mode: "eight-points",
  auto_layout_on_add: true,
  avoid_overlap_strength: "medium",
};

const BOARD_DEBUG_STORAGE_KEY = "dawnchat.board.debug";

function readBoardDebugFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const value = String(window.localStorage.getItem(BOARD_DEBUG_STORAGE_KEY) || "").toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  } catch {
    return false;
  }
}

function readBoardData(state_binding: ViewStateBinding | null): BoardResourceData | null {
  if (!state_binding || !state_binding.data || typeof state_binding.data !== "object" || Array.isArray(state_binding.data)) {
    return null;
  }
  const data = state_binding.data as unknown as BoardResourceData;
  return Array.isArray(data.nodes) && Array.isArray(data.edges) ? data : null;
}

function extractNodeId(raw: unknown): string {
  if (!raw || typeof raw !== "object") {
    return "";
  }
  const source = raw as Record<string, unknown>;
  if (typeof source.id === "string") {
    return source.id;
  }
  if (source.node && typeof source.node === "object" && !Array.isArray(source.node)) {
    const nodeRecord = source.node as Record<string, unknown>;
    return typeof nodeRecord.id === "string" ? nodeRecord.id : "";
  }
  return "";
}

function extractNodePosition(raw: unknown): { x: number; y: number } | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const directPosition = source.position && typeof source.position === "object" && !Array.isArray(source.position)
    ? source.position as Record<string, unknown>
    : null;
  const nestedNode = source.node && typeof source.node === "object" && !Array.isArray(source.node)
    ? source.node as Record<string, unknown>
    : null;
  const nestedPosition = nestedNode?.position && typeof nestedNode.position === "object" && !Array.isArray(nestedNode.position)
    ? nestedNode.position as Record<string, unknown>
    : null;
  const position = directPosition || nestedPosition;
  if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
    return null;
  }
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
  };
}

function extractEdgeId(raw: unknown): string {
  if (!raw || typeof raw !== "object") {
    return "";
  }
  const source = raw as Record<string, unknown>;
  if (typeof source.id === "string") {
    return source.id;
  }
  if (source.edge && typeof source.edge === "object" && !Array.isArray(source.edge)) {
    const edgeRecord = source.edge as Record<string, unknown>;
    return typeof edgeRecord.id === "string" ? edgeRecord.id : "";
  }
  return "";
}

function extractConnection(
  raw: unknown
): { source_node_id: string; target_node_id: string; source_handle?: BoardHandleSide; target_handle?: BoardHandleSide } | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const sourceNodeId = typeof source.source === "string" ? source.source : "";
  const targetNodeId = typeof source.target === "string" ? source.target : "";
  if (!sourceNodeId || !targetNodeId) {
    return null;
  }
  const sourceHandle = source.sourceHandle;
  const targetHandle = source.targetHandle;
  return {
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    source_handle: isBoardHandleSide(sourceHandle) ? sourceHandle : undefined,
    target_handle: isBoardHandleSide(targetHandle) ? targetHandle : undefined,
  };
}

function extractConnectStartNodeId(args: unknown[]): string {
  for (const payload of args) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      continue;
    }
    const source = payload as Record<string, unknown>;
    if (
      source.handleType === "source"
      && typeof source.nodeId === "string"
      && source.nodeId
    ) {
      return source.nodeId;
    }
  }
  for (const payload of args) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      continue;
    }
    const source = payload as Record<string, unknown>;
    if (typeof source.nodeId === "string" && source.nodeId) {
      return source.nodeId;
    }
    if (source.node && typeof source.node === "object" && !Array.isArray(source.node)) {
      const nodeRecord = source.node as Record<string, unknown>;
      if (typeof nodeRecord.id === "string" && nodeRecord.id) {
        return nodeRecord.id;
      }
    }
  }
  return "";
}

function extractConnectEndTargetNodeId(args: unknown[]): string {
  for (const payload of args) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      continue;
    }
    const source = payload as Record<string, unknown>;
    const directTarget = typeof source.target === "string" ? source.target : "";
    if (directTarget) {
      return directTarget;
    }
    const targetNodeId = typeof source.targetNodeId === "string" ? source.targetNodeId : "";
    if (targetNodeId) {
      return targetNodeId;
    }
    if (source.toNode && typeof source.toNode === "object" && !Array.isArray(source.toNode)) {
      const toNode = source.toNode as Record<string, unknown>;
      if (typeof toNode.id === "string" && toNode.id) {
        return toNode.id;
      }
    }
    if (source.connection && typeof source.connection === "object" && !Array.isArray(source.connection)) {
      const connection = source.connection as Record<string, unknown>;
      if (typeof connection.target === "string" && connection.target) {
        return connection.target;
      }
    }
  }
  return "";
}

function resolveEdgeHandles(
  edge: BoardEdge,
  sourceNode: BoardNode,
  targetNode: BoardNode,
  handlesMode: BoardStyleSettings["handles_mode"]
): { sourceHandle: BoardHandleSide; targetHandle: BoardHandleSide } {
  const inferred = inferClosestHandles(sourceNode, targetNode, handlesMode);
  if (edge.ports_mode === "auto") {
    return inferred;
  }
  if (edge.source_handle && edge.target_handle) {
    return {
      sourceHandle: edge.source_handle,
      targetHandle: edge.target_handle,
    };
  }
  if (edge.source_handle) {
    return {
      sourceHandle: edge.source_handle,
      targetHandle: getOppositeHandle(edge.source_handle),
    };
  }
  if (edge.target_handle) {
    return {
      sourceHandle: getOppositeHandle(edge.target_handle),
      targetHandle: edge.target_handle,
    };
  }
  return inferred;
}

export function useBoardScene() {
  const { activeViewId, activeAnchor, activeManifest, currentStateBinding, setActiveViewState } = useViewState();
  const isMutating = ref(false);
  const pendingConnectSourceNodeId = ref("");
  const connectingFromNodeId = ref("");
  const hoveringConnectTargetNodeId = ref("");
  const hoveringConnectTargetCandidates = ref<string[]>([]);
  const lastConnectPointerPoint = ref<{ x: number; y: number } | null>(null);
  const didConnectDuringDrag = ref(false);
  const debugEnabled = ref(readBoardDebugFlag());

  const isBoardActive = computed(() => activeViewId.value === "board.main");
  const boardData = computed(() => readBoardData(currentStateBinding.value));
  const nodes = computed(() => boardData.value?.nodes || []);
  const edges = computed(() => boardData.value?.edges || []);
  const selection = computed(() => boardData.value?.selection || {
    selected_node_ids: [],
    selected_edge_ids: [],
    focused_node_id: "",
  });
  const selectedNode = computed(() =>
    nodes.value.find((node) => node.id === selection.value.focused_node_id) || null
  );
  const pinnedCount = computed(() => nodes.value.filter((node) => node.pinned).length);
  const boardStyleSettings = computed<BoardStyleSettings>(() => ({
    ...DEFAULT_STYLE_SETTINGS,
    ...(boardData.value?.style_settings || {}),
  }));
  const incomingCountByNodeId = computed(() => {
    const counts = new Map<string, number>();
    for (const edge of edges.value) {
      counts.set(edge.target, (counts.get(edge.target) || 0) + 1);
    }
    return counts;
  });
  const outgoingCountByNodeId = computed(() => {
    const counts = new Map<string, number>();
    for (const edge of edges.value) {
      counts.set(edge.source, (counts.get(edge.source) || 0) + 1);
    }
    return counts;
  });
  const relatedNodeIds = computed(() => {
    const focusedNodeId = selection.value.focused_node_id;
    if (!focusedNodeId) {
      return new Set<string>();
    }
    const related = new Set<string>([focusedNodeId]);
    for (const edge of edges.value) {
      if (edge.source === focusedNodeId) {
        related.add(edge.target);
      } else if (edge.target === focusedNodeId) {
        related.add(edge.source);
      }
    }
    return related;
  });
  const relatedEdgeIds = computed(() => {
    const focusedNodeId = selection.value.focused_node_id;
    if (!focusedNodeId) {
      return new Set<string>();
    }
    const related = new Set<string>();
    for (const edge of edges.value) {
      if (edge.source === focusedNodeId || edge.target === focusedNodeId) {
        related.add(edge.id);
      }
    }
    return related;
  });
  const capabilityTitles = computed(() =>
    (activeManifest.value?.capabilities || [])
      .map((item) => item.title)
      .filter((title): title is string => typeof title === "string" && title.length > 0)
  );
  const quickAddCount = computed(() => nodes.value.length + 1);

  watch(
    () => ({
      active: isBoardActive.value,
      hasResource: Boolean(currentStateBinding.value),
      hasManifest: Boolean(activeManifest.value),
      hasBoardData: Boolean(boardData.value),
      anchor: activeAnchor.value,
    }),
    (state) => {
      if (!state.active || !state.hasManifest || state.hasBoardData) {
        return;
      }
      const manifest = activeManifest.value;
      if (!manifest) {
        return;
      }
      const fallbackResource = cloneBoardStateBinding(BOARD_DEFAULT_RESOURCE);
      const rawResource = currentStateBinding.value || fallbackResource;
      const normalized = validateBoardStateBinding(rawResource as unknown as Record<string, unknown>);
      if ("error_code" in normalized) {
        return;
      }
      const nextAnchor = activeAnchor.value || "board.canvas";
      setActiveViewState({
        viewId: "board.main",
        activeAnchor: nextAnchor,
        state_binding: normalized,
        manifest: {
          ...manifest,
          state_summary: buildBoardMainStateSummary(normalized, nextAnchor),
        },
      });
    },
    { immediate: true }
  );

  const flowNodes = computed<Node<BoardFlowNodeData>[]>(() =>
    nodes.value.map((node) => ({
      id: node.id,
      type: "boardCard",
      position: { ...node.position },
      draggable: true,
      selectable: true,
      data: {
        title: node.title,
        description: node.description,
        media_type: node.media_type,
        semantic_type: node.semantic_type,
        tags: [...node.tags],
        pinned: node.pinned,
        focused: selection.value.focused_node_id === node.id,
        incoming_count: incomingCountByNodeId.value.get(node.id) || 0,
        outgoing_count: outgoingCountByNodeId.value.get(node.id) || 0,
        handles_mode: boardStyleSettings.value.handles_mode,
        is_connect_target: hoveringConnectTargetNodeId.value === node.id,
        is_related: relatedNodeIds.value.size > 0 ? relatedNodeIds.value.has(node.id) : false,
        is_dimmed: relatedNodeIds.value.size > 0 && !relatedNodeIds.value.has(node.id),
      },
    }))
  );

  const nodeById = computed(() => {
    const mapping = new Map<string, BoardNode>();
    for (const node of nodes.value) {
      mapping.set(node.id, node);
    }
    return mapping;
  });

  const flowEdges = computed<Edge[]>(() =>
    edges.value.map((edge) => {
      const sourceNode = nodeById.value.get(edge.source);
      const targetNode = nodeById.value.get(edge.target);
      const resolved = sourceNode && targetNode
        ? resolveEdgeHandles(edge, sourceNode, targetNode, boardStyleSettings.value.handles_mode)
        : null;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: resolved?.sourceHandle,
        targetHandle: resolved?.targetHandle,
        label: edge.label,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
        },
        type: boardStyleSettings.value.edge_style === "bezier"
          ? "default"
          : boardStyleSettings.value.edge_style,
        pathOptions: {
          curvature: boardStyleSettings.value.edge_curvature,
        },
        selected: selection.value.selected_edge_ids.includes(edge.id),
        class: [
          "board-edge",
          relatedEdgeIds.value.size > 0
            ? (relatedEdgeIds.value.has(edge.id) ? "board-edge--related" : "board-edge--dimmed")
            : "",
        ].filter(Boolean).join(" "),
      };
    })
  );

  async function applyLocalCapabilityResult(
    result: ViewCapabilityResult,
    fallbackResource: ViewStateBinding
  ): Promise<ViewCapabilityResult> {
    if ("ok" in result && result.ok === false) {
      return result;
    }
    const currentManifest = activeManifest.value;
    if (!currentManifest) {
      return result;
    }
    const nextResource = result.state_binding || fallbackResource;
    const nextAnchor = result.activeAnchor || "board.canvas";
    setActiveViewState({
      viewId: "board.main",
      activeAnchor: nextAnchor,
      state_binding: nextResource,
      manifest: {
        ...currentManifest,
        state_summary: buildBoardMainStateSummary(nextResource, nextAnchor),
      },
    });
    return result;
  }

  async function runBoardCapability(
    capabilityId: string,
    input: Record<string, unknown>,
    options?: {
      emitSelectionEvent?: boolean;
    }
  ) {
    if (!currentStateBinding.value || isMutating.value) {
      return;
    }
    isMutating.value = true;
    const baseResource = currentStateBinding.value;
    try {
      const capabilityResult = await invokeBoardMainCapability(capabilityId, input, baseResource);
      const applied = await applyLocalCapabilityResult(capabilityResult, baseResource);
      if (
        options?.emitSelectionEvent
        && !("ok" in applied && applied.ok === false)
        && typeof applied.data?.node_id === "string"
      ) {
        emitAssistantRuntimeEvent({
          type: ASSISTANT_RUNTIME_EVENT_TYPES.BOARD_NODE_SELECTED,
          source: "view",
          payload: {
            view_id: "board.main",
            binding_label: (applied.state_binding || baseResource).binding_label || "",
            node_id: applied.data.node_id,
            media_type: String(applied.data.media_type || ""),
            semantic_type: String(applied.data.semantic_type || ""),
          },
        });
      }
    } finally {
      isMutating.value = false;
    }
  }

  async function addQuickNote() {
    await runBoardCapability("board.add_node", {
      title: `Node ${quickAddCount.value}`,
      description: "A fresh board node added from the local scene shell.",
      media_type: "text",
      semantic_type: "note",
      tags: ["new"],
      data: {
        content: "Add details here.",
      },
    });
  }

  async function focusNode(nodeId: string) {
    await runBoardCapability("board.focus_node", { node_id: nodeId }, { emitSelectionEvent: true });
  }

  async function arrangeLayout() {
    await runBoardCapability("board.arrange_layout", {});
  }

  function updateStyleSettings(
    patch: Partial<BoardStyleSettings>,
  ) {
    if (!currentStateBinding.value || !activeManifest.value) {
      return;
    }
    const nextResource = cloneBoardStateBinding(currentStateBinding.value);
    const board = readBoardStateBindingData(nextResource);
    board.style_settings = {
      ...boardStyleSettings.value,
      ...patch,
    };
    board.style_settings.edge_curvature = Math.min(1, Math.max(0, board.style_settings.edge_curvature));
    const nextAnchor = activeAnchor.value || "board.canvas";
    setActiveViewState({
      viewId: "board.main",
      activeAnchor: nextAnchor,
      state_binding: nextResource,
      manifest: {
        ...activeManifest.value,
        state_summary: buildBoardMainStateSummary(nextResource, nextAnchor),
      },
    });
    if (
      patch.layout_algorithm !== undefined
      || patch.layout_direction !== undefined
      || patch.avoid_overlap_strength !== undefined
      || patch.auto_layout_on_add !== undefined
    ) {
      void arrangeLayout();
    }
  }

  async function togglePinNode(node: BoardNode) {
    await runBoardCapability(node.pinned ? "board.unpin_node" : "board.pin_node", {
      node_id: node.id,
    });
  }

  async function handleNodeClick(payload: unknown) {
    const nodeId = extractNodeId(payload);
    if (!nodeId) {
      return;
    }
    
    // Always call focusNode to ensure activeAnchor updates to 'board.inspector'
    // The previous optimization prevented re-opening the inspector if closed manually
    await focusNode(nodeId);
  }

  // To prevent single click being interpreted as drag and closing the inspector, 
  // only record a drag stop if the position actually changed significantly.
  // VueFlow node drag events include the node and the raw event. We'll rely on the update capability
  // to compare positions and correctly determine if it was a pure drag.
  async function handleNodeDragStop(payload: unknown) {
    const nodeId = extractNodeId(payload);
    const position = extractNodePosition(payload);
    if (!nodeId || !position) {
      return;
    }
    await runBoardCapability("board.update_node", {
      node_id: nodeId,
      position,
      pinned: true,
    });
  }

  async function handleConnect(payload: unknown) {
    const connection = extractConnection(payload);
    if (!connection) {
      logger.warn("connect_payload_invalid", {
        payload_type: typeof payload,
      });
      return;
    }
    logger.info("connect_event_received", {
      source_node_id: connection.source_node_id,
      target_node_id: connection.target_node_id,
      source_handle: connection.source_handle || "",
      target_handle: connection.target_handle || "",
    });
    didConnectDuringDrag.value = true;
    if (connection.source_handle && connection.target_handle) {
      logger.info("connect_event_submit_fixed", {
        source_node_id: connection.source_node_id,
        target_node_id: connection.target_node_id,
        source_handle: connection.source_handle,
        target_handle: connection.target_handle,
      });
      await runBoardCapability("board.add_edge", connection);
      return;
    }
    logger.info("connect_event_submit_auto", {
      source_node_id: connection.source_node_id,
      target_node_id: connection.target_node_id,
    });
    await runBoardCapability("board.add_edge", {
      source_node_id: connection.source_node_id,
      target_node_id: connection.target_node_id,
    });
  }

  function handleConnectStart(...args: unknown[]) {
    const eventSourceNodeId = extractConnectStartNodeId(args);
    connectingFromNodeId.value = pendingConnectSourceNodeId.value || eventSourceNodeId;
    hoveringConnectTargetNodeId.value = "";
    hoveringConnectTargetCandidates.value = [];
    lastConnectPointerPoint.value = extractClientPoint(args);
    didConnectDuringDrag.value = false;
    logger.info("connect_start", {
      source_node_id: connectingFromNodeId.value || "",
      source_node_id_from_pointer_down: pendingConnectSourceNodeId.value || "",
      source_node_id_from_event: eventSourceNodeId || "",
      args_count: args.length,
    });
  }

  function extractClientPoint(args: unknown[]): { x: number; y: number } | null {
    for (const payload of args) {
      if (!payload || typeof payload !== "object") {
        continue;
      }
      const maybeMouse = payload as Record<string, unknown>;
      const x = maybeMouse.clientX;
      const y = maybeMouse.clientY;
      if (typeof x === "number" && typeof y === "number") {
        return { x, y };
      }
      const nestedEvent = maybeMouse.event;
      if (nestedEvent && typeof nestedEvent === "object") {
        const eventRecord = nestedEvent as Record<string, unknown>;
        if (typeof eventRecord.clientX === "number" && typeof eventRecord.clientY === "number") {
          return { x: eventRecord.clientX, y: eventRecord.clientY };
        }
      }
      const changedTouches = maybeMouse.changedTouches;
      if (Array.isArray(changedTouches) && changedTouches.length > 0) {
        const first = changedTouches[0] as Record<string, unknown>;
        if (typeof first?.clientX === "number" && typeof first?.clientY === "number") {
          return { x: first.clientX, y: first.clientY };
        }
      }
    }
    return null;
  }

  function resolveNodeIdFromElement(element: Element | null): string {
    if (!element) {
      return "";
    }
    const boardNode = element.closest("[data-board-node-id]") as HTMLElement | null;
    if (boardNode?.dataset?.boardNodeId) {
      return boardNode.dataset.boardNodeId;
    }
    const flowNode = element.closest(".vue-flow__node[data-id]") as HTMLElement | null;
    if (flowNode?.dataset?.id) {
      return flowNode.dataset.id;
    }
    return "";
  }

  function collectNodeCandidatesFromPoint(x: number, y: number): string[] {
    if (typeof document === "undefined" || typeof document.elementsFromPoint !== "function") {
      return [];
    }
    const elements = document.elementsFromPoint(x, y);
    const candidates: string[] = [];
    for (const element of elements) {
      const nodeId = resolveNodeIdFromElement(element);
      if (!nodeId || candidates.includes(nodeId)) {
        continue;
      }
      candidates.push(nodeId);
    }
    return candidates;
  }

  function updateHoveringConnectTarget(point: { x: number; y: number } | null) {
    lastConnectPointerPoint.value = point;
    if (!connectingFromNodeId.value || !point) {
      hoveringConnectTargetNodeId.value = "";
      hoveringConnectTargetCandidates.value = [];
      return;
    }
    const candidates = collectNodeCandidatesFromPoint(point.x, point.y);
    const targetNodeId = candidates.find((candidate) => candidate !== connectingFromNodeId.value) || "";
    const previousTarget = hoveringConnectTargetNodeId.value;
    const previousCandidates = hoveringConnectTargetCandidates.value.join(",");
    const nextCandidates = candidates.join(",");
    hoveringConnectTargetNodeId.value = targetNodeId;
    hoveringConnectTargetCandidates.value = candidates;
    if (previousTarget !== targetNodeId || previousCandidates !== nextCandidates) {
      logger.info("connect_hover_target_changed", {
        source_node_id: connectingFromNodeId.value || "",
        target_node_id: targetNodeId || "",
        target_candidates: nextCandidates,
        client_x: point.x,
        client_y: point.y,
      });
    }
  }

  function clearConnectTrackingState() {
    pendingConnectSourceNodeId.value = "";
    connectingFromNodeId.value = "";
    hoveringConnectTargetNodeId.value = "";
    hoveringConnectTargetCandidates.value = [];
    lastConnectPointerPoint.value = null;
    didConnectDuringDrag.value = false;
  }

  function handleDocumentPointerDown(event: PointerEvent) {
    if (!isBoardActive.value) {
      pendingConnectSourceNodeId.value = "";
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    const sourceHandle = target?.closest("[data-board-source-node-id]") as HTMLElement | null;
    pendingConnectSourceNodeId.value = sourceHandle?.dataset?.boardSourceNodeId || "";
    if (pendingConnectSourceNodeId.value) {
      logger.info("connect_pointer_down_source_captured", {
        source_node_id: pendingConnectSourceNodeId.value,
      });
    }
  }

  function handleDocumentPointerMove(event: PointerEvent) {
    if (!connectingFromNodeId.value) {
      return;
    }
    updateHoveringConnectTarget({
      x: event.clientX,
      y: event.clientY,
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    document.addEventListener("pointermove", handleDocumentPointerMove, true);
  }

  onBeforeUnmount(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    document.removeEventListener("pointermove", handleDocumentPointerMove, true);
  });

  function findNodeIdFromConnectEnd(args: unknown[], sourceNodeId: string): { nodeId: string; candidates: string[] } {
    if (typeof document === "undefined") {
      return { nodeId: "", candidates: [] };
    }
    const point = extractClientPoint(args);
    if (!point) {
      return { nodeId: "", candidates: [] };
    }
    const candidates = collectNodeCandidatesFromPoint(point.x, point.y);
    const preferred = candidates.find((candidate) => candidate !== sourceNodeId) || "";
    if (preferred) {
      return { nodeId: preferred, candidates };
    }
    const element = document.elementFromPoint(point.x, point.y);
    const direct = resolveNodeIdFromElement(element);
    return { nodeId: direct, candidates };
  }

  async function handleConnectEnd(...args: unknown[]) {
    const sourceNodeId = connectingFromNodeId.value;
    const hoveredTargetNodeId = hoveringConnectTargetNodeId.value;
    const hoveredTargetCandidates = [...hoveringConnectTargetCandidates.value];
    const trackedPoint = lastConnectPointerPoint.value;
    const shouldResolveFallback = Boolean(sourceNodeId && !didConnectDuringDrag.value);
    logger.info("connect_end", {
      source_node_id: sourceNodeId || "",
      should_resolve_fallback: shouldResolveFallback,
      args_count: args.length,
    });
    if (!shouldResolveFallback) {
      logger.info("connect_end_skip_fallback", {
        reason: sourceNodeId ? "connect_event_already_handled" : "missing_source_node",
      });
      clearConnectTrackingState();
      return;
    }
    const eventTargetNodeId = extractConnectEndTargetNodeId(args);
    const domResolution = findNodeIdFromConnectEnd(args, sourceNodeId || "");
    const domTargetNodeId = domResolution.nodeId;
    const targetNodeId = eventTargetNodeId || hoveredTargetNodeId || domTargetNodeId;
    const point = extractClientPoint(args) || trackedPoint;
    logger.info("connect_end_target_detected", {
      source_node_id: sourceNodeId || "",
      target_node_id_from_event: eventTargetNodeId || "",
      target_node_id_from_hover: hoveredTargetNodeId || "",
      target_candidates_from_hover: hoveredTargetCandidates.join(","),
      target_node_id_from_dom: domTargetNodeId || "",
      target_candidates_from_dom: domResolution.candidates.join(","),
      target_node_id: targetNodeId || "",
      client_x: point?.x,
      client_y: point?.y,
      source_title: nodes.value.find((node) => node.id === sourceNodeId)?.title || "",
      target_title: nodes.value.find((node) => node.id === targetNodeId)?.title || "",
    });
    if (!targetNodeId || targetNodeId === sourceNodeId) {
      logger.warn("connect_end_abort_invalid_target", {
        source_node_id: sourceNodeId || "",
        target_node_id: targetNodeId || "",
      });
      clearConnectTrackingState();
      return;
    }
    const sourceExists = nodes.value.some((node) => node.id === sourceNodeId);
    const targetExists = nodes.value.some((node) => node.id === targetNodeId);
    if (!sourceExists || !targetExists) {
      logger.warn("connect_end_abort_node_not_found", {
        source_node_id: sourceNodeId || "",
        target_node_id: targetNodeId || "",
        source_exists: sourceExists,
        target_exists: targetExists,
      });
      clearConnectTrackingState();
      return;
    }
    const duplicate = edges.value.some((edge) =>
      edge.source === sourceNodeId && edge.target === targetNodeId
    );
    if (duplicate) {
      logger.debug("connect_end_abort_duplicate", {
        source_node_id: sourceNodeId || "",
        target_node_id: targetNodeId || "",
      });
      clearConnectTrackingState();
      return;
    }
    logger.info("connect_end_submit_auto", {
      source_node_id: sourceNodeId || "",
      target_node_id: targetNodeId || "",
    });
    try {
      await runBoardCapability("board.add_edge", {
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
      });
    } finally {
      clearConnectTrackingState();
    }
  }

  async function handleNodesChange(payload: unknown) {
    if (!Array.isArray(payload)) {
      return;
    }
    for (const change of payload) {
      if (!change || typeof change !== "object") {
        continue;
      }
      const changeRecord = change as Record<string, unknown>;
      if (changeRecord.type !== "remove") {
        continue;
      }
      const nodeId = extractNodeId(changeRecord);
      if (!nodeId) {
        continue;
      }
      await runBoardCapability("board.remove_node", { node_id: nodeId });
    }
  }

  async function handleEdgesChange(payload: unknown) {
    if (!Array.isArray(payload)) {
      return;
    }
    for (const change of payload) {
      if (!change || typeof change !== "object") {
        continue;
      }
      const changeRecord = change as Record<string, unknown>;
      if (changeRecord.type !== "remove") {
        continue;
      }
      const edgeId = extractEdgeId(changeRecord);
      if (!edgeId) {
        continue;
      }
      await runBoardCapability("board.remove_edge", { edge_id: edgeId });
    }
  }

  function toggleBoardDebug() {
    const nextValue = !debugEnabled.value;
    debugEnabled.value = nextValue;
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(BOARD_DEBUG_STORAGE_KEY, nextValue ? "1" : "0");
    } catch {
      // ignore storage failure
    }
  }

  return {
    activeAnchor,
    activeManifest,
    boardData,
    capabilityTitles,
    currentStateBinding,
    edges,
    flowEdges,
    flowNodes,
    handleNodeClick,
    handleNodeDragStop,
    handleConnect,
    handleNodesChange,
    handleEdgesChange,
    handleConnectStart,
    handleConnectEnd,
    debugEnabled,
    isBoardActive,
    isMutating,
    boardStyleSettings,
    nodeTypes,
    nodes,
    pinnedCount,
    selection,
    selectedNode,
    addQuickNote,
    arrangeLayout,
    updateStyleSettings,
    toggleBoardDebug,
    focusNode,
    togglePinNode,
    readBoardData: () => currentStateBinding.value ? readBoardStateBindingData(currentStateBinding.value) : null,
  };
}
