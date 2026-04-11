<script setup lang="ts">
import { computed } from "vue";
import "./tictactoeMain.css";

import { type ViewCapabilityResult, type ViewResourceBinding } from "../../../runtime/view/manifest";
import { useViewState } from "../../../runtime/view/state";
import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../../runtime/events";
import { emitAssistantRuntimeEvent } from "../../../runtime/runtimeEventBridge";
import {
  buildTictactoeMainStateSummary,
  invokeTictactoeMainCapability,
} from "./tictactoeMain.capabilities";
import {
  TICTACTOE_BOARD_SIZE,
  TICTACTOE_WIN_LENGTH,
} from "./tictactoeMain.view";

const { activeViewId, activeAnchor, activeManifest, currentResource, setActiveViewState } = useViewState();

const isActiveTictactoeView = computed(() => activeViewId.value === "tictactoe.main");
const boardSize = computed(() => Number(currentResource.value?.data.board_size) || TICTACTOE_BOARD_SIZE);
const currentPlayer = computed(() => String(currentResource.value?.data.current_player || ""));
const status = computed(() => String(currentResource.value?.data.status || "playing"));
const winner = computed(() => String(currentResource.value?.data.winner || ""));
const winningCells = computed(() => {
  const cells = currentResource.value?.data.winning_cells;
  return Array.isArray(cells) ? cells.map((value) => Number(value)).filter(Number.isInteger) : [];
});
const boardCells = computed(() => {
  const cells = currentResource.value?.data.cells;
  const total = boardSize.value * boardSize.value;
  if (!Array.isArray(cells)) {
    return Array.from({ length: total }, (_, index) => ({
      index,
      value: "",
      row: Math.floor(index / boardSize.value),
      col: index % boardSize.value,
      isWinning: false,
    }));
  }
  return Array.from({ length: total }, (_, index) => ({
    index,
    value: cells[index] === "X" || cells[index] === "O" ? String(cells[index]) : "",
    row: Math.floor(index / boardSize.value),
    col: index % boardSize.value,
    isWinning: winningCells.value.includes(index),
  }));
});
const statusTitle = computed(() => {
  if (status.value === "won") {
    return `${winner.value || "X"} 获胜`;
  }
  if (status.value === "draw") {
    return "平局";
  }
  return `轮到 ${currentPlayer.value || "X"}`;
});
const isBoardReady = computed(
  () => isActiveTictactoeView.value && Boolean(currentResource.value) && Boolean(activeManifest.value)
);

function applyLocalCapabilityResult(
  result: ViewCapabilityResult,
  fallbackResource: ViewResourceBinding
): ViewCapabilityResult {
  if ("ok" in result && result.ok === false) {
    return result;
  }
  const currentManifest = activeManifest.value;
  if (!currentManifest) {
    return result;
  }
  const nextResource = result.resource || fallbackResource;
  const nextAnchor = result.activeAnchor || "tictactoe.board";
  setActiveViewState({
    viewId: "tictactoe.main",
    activeAnchor: nextAnchor,
    resource: nextResource,
    manifest: {
      ...currentManifest,
      state_summary: buildTictactoeMainStateSummary(nextResource, nextAnchor),
    },
  });
  return result;
}

function emitCellSelectedEvent(result: ViewCapabilityResult, resource: ViewResourceBinding) {
  if ("ok" in result && result.ok === false) {
    return;
  }
  const payload = {
    view_id: "tictactoe.main",
    resource_id: resource.resource_id || "",
    board_size: Number(resource.data.board_size) || TICTACTOE_BOARD_SIZE,
    win_length: Number(resource.data.win_length) || TICTACTOE_WIN_LENGTH,
    player: String(result.data?.player || ""),
    move_index: Number(result.data?.move_index),
    row: Number(result.data?.row),
    col: Number(result.data?.col),
    move_count: Number(result.data?.move_count || 0),
    game_status: String(result.data?.game_status || "playing"),
    winner: String(result.data?.winner || ""),
  };
  emitAssistantRuntimeEvent({
    type: ASSISTANT_RUNTIME_EVENT_TYPES.TICTACTOE_CELL_SELECTED,
    source: "view",
    payload,
  });
  if (result.data?.round_finished) {
    emitAssistantRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.TICTACTOE_ROUND_FINISHED,
      source: "view",
      payload: {
        ...payload,
        winning_cells: Array.isArray(result.data?.winning_cells) ? result.data?.winning_cells : [],
      },
    });
  }
}

function handleCellClick(index: number) {
  if (!isBoardReady.value || !currentResource.value) {
    return;
  }
  const baseResource = currentResource.value;
  const capabilityResult = invokeTictactoeMainCapability("game.place_mark", { index }, baseResource);
  if ("ok" in capabilityResult && capabilityResult.ok === false) {
    return;
  }
  const nextResult = applyLocalCapabilityResult(capabilityResult, baseResource);
  if ("ok" in nextResult && nextResult.ok === false) {
    return;
  }
  emitCellSelectedEvent(nextResult, nextResult.resource || baseResource);
}

function resetBoard() {
  if (!isBoardReady.value || !currentResource.value) {
    return;
  }
  const baseResource = currentResource.value;
  const capabilityResult = invokeTictactoeMainCapability("game.reset", {}, baseResource);
  applyLocalCapabilityResult(capabilityResult, baseResource);
}
</script>

<template>
  <section class="view-root" data-view-id="tictactoe.main">
    <div v-if="isBoardReady" class="arena">
      <section
        class="board-shell"
        :data-anchor="activeAnchor === 'tictactoe.board' ? 'active' : 'inactive'"
      >
        <div class="board-shell__head">
          <div class="board-shell__intro">
            <strong class="board-shell__title">井字棋</strong>
            <p class="board-shell__desc">
              点击格子轮流落子；本地状态会更新，并同步发出 runtime 事件。
            </p>
            <p class="board-shell__status" aria-live="polite">{{ statusTitle }}</p>
          </div>
          <button type="button" class="reset-btn" @click="resetBoard">
            重新开始
          </button>
        </div>
        <div
          class="board-grid"
          :style="{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }"
        >
          <button
            v-for="cell in boardCells"
            :key="cell.index"
            type="button"
            class="cell-btn"
            :class="[
              cell.value === 'X' ? 'cell-btn--x' : '',
              cell.value === 'O' ? 'cell-btn--o' : '',
              cell.isWinning ? 'cell-btn--winning' : '',
            ]"
            :data-cell-index="cell.index"
            :disabled="Boolean(cell.value) || status !== 'playing'"
            @click="handleCellClick(cell.index)"
          >
            <span>{{ cell.value || '·' }}</span>
          </button>
        </div>
      </section>
    </div>

    <div v-else class="idle-state">
      <p class="idle-state__title">TicTacToe Arena</p>
      <p class="idle-state__hint">
        Waiting for <code>view.open</code> with an active <code>tictactoe.game</code> resource.
      </p>
    </div>
  </section>
</template>
