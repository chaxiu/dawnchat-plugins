import TictactoeMainView from "./TictactoeMainView.vue";
import {
  defineView,
  type ViewOpenSuccess,
  type ViewOperationFailure,
  type ViewPersistenceConfig,
  type ViewPersistenceStateSnapshot,
  type ViewResourceBinding,
} from "../../../runtime/view/manifest";
import {
  buildOperationError,
  cloneViewResource,
  isViewOperationFailure,
  toRecord,
} from "../../shared/viewUtils";
import {
  buildTictactoeMainStateSummary,
  invokeTictactoeMainCapability,
} from "./tictactoeMain.capabilities";

export const TICTACTOE_BOARD_SIZE = 5;
export const TICTACTOE_WIN_LENGTH = 4;
export const TICTACTOE_EMPTY_CELL = "";

export type TicTacToePlayer = "X" | "O";
export type TicTacToeWinner = TicTacToePlayer | "draw" | "";
export type TicTacToeStatus = "playing" | "won" | "draw";

export interface TicTacToeLastMove {
  index: number;
  row: number;
  col: number;
  player: TicTacToePlayer;
}

export interface TicTacToeResourceData {
  board_size: number;
  win_length: number;
  cells: string[];
  current_player: TicTacToePlayer | "";
  move_count: number;
  winner: TicTacToeWinner;
  status: TicTacToeStatus;
  last_move: TicTacToeLastMove | null;
  winning_cells: number[];
}

export const TICTACTOE_DEFAULT_RESOURCE: ViewResourceBinding = {
  resource_type: "tictactoe.game",
  resource_id: "tictactoe:neon-grid",
  title: "Neon Grid",
  data: {
    board_size: TICTACTOE_BOARD_SIZE,
    win_length: TICTACTOE_WIN_LENGTH,
    cells: Array.from({ length: TICTACTOE_BOARD_SIZE * TICTACTOE_BOARD_SIZE }, () => TICTACTOE_EMPTY_CELL),
    current_player: "X",
    move_count: 0,
    winner: "",
    status: "playing",
    last_move: null,
    winning_cells: [],
  } satisfies TicTacToeResourceData,
};

export function cloneTictactoeResource(resource: ViewResourceBinding): ViewResourceBinding {
  return cloneViewResource(resource);
}

export function createDefaultTictactoeData(): TicTacToeResourceData {
  return JSON.parse(JSON.stringify(TICTACTOE_DEFAULT_RESOURCE.data)) as TicTacToeResourceData;
}

export function normalizeTictactoeResource(raw: Record<string, unknown>): ViewResourceBinding {
  const defaults = createDefaultTictactoeData();
  const rawData = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
    ? raw.data as Record<string, unknown>
    : {};
  const rawCells = Array.isArray(rawData.cells) ? rawData.cells : defaults.cells;
  const cells = rawCells
    .slice(0, TICTACTOE_BOARD_SIZE * TICTACTOE_BOARD_SIZE)
    .map((cell) => (cell === "X" || cell === "O" ? cell : TICTACTOE_EMPTY_CELL));
  while (cells.length < TICTACTOE_BOARD_SIZE * TICTACTOE_BOARD_SIZE) {
    cells.push(TICTACTOE_EMPTY_CELL);
  }
  const moveCount = typeof rawData.move_count === "number"
    ? Math.max(0, Math.min(TICTACTOE_BOARD_SIZE * TICTACTOE_BOARD_SIZE, Math.trunc(rawData.move_count)))
    : cells.filter((cell) => cell === "X" || cell === "O").length;
  const winner = rawData.winner === "X" || rawData.winner === "O" || rawData.winner === "draw"
    ? rawData.winner
    : defaults.winner;
  const status = rawData.status === "won" || rawData.status === "draw" || rawData.status === "playing"
    ? rawData.status
    : defaults.status;
  const currentPlayer = rawData.current_player === "X" || rawData.current_player === "O" || rawData.current_player === ""
    ? rawData.current_player
    : defaults.current_player;
  const lastMove = rawData.last_move && typeof rawData.last_move === "object" && !Array.isArray(rawData.last_move)
    ? rawData.last_move as Record<string, unknown>
    : null;
  const normalizedLastMove = lastMove
    && typeof lastMove.index === "number"
    && typeof lastMove.row === "number"
    && typeof lastMove.col === "number"
    && (lastMove.player === "X" || lastMove.player === "O")
    ? {
        index: Math.trunc(lastMove.index),
        row: Math.trunc(lastMove.row),
        col: Math.trunc(lastMove.col),
        player: lastMove.player as TicTacToePlayer,
      }
    : null;
  const winningCells = Array.isArray(rawData.winning_cells)
    ? rawData.winning_cells
        .map((value) => (typeof value === "number" ? Math.trunc(value) : Number.NaN))
        .filter((value) => Number.isInteger(value) && value >= 0 && value < TICTACTOE_BOARD_SIZE * TICTACTOE_BOARD_SIZE)
    : [];

  return {
    resource_type: "tictactoe.game",
    resource_id: typeof raw.resource_id === "string" && raw.resource_id.trim()
      ? raw.resource_id.trim()
      : String(TICTACTOE_DEFAULT_RESOURCE.resource_id || "tictactoe:neon-grid"),
    title: typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : String(TICTACTOE_DEFAULT_RESOURCE.title || "Neon Grid"),
    data: {
      board_size: TICTACTOE_BOARD_SIZE,
      win_length: TICTACTOE_WIN_LENGTH,
      cells,
      current_player: status === "playing" ? (currentPlayer || "X") : currentPlayer,
      move_count: moveCount,
      winner,
      status,
      last_move: normalizedLastMove,
      winning_cells: winningCells,
    } satisfies TicTacToeResourceData,
  };
}

export function validateTictactoeResource(
  payload: Record<string, unknown>
): ViewResourceBinding | ViewOperationFailure {
  if (Object.keys(payload).length === 0) {
    return cloneTictactoeResource(TICTACTOE_DEFAULT_RESOURCE);
  }

  const resourceType = typeof payload.resource_type === "string" && payload.resource_type.trim()
    ? payload.resource_type.trim()
    : "tictactoe.game";
  if (resourceType !== "tictactoe.game") {
    return buildOperationError(
      "invalid_view_resource",
      "tictactoe.main requires resource.resource_type to be 'tictactoe.game'"
    );
  }

  const rawData = payload.data;
  if (rawData !== undefined && (!rawData || typeof rawData !== "object" || Array.isArray(rawData))) {
    return buildOperationError(
      "invalid_view_resource",
      "tictactoe.main requires resource.data to be an object"
    );
  }

  return normalizeTictactoeResource(payload);
}

export function openTictactoeMainView(payload: Record<string, unknown>): ViewOpenSuccess | ViewOperationFailure {
  const input = toRecord(payload);
  const normalizedResource = validateTictactoeResource(toRecord(input.resource));
  if (isViewOperationFailure(normalizedResource)) {
    return normalizedResource;
  }
  const initialAnchor = typeof input.initial_anchor === "string" ? input.initial_anchor.trim() : "";
  return {
    resource: normalizedResource,
    activeAnchor: initialAnchor || "tictactoe.board",
    data: {
      status: "applied",
      resource_id: normalizedResource.resource_id || "",
    },
  };
}

export const tictactoeMainPersistence: ViewPersistenceConfig = {
  version: 1,
  debounce_ms: 120,
  getResourceKey: (resource) => {
    if (typeof resource.resource_id === "string" && resource.resource_id.trim()) {
      return resource.resource_id.trim();
    }
    return "tictactoe:neon-grid";
  },
  serialize: (snapshot: ViewPersistenceStateSnapshot) => ({
    resource: cloneTictactoeResource(snapshot.resource),
    active_anchor: snapshot.activeAnchor || "",
  }),
  deserialize: (payload) => {
    const rawResource = payload.resource && typeof payload.resource === "object" && !Array.isArray(payload.resource)
      ? payload.resource as Record<string, unknown>
      : {};
    return {
      resource: normalizeTictactoeResource(rawResource),
      activeAnchor: typeof payload.active_anchor === "string" ? payload.active_anchor.trim() : "",
    };
  },
};

export const tictactoeMainView = defineView({
  view_id: "tictactoe.main",
  resource_type: "tictactoe.game",
  title: "TicTacToe Arena",
  component: TictactoeMainView,
  state_mode: "stateful",
  default_resource: TICTACTOE_DEFAULT_RESOURCE,
  anchors: [
    { id: "tictactoe.header", title: "Header", description: "Game title and current round status." },
    { id: "tictactoe.board", title: "Board", description: "The 5x5 board area." },
    { id: "tictactoe.panel", title: "Panel", description: "Rules, hints, and control panel." },
  ],
  capabilities: [
    {
      id: "game.place_mark",
      mode: "write",
      title: "Place Mark",
      description: "Place a mark in the target cell and update local round state.",
      assistant_hint: "This is the primary interaction capability. Passing a cell index mutates the board and emits runtime events.",
      input_schema: {
        type: "object",
        properties: {
          index: { type: "number", minimum: 0, maximum: TICTACTOE_BOARD_SIZE * TICTACTOE_BOARD_SIZE - 1 },
        },
        required: ["index"],
      },
      affected_anchors: ["tictactoe.board", "tictactoe.panel"],
      error_codes: [
        "invalid_view_capability_input",
        "cell_already_filled",
        "round_finished",
      ],
    },
    {
      id: "game.reset",
      mode: "write",
      title: "Reset Board",
      description: "Reset the current board and start a new round.",
      assistant_hint: "Use this after a round finishes or when you want to re-validate the step + wait flow.",
      input_schema: {
        type: "object",
        properties: {},
      },
      affected_anchors: ["tictactoe.board", "tictactoe.panel"],
    },
  ],
  interaction_hints: {
    interaction_intent: "Best for validating the default wait-aware orchestration path across view.open, session.start, runtime events, event.wait, and session.wait_for_end.",
    recommended_mode: "session_start",
    decision_rule: "This is a wait-heavy scene. Default to session.start plus event.wait for round progression instead of relying on direct mutations.",
    wait_strategy: {
      preferred_tools: [
        "dawnchat.ui.event.wait",
        "dawnchat.ui.session.wait_for_end",
      ],
      rule: "Start event.wait while the user may act. Use session.wait_for_end as a follow-up lifecycle observer, not as a replacement for runtime event waiting.",
    },
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
              view_id: "tictactoe.main",
              resource: {},
              initial_anchor: "tictactoe.board",
            },
          },
        },
        then: {
          tool: "dawnchat.ui.capability.invoke",
          payload: {
            plugin_id: "<plugin_id>",
            function: "assistant.view.describe",
            input: {
              view_id: "tictactoe.main",
            },
          },
        },
      },
      {
        name: "session_narrate_then_wait_for_move",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "narrate-turn",
                action: {
                  type: "guide.narrate",
                  payload: {
                    text: "请先点击你想落子的格子。",
                  },
                },
              },
            ],
          },
        },
        then: {
          tool: "dawnchat.ui.event.wait",
          payload: {
            plugin_id: "<plugin_id>",
            event_types: ["assistant.game.tictactoe.cell_selected"],
            match: {
              resource_id: "<resource_id>",
            },
          },
        },
      },
      {
        name: "session_place_mark_then_wait_for_end",
        mode: "session_start",
        call: {
          tool: "dawnchat.ui.session.start",
          payload: {
            plugin_id: "<plugin_id>",
            steps: [
              {
                id: "place-mark",
                action: {
                  type: "view.capability.invoke",
                  payload: {
                    view_id: "tictactoe.main",
                    capability_id: "game.place_mark",
                    input: {
                      index: 6,
                    },
                  },
                },
              },
            ],
          },
        },
        then: {
          tool: "dawnchat.ui.session.wait_for_end",
          payload: {
            plugin_id: "<plugin_id>",
            session_id: "<session_id>",
          },
        },
      },
    ],
    key_events: [
      {
        type: "assistant.game.tictactoe.cell_selected",
        description: "Emitted after every legal move. Use it as the primary realtime match target for event.wait or internal flow.wait.",
        match_fields: ["move_index", "player", "game_status", "winner"],
      },
      {
        type: "assistant.game.tictactoe.round_finished",
        description: "Emitted when a 4-in-a-row win or draw is resolved. Use it to terminate the current round orchestration.",
        match_fields: ["game_status", "winner", "move_index"],
      },
    ],
  },
  persistence: tictactoeMainPersistence,
  open: openTictactoeMainView,
  normalizeResource: validateTictactoeResource,
  invokeCapability: invokeTictactoeMainCapability,
  getStateSummary: buildTictactoeMainStateSummary,
});
