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
const moveCount = computed(() => Number(currentResource.value?.data.move_count) || 0);
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
const lastMoveLabel = computed(() => {
  const lastMove = currentResource.value?.data.last_move;
  if (!lastMove || typeof lastMove !== "object" || Array.isArray(lastMove)) {
    return "等待首手落子";
  }
  const row = Number((lastMove as Record<string, unknown>).row);
  const col = Number((lastMove as Record<string, unknown>).col);
  const player = String((lastMove as Record<string, unknown>).player || "");
  return `${player} @ ${row + 1}, ${col + 1}`;
});
const statusTitle = computed(() => {
  if (status.value === "won") {
    return `${winner.value || "X"} wins the round`;
  }
  if (status.value === "draw") {
    return "Draw after full board";
  }
  return `Player ${currentPlayer.value || "X"} to move`;
});
const statusHint = computed(() => {
  if (status.value === "won") {
    return "本地规则已判定胜负，可继续观察 event/wait 链路或直接重置。";
  }
  if (status.value === "draw") {
    return "棋盘已满，view 本地完成平局判定。";
  }
  return "每次点击会先本地落子，再发出实时 runtime event。";
});
const capabilityTitles = computed(() => activeManifest.value?.capabilities.map((item) => item.title) || []);
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
      <header
        class="hero-panel"
        :data-anchor="activeAnchor === 'tictactoe.header' ? 'active' : 'inactive'"
      >
        <div class="hero-copy">
          <span class="hero-chip">Stateful Neon Scene</span>
          <h2>{{ currentResource!.title || "TicTacToe Arena" }}</h2>
          <p class="hero-title">{{ statusTitle }}</p>
          <p class="hero-hint">{{ statusHint }}</p>
        </div>
        <div class="hero-stats">
          <div class="stat-card">
            <span>Board</span>
            <strong>{{ boardSize }}x{{ boardSize }}</strong>
          </div>
          <div class="stat-card">
            <span>Win</span>
            <strong>{{ TICTACTOE_WIN_LENGTH }} 连</strong>
          </div>
          <div class="stat-card">
            <span>Moves</span>
            <strong>{{ moveCount }}</strong>
          </div>
        </div>
      </header>

      <div class="content-grid">
        <section
          class="board-shell"
          :data-anchor="activeAnchor === 'tictactoe.board' ? 'active' : 'inactive'"
        >
          <div class="board-shell__head">
            <div>
              <strong>Realtime Board</strong>
              <p>点击格子，验证本地状态更新与 runtime event 同步发出。</p>
            </div>
            <button type="button" class="reset-btn" @click="resetBoard">
              Reset Round
            </button>
          </div>
          <div class="board-grid" :style="{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }">
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

        <aside
          class="side-panel"
          :data-anchor="activeAnchor === 'tictactoe.panel' ? 'active' : 'inactive'"
        >
          <section class="info-card">
            <div class="section-head">
              <strong>Round State</strong>
              <span>{{ status }}</span>
            </div>
            <dl class="kv-list">
              <div>
                <dt>Current</dt>
                <dd>{{ currentPlayer || "None" }}</dd>
              </div>
              <div>
                <dt>Winner</dt>
                <dd>{{ winner || "TBD" }}</dd>
              </div>
              <div>
                <dt>Last Move</dt>
                <dd>{{ lastMoveLabel }}</dd>
              </div>
            </dl>
          </section>

          <section class="info-card">
            <div class="section-head">
              <strong>Capabilities</strong>
              <span>{{ capabilityTitles.length }}</span>
            </div>
            <div class="capability-list">
              <span v-for="title in capabilityTitles" :key="title">{{ title }}</span>
            </div>
          </section>
        </aside>
      </div>
    </div>

    <div v-else class="idle-state">
      <p class="idle-state__title">TicTacToe Arena</p>
      <p class="idle-state__hint">
        Waiting for <code>view.open</code> with an active <code>tictactoe.game</code> resource.
      </p>
    </div>
  </section>
</template>
