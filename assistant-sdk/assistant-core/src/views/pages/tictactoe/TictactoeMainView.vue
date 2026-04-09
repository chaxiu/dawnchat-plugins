<script setup lang="ts">
import { computed } from "vue";

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

<style scoped>
.view-root {
  width: 100%;
  min-height: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.arena {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 18px;
  grid-template-rows: auto minmax(0, 1fr);
}

.hero-panel,
.board-shell,
.side-panel,
.info-card,
.idle-state {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(17, 24, 39, 0.84)),
    radial-gradient(circle at top left, rgba(168, 85, 247, 0.22), transparent 42%);
  box-shadow:
    inset 0 1px 0 rgba(226, 232, 240, 0.12),
    0 20px 70px rgba(15, 23, 42, 0.35);
}

.hero-panel::after,
.board-shell::after,
.info-card::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(120deg, transparent, rgba(56, 189, 248, 0.08), transparent);
}

.hero-panel,
.board-shell,
.side-panel {
  padding: 18px;
}

.hero-panel[data-anchor="active"],
.board-shell[data-anchor="active"],
.side-panel[data-anchor="active"] {
  border-color: rgba(45, 212, 191, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(226, 232, 240, 0.12),
    0 0 0 1px rgba(45, 212, 191, 0.12),
    0 20px 70px rgba(15, 23, 42, 0.35);
}

.hero-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.hero-copy h2 {
  margin: 8px 0 6px;
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  color: #f8fafc;
}

.hero-title {
  margin: 0 0 6px;
  font-size: 1rem;
  font-weight: 700;
  color: #67e8f9;
}

.hero-hint {
  margin: 0;
  max-width: 46ch;
  color: #cbd5e1;
  line-height: 1.5;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(125, 211, 252, 0.28);
  background: rgba(12, 74, 110, 0.4);
  color: #a5f3fc;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  min-width: min(320px, 100%);
}

.stat-card {
  padding: 12px 14px;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.72);
}

.stat-card span {
  display: block;
  margin-bottom: 6px;
  color: #94a3b8;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stat-card strong {
  color: #f8fafc;
  font-size: 1.05rem;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 18px;
  min-height: 0;
  align-items: stretch;
}

.board-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.board-shell__head,
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.board-shell__head strong,
.section-head strong {
  color: #f8fafc;
}

.board-shell__head p,
.section-head span {
  margin: 6px 0 0;
  color: #94a3b8;
  font-size: 0.88rem;
}

.reset-btn {
  border: 1px solid rgba(103, 232, 249, 0.28);
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(8, 47, 73, 0.6);
  color: #a5f3fc;
  font-weight: 700;
  cursor: pointer;
}

.board-grid {
  display: grid;
  gap: 10px;
  width: min(100%, 62vh);
  max-width: 680px;
  margin: 0 auto;
}

.cell-btn {
  aspect-ratio: 1;
  border: 1px solid rgba(103, 232, 249, 0.18);
  border-radius: 20px;
  background:
    radial-gradient(circle at 30% 20%, rgba(56, 189, 248, 0.12), transparent 42%),
    rgba(15, 23, 42, 0.76);
  color: #334155;
  font-size: clamp(1.5rem, 4vw, 2.4rem);
  font-weight: 800;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}

.cell-btn:hover:enabled {
  transform: translateY(-1px) scale(1.01);
  border-color: rgba(103, 232, 249, 0.48);
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.14);
}

.cell-btn:disabled {
  cursor: default;
}

.cell-btn--x {
  color: #67e8f9;
}

.cell-btn--o {
  color: #f472b6;
}

.cell-btn--winning {
  border-color: rgba(250, 204, 21, 0.6);
  box-shadow: 0 0 26px rgba(250, 204, 21, 0.18);
}

.side-panel {
  display: grid;
  gap: 14px;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  min-height: 0;
  overflow: auto;
  align-content: start;
}

.info-card {
  padding: 16px;
}

.kv-list {
  margin: 14px 0 0;
  display: grid;
  gap: 12px;
}

.kv-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.kv-list dt {
  color: #94a3b8;
}

.kv-list dd {
  margin: 0;
  color: #e2e8f0;
  font-weight: 700;
}

.capability-list {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.capability-list span {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
  font-size: 0.84rem;
}

.idle-state {
  min-height: min(420px, 70vh);
  padding: 24px 16px;
  display: grid;
  place-content: center;
  gap: 10px;
  text-align: center;
}

.idle-state__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #f8fafc;
}

.idle-state__hint {
  margin: 0;
  color: #94a3b8;
  line-height: 1.55;
}

.idle-state code {
  padding: 0.12em 0.38em;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.8);
  color: #a5f3fc;
}

@media (max-width: 960px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    align-items: stretch;
  }

  .hero-stats {
    min-width: 0;
  }

  .board-grid {
    width: min(100%, 86vw);
  }

  .side-panel {
    overflow: visible;
  }
}
</style>
