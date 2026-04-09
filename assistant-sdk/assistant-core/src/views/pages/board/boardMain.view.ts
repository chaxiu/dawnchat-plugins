import BoardMainView from "./BoardMainView.vue";
import { defineView } from "../../../runtime/view/manifest";
import { invokeBoardMainCapability } from "./capabilities";
import { boardMainPersistence } from "./model/persistence";
import {
  BOARD_DEFAULT_RESOURCE,
  openBoardMainView,
  validateBoardResource,
} from "./model/resource";
import { buildBoardMainStateSummary } from "./model/summary";
import {
  BOARD_MEDIA_TYPES,
  BOARD_SEMANTIC_TYPES,
} from "./model/types";

export {
  BOARD_DEFAULT_RESOURCE,
  cloneBoardResource,
  normalizeBoardResource,
  openBoardMainView,
  readBoardResourceData,
  validateBoardResource,
} from "./model/resource";
export { boardMainPersistence } from "./model/persistence";
export { buildBoardMainStateSummary } from "./model/summary";
export * from "./model/types";

export const boardMainView = defineView({
  view_id: "board.main",
  resource_type: "board.workspace",
  title: "Holographic Clue Wall",
  component: BoardMainView,
  state_mode: "stateful",
  default_resource: BOARD_DEFAULT_RESOURCE,
  anchors: [
    { id: "board.header", title: "Topbar", description: "Floating topbar with compact scene stats and quick actions." },
    { id: "board.canvas", title: "Canvas", description: "The main board canvas with nodes and directed edges." },
    { id: "board.inspector", title: "Inspector", description: "On-demand drawer with selection details and board controls." },
  ],
  capabilities: [
    {
      id: "board.add_node",
      mode: "write",
      title: "Add Node",
      description: "Add a new node with media metadata and board content.",
      assistant_hint: "Use this to append a new clue card. The runtime will auto-layout unpinned nodes after insertion.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          media_type: { type: "string", enum: [...BOARD_MEDIA_TYPES] },
          semantic_type: { type: "string", enum: [...BOARD_SEMANTIC_TYPES] },
          tags: { type: "array", items: { type: "string" } },
          pinned: { type: "boolean" },
          data: { type: "object" },
        },
        required: ["title"],
      },
      affected_anchors: ["board.canvas", "board.inspector"],
      error_codes: ["invalid_view_capability_input"],
    },
    {
      id: "board.update_node",
      mode: "write",
      title: "Update Node",
      description: "Update node text, metadata, pin state, or local position.",
      assistant_hint: "Use this for local edits and drag synchronization. Prefer compact patches instead of resending the entire board.",
      input_schema: {
        type: "object",
        properties: {
          node_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          media_type: { type: "string", enum: [...BOARD_MEDIA_TYPES] },
          semantic_type: { type: "string", enum: [...BOARD_SEMANTIC_TYPES] },
          tags: { type: "array", items: { type: "string" } },
          pinned: { type: "boolean" },
          position: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
            },
          },
          data: { type: "object" },
        },
        required: ["node_id"],
      },
      affected_anchors: ["board.canvas", "board.inspector"],
      error_codes: ["invalid_view_capability_input", "board_node_not_found"],
    },
    {
      id: "board.remove_node",
      mode: "write",
      title: "Remove Node",
      description: "Remove a node and any connected edges.",
      input_schema: {
        type: "object",
        properties: {
          node_id: { type: "string" },
        },
        required: ["node_id"],
      },
      affected_anchors: ["board.canvas", "board.inspector"],
      error_codes: ["board_node_not_found"],
    },
    {
      id: "board.add_edge",
      mode: "write",
      title: "Add Edge",
      description: "Create a directed edge between two existing nodes.",
      assistant_hint: "Use source_node_id and target_node_id only. The board keeps edges directional by default.",
      input_schema: {
        type: "object",
        properties: {
          source_node_id: { type: "string" },
          target_node_id: { type: "string" },
          source_handle: { type: "string", enum: ["left", "right", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"] },
          target_handle: { type: "string", enum: ["left", "right", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"] },
          label: { type: "string" },
        },
        required: ["source_node_id", "target_node_id"],
      },
      affected_anchors: ["board.canvas"],
      error_codes: ["board_node_not_found", "invalid_view_capability_input", "board_edge_duplicate"],
    },
    {
      id: "board.remove_edge",
      mode: "write",
      title: "Remove Edge",
      description: "Remove an existing directed edge from the board.",
      input_schema: {
        type: "object",
        properties: {
          edge_id: { type: "string" },
        },
        required: ["edge_id"],
      },
      affected_anchors: ["board.canvas"],
      error_codes: ["board_edge_not_found"],
    },
    {
      id: "board.arrange_layout",
      mode: "write",
      title: "Arrange Layout",
      description: "Run ELK auto layout for unpinned nodes and rebalance the board graph.",
      assistant_hint: "Use this when the graph becomes dense. Pinned nodes stay fixed while the rest rebalance.",
      input_schema: {
        type: "object",
        properties: {},
      },
      affected_anchors: ["board.canvas"],
    },
    {
      id: "board.pin_node",
      mode: "write",
      title: "Pin Node",
      description: "Freeze a node so later auto-layout runs keep its current position.",
      input_schema: {
        type: "object",
        properties: {
          node_id: { type: "string" },
        },
        required: ["node_id"],
      },
      affected_anchors: ["board.canvas", "board.inspector"],
      error_codes: ["board_node_not_found"],
    },
    {
      id: "board.unpin_node",
      mode: "write",
      title: "Unpin Node",
      description: "Release a pinned node and let the next auto-layout place it again.",
      input_schema: {
        type: "object",
        properties: {
          node_id: { type: "string" },
        },
        required: ["node_id"],
      },
      affected_anchors: ["board.canvas", "board.inspector"],
      error_codes: ["board_node_not_found"],
    },
    {
      id: "board.focus_node",
      mode: "read",
      title: "Focus Node",
      description: "Focus one node in the inspector and mark it as the active selection.",
      assistant_hint: "Use this before detailed reading or follow-up edits when the board has many nodes.",
      input_schema: {
        type: "object",
        properties: {
          node_id: { type: "string" },
        },
        required: ["node_id"],
      },
      affected_anchors: ["board.canvas", "board.inspector"],
      error_codes: ["board_node_not_found"],
    },
  ],
  interaction_hints: {
    interaction_intent: "Best for arranging notes, evidence, and media references into a directed board with lightweight semantic metadata.",
    recommended_mode: "hybrid",
    decision_rule: "Use direct reads for inspection, but prefer structured mutations when the board graph is evolving. Never treat a node title as a node_id; confirm the real id from add_node results or describe output before calling board.add_edge.",
    examples: [
      {
        name: "open_then_describe",
        mode: "entry",
        call: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "view.open",
            input: {
              view_id: "board.main",
              resource: {},
              initial_anchor: "board.canvas",
            },
          },
        },
        then: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "assistant.view.describe",
            input: {
              view_id: "board.main",
            },
          },
        },
      },
      {
        name: "session_add_node",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "add-node",
                action: {
                  type: "view.capability.invoke",
                  payload: {
                    view_id: "board.main",
                    capability_id: "board.add_node",
                    input: {
                      title: "New clue",
                      semantic_type: "note",
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        name: "describe_then_connect_by_confirmed_ids",
        mode: "direct_capability",
        call: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "assistant.view.describe",
            input: {
              view_id: "board.main",
              max_nodes: 50,
              max_edges: 50,
            },
          },
        },
        then: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "view.capability.invoke",
            input: {
              view_id: "board.main",
              capability_id: "board.add_edge",
              input: {
                source_node_id: "<confirmed_source_node_id>",
                target_node_id: "<confirmed_target_node_id>",
              },
            },
          },
        },
      },
      {
        name: "session_focus_then_narrate",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "focus-inspector",
                action: {
                  type: "view.focus",
                  payload: {
                    view_id: "board.main",
                    anchor: "board.inspector",
                  },
                },
              },
              {
                id: "narrate-summary",
                action: {
                  type: "guide.narrate",
                  payload: {
                    text: "先看右侧 inspector，再决定下一步结构化编辑。",
                  },
                },
              },
            ],
          },
        },
      },
    ],
    key_events: [
      {
        type: "assistant.board.node_selected",
        description: "Emitted when the user or local view interaction focuses one node on the board.",
        match_fields: ["node_id", "media_type", "semantic_type"],
      },
    ],
  },
  persistence: boardMainPersistence,
  open: openBoardMainView,
  normalizeResource: validateBoardResource,
  invokeCapability: invokeBoardMainCapability,
  describeState: (resource, activeAnchor, options) =>
    buildBoardMainStateSummary(resource, activeAnchor, options),
  getStateSummary: buildBoardMainStateSummary,
});
