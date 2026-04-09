export const BOARD_MEDIA_TYPES = [
  "plain",
  "text",
  "image",
  "video",
  "webpage",
  "audio",
  "document",
] as const;

export const BOARD_SEMANTIC_TYPES = [
  "note",
  "evidence",
  "person",
  "event",
  "location",
  "url",
  "unknown",
] as const;

export type BoardMediaType = (typeof BOARD_MEDIA_TYPES)[number];
export type BoardSemanticType = (typeof BOARD_SEMANTIC_TYPES)[number];
export type BoardLayoutMode = "auto" | "mixed";
export type BoardLayoutAlgorithm = "stress" | "layered" | "mindmap";
export type BoardLayoutDirection = "LR" | "TB";
export type BoardEdgeStyle = "bezier" | "smoothstep" | "straight";
export type BoardHandlesMode = "left-right" | "four-sides" | "eight-points";
export type BoardAvoidOverlapStrength = "low" | "medium" | "high";
export type BoardHandleSide =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export type BoardEdgePortsMode = "auto" | "fixed";

export interface BoardViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface BoardSelection {
  selected_node_ids: string[];
  selected_edge_ids: string[];
  focused_node_id: string;
}

export interface BoardNodePosition {
  x: number;
  y: number;
}

export interface BoardNodeSize {
  width: number;
  height: number;
}

export interface BoardNode {
  id: string;
  title: string;
  description: string;
  media_type: BoardMediaType;
  semantic_type: BoardSemanticType;
  tags: string[];
  position: BoardNodePosition;
  size: BoardNodeSize;
  pinned: boolean;
  data: Record<string, unknown>;
}

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
  ports_mode: BoardEdgePortsMode;
  source_handle?: BoardHandleSide;
  target_handle?: BoardHandleSide;
  directed: true;
  label?: string;
}

export interface BoardStyleSettings {
  layout_algorithm: BoardLayoutAlgorithm;
  layout_direction: BoardLayoutDirection;
  edge_style: BoardEdgeStyle;
  edge_curvature: number;
  handles_mode: BoardHandlesMode;
  auto_layout_on_add: boolean;
  avoid_overlap_strength: BoardAvoidOverlapStrength;
}

export interface BoardResourceData {
  board_id: string;
  description: string;
  nodes: BoardNode[];
  edges: BoardEdge[];
  viewport: BoardViewport;
  selection: BoardSelection;
  layout_mode: BoardLayoutMode;
  style_settings: BoardStyleSettings;
}

export interface BoardFlowNodeData {
  title: string;
  description: string;
  media_type: BoardMediaType;
  semantic_type: BoardSemanticType;
  tags: string[];
  pinned: boolean;
  focused: boolean;
  incoming_count: number;
  outgoing_count: number;
  handles_mode: BoardHandlesMode;
  is_connect_target: boolean;
  is_related: boolean;
  is_dimmed: boolean;
}

export const BOARD_DESCRIPTION_LIMIT = 240;
export const BOARD_TITLE_LIMIT = 72;
export const BOARD_TAG_LIMIT = 8;
export const BOARD_TAG_LENGTH_LIMIT = 24;
export const BOARD_DEFAULT_NODE_SIZE: BoardNodeSize = {
  width: 240,
  height: 148,
};
