import type { ViewDescribeOptions, ViewStateBinding } from "../../../../runtime/view";
import { readBoardStateBindingData } from "./resource";

function normalizeTitleKey(title: string): string {
  return title.trim().toLowerCase();
}

export function buildBoardMainStateSummary(
  state_binding: ViewStateBinding,
  activeAnchor?: string,
  options: ViewDescribeOptions = {}
) {
  const board = readBoardStateBindingData(state_binding);
  const maxNodes = typeof options.max_nodes === "number" ? Math.max(1, Math.trunc(options.max_nodes)) : 20;
  const maxEdges = typeof options.max_edges === "number" ? Math.max(1, Math.trunc(options.max_edges)) : 20;
  const nodes = Array.isArray(board.nodes) ? board.nodes : [];
  const edges = Array.isArray(board.edges) ? board.edges : [];
  const nodesBrief = nodes.slice(0, maxNodes).map((node) => ({
    id: node.id,
    title: node.title,
    semantic_type: node.semantic_type,
    media_type: node.media_type,
    pinned: node.pinned,
  }));
  const edgesBrief = edges.slice(0, maxEdges).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || "",
  }));
  const titleIndex = nodes.reduce<Record<string, string[]>>((accumulator, node) => {
    const key = normalizeTitleKey(node.title || "");
    if (!key) {
      return accumulator;
    }
    accumulator[key] = accumulator[key] ? [...accumulator[key], node.id] : [node.id];
    return accumulator;
  }, {});
  return {
    resource_title: state_binding.title || "",
    board_id: typeof board.board_id === "string" ? board.board_id : "",
    node_count: nodes.length,
    edge_count: edges.length,
    pinned_node_count: nodes.filter((node) => node.pinned).length,
    selected_node_count: Array.isArray(board.selection?.selected_node_ids)
      ? board.selection.selected_node_ids.length
      : 0,
    focused_node_id: typeof board.selection?.focused_node_id === "string" ? board.selection.focused_node_id : "",
    layout_mode: board.layout_mode === "mixed" ? "mixed" : "auto",
    active_anchor: activeAnchor || "",
    nodes_brief: nodesBrief,
    edges_brief: edgesBrief,
    title_index: titleIndex,
    summary_limits: {
      applied_max_nodes: maxNodes,
      applied_max_edges: maxEdges,
      has_more_nodes: nodes.length > nodesBrief.length,
      has_more_edges: edges.length > edgesBrief.length,
    },
  };
}
