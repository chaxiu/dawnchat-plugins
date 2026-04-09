import type { ViewCapabilityResult, ViewOperationFailure, ViewResourceBinding } from "../../../runtime/view";
import {
  cloneTictactoeResource,
  createDefaultTictactoeData,
  TICTACTOE_BOARD_SIZE,
  TICTACTOE_WIN_LENGTH,
  type TicTacToeLastMove,
  type TicTacToePlayer,
  type TicTacToeResourceData,
  type TicTacToeStatus,
  type TicTacToeWinner,
} from "./tictactoeMain.view";
import { buildOperationError } from "../../shared/viewUtils";

interface PlaceMarkOutcome {
  resource: ViewResourceBinding;
  player: TicTacToePlayer;
  moveIndex: number;
  row: number;
  col: number;
  moveCount: number;
  gameStatus: TicTacToeStatus;
  winner: TicTacToeWinner;
  roundFinished: boolean;
  winningCells: number[];
}

function readBoardSize(resource: ViewResourceBinding): number {
  const boardSize = Number(resource.data.board_size);
  return Number.isInteger(boardSize) && boardSize > 0 ? boardSize : TICTACTOE_BOARD_SIZE;
}

function readWinLength(resource: ViewResourceBinding): number {
  const winLength = Number(resource.data.win_length);
  return Number.isInteger(winLength) && winLength > 0 ? winLength : TICTACTOE_WIN_LENGTH;
}

function readCells(resource: ViewResourceBinding): string[] {
  const cells = Array.isArray(resource.data.cells) ? resource.data.cells : [];
  const boardSize = readBoardSize(resource);
  const normalized = cells
    .slice(0, boardSize * boardSize)
    .map((cell) => (cell === "X" || cell === "O" ? cell : ""));
  while (normalized.length < boardSize * boardSize) {
    normalized.push("");
  }
  return normalized;
}

function readWinner(resource: ViewResourceBinding): TicTacToeWinner {
  return resource.data.winner === "X" || resource.data.winner === "O" || resource.data.winner === "draw"
    ? resource.data.winner
    : "";
}

function readStatus(resource: ViewResourceBinding): TicTacToeStatus {
  return resource.data.status === "won" || resource.data.status === "draw" ? resource.data.status : "playing";
}

function readCurrentPlayer(resource: ViewResourceBinding): TicTacToePlayer {
  return resource.data.current_player === "O" ? "O" : "X";
}

function buildLastMove(index: number, player: TicTacToePlayer, boardSize: number): TicTacToeLastMove {
  return {
    index,
    row: Math.floor(index / boardSize),
    col: index % boardSize,
    player,
  };
}

function findWinningCells(
  cells: string[],
  boardSize: number,
  winLength: number,
  index: number,
  player: TicTacToePlayer
): number[] {
  const row = Math.floor(index / boardSize);
  const col = index % boardSize;
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [deltaRow, deltaCol] of directions) {
    const line: number[] = [index];

    let nextRow = row + deltaRow;
    let nextCol = col + deltaCol;
    while (
      nextRow >= 0
      && nextRow < boardSize
      && nextCol >= 0
      && nextCol < boardSize
      && cells[nextRow * boardSize + nextCol] === player
    ) {
      line.push(nextRow * boardSize + nextCol);
      nextRow += deltaRow;
      nextCol += deltaCol;
    }

    nextRow = row - deltaRow;
    nextCol = col - deltaCol;
    while (
      nextRow >= 0
      && nextRow < boardSize
      && nextCol >= 0
      && nextCol < boardSize
      && cells[nextRow * boardSize + nextCol] === player
    ) {
      line.unshift(nextRow * boardSize + nextCol);
      nextRow -= deltaRow;
      nextCol -= deltaCol;
    }

    if (line.length >= winLength) {
      return line.slice(0, winLength);
    }
  }

  return [];
}

function buildNextPlayer(player: TicTacToePlayer): TicTacToePlayer {
  return player === "X" ? "O" : "X";
}

export function placeTictactoeMark(
  resource: ViewResourceBinding,
  index: number
): PlaceMarkOutcome | ViewOperationFailure {
  const boardSize = readBoardSize(resource);
  const winLength = readWinLength(resource);
  const cells = readCells(resource);
  const player = readCurrentPlayer(resource);
  const status = readStatus(resource);
  const winner = readWinner(resource);
  const maxIndex = boardSize * boardSize - 1;

  if (!Number.isInteger(index) || index < 0 || index > maxIndex) {
    return buildOperationError(
      "invalid_view_capability_input",
      `game.place_mark requires input.index to be an integer between 0 and ${maxIndex}`
    );
  }
  if (status !== "playing" || winner) {
    return buildOperationError(
      "round_finished",
      "The current round is already finished"
    );
  }
  if (cells[index]) {
    return buildOperationError(
      "cell_already_filled",
      `Cell ${index} is already filled`
    );
  }

  const nextResource = cloneTictactoeResource(resource);
  const nextCells = [...cells];
  nextCells[index] = player;
  const moveCount = nextCells.filter((cell) => cell === "X" || cell === "O").length;
  const winningCells = findWinningCells(nextCells, boardSize, winLength, index, player);
  const isWon = winningCells.length > 0;
  const isDraw = !isWon && moveCount >= boardSize * boardSize;
  const gameStatus: TicTacToeStatus = isWon ? "won" : isDraw ? "draw" : "playing";
  const resolvedWinner: TicTacToeWinner = isWon ? player : isDraw ? "draw" : "";
  const lastMove = buildLastMove(index, player, boardSize);

  nextResource.data = {
    ...nextResource.data,
    board_size: boardSize,
    win_length: winLength,
    cells: nextCells,
    current_player: gameStatus === "playing" ? buildNextPlayer(player) : "",
    move_count: moveCount,
    winner: resolvedWinner,
    status: gameStatus,
    last_move: lastMove,
    winning_cells: winningCells,
  } satisfies TicTacToeResourceData;

  return {
    resource: nextResource,
    player,
    moveIndex: index,
    row: lastMove.row,
    col: lastMove.col,
    moveCount,
    gameStatus,
    winner: resolvedWinner,
    roundFinished: gameStatus !== "playing",
    winningCells,
  };
}

function resetTictactoeResource(resource: ViewResourceBinding): ViewResourceBinding {
  const nextResource = cloneTictactoeResource(resource);
  const defaults = createDefaultTictactoeData();
  nextResource.data = {
    ...nextResource.data,
    ...defaults,
  };
  return nextResource;
}

export function invokeTictactoeMainCapability(
  capabilityId: string,
  input: Record<string, unknown>,
  resource: ViewResourceBinding
): ViewCapabilityResult {
  if (capabilityId === "game.place_mark") {
    const outcome = placeTictactoeMark(resource, Number(input.index));
    if ("ok" in outcome && outcome.ok === false) {
      return outcome;
    }
    const placeOutcome = outcome as PlaceMarkOutcome;
    return {
      resource: placeOutcome.resource,
      activeAnchor: "tictactoe.board",
      data: {
        status: "applied",
        player: placeOutcome.player,
        move_index: placeOutcome.moveIndex,
        row: placeOutcome.row,
        col: placeOutcome.col,
        move_count: placeOutcome.moveCount,
        game_status: placeOutcome.gameStatus,
        winner: placeOutcome.winner,
        round_finished: placeOutcome.roundFinished,
        winning_cells: placeOutcome.winningCells,
      },
    };
  }

  if (capabilityId === "game.reset") {
    const nextResource = resetTictactoeResource(resource);
    return {
      resource: nextResource,
      activeAnchor: "tictactoe.board",
      data: {
        status: "applied",
        game_status: "playing",
        current_player: "X",
      },
    };
  }

  return buildOperationError(
    "view_capability_not_found",
    `View capability not found: ${capabilityId}`
  );
}

export function buildTictactoeMainStateSummary(resource: ViewResourceBinding, activeAnchor?: string) {
  const lastMove = resource.data.last_move && typeof resource.data.last_move === "object"
    ? resource.data.last_move as Record<string, unknown>
    : null;
  const moveIndex = lastMove && typeof lastMove.index === "number" ? lastMove.index : -1;
  return {
    resource_title: resource.title || "",
    status: readStatus(resource),
    current_player: typeof resource.data.current_player === "string" ? resource.data.current_player : "",
    winner: readWinner(resource),
    move_count: typeof resource.data.move_count === "number" ? resource.data.move_count : 0,
    last_move_index: moveIndex,
    active_anchor: activeAnchor || "",
  };
}
