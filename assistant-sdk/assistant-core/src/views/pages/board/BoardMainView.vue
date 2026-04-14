<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";
import { VueFlow } from "@vue-flow/core";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/minimap/dist/style.css";

import BoardInspector from "./components/BoardInspector.vue";
import BoardToolbar from "./components/BoardToolbar.vue";
import BoardGlobalPanel from "./components/BoardGlobalPanel.vue";
import { useBoardScene } from "./composables/useBoardScene";

const {
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
} = useBoardScene();

const inspectorOpen = ref(false);
const globalPanelOpen = ref(false);
const canvasHostRef = ref<HTMLElement | null>(null);
const flowReady = ref(false);
const currentTheme = ref('dark'); // 'dark' | 'light'

let vueFlowInstance: any = null;

function toggleTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark';
}

function onPaneReady(instance: any) {
  vueFlowInstance = instance;
  // Initialize fitView if needed
}

let resizeObserver: ResizeObserver | null = null;
let rafId = 0;

function recomputeFlowReady() {
  const el = canvasHostRef.value;
  if (!el) {
    flowReady.value = false;
    return;
  }
  const rect = el.getBoundingClientRect();
  flowReady.value = rect.width >= 240 && rect.height >= 180;
}

function scheduleFlowReadyCheck() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  rafId = requestAnimationFrame(() => {
    rafId = requestAnimationFrame(() => {
      recomputeFlowReady();
      rafId = 0;
    });
  });
}

onMounted(async () => {
  await nextTick();
  scheduleFlowReadyCheck();
  if (canvasHostRef.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      recomputeFlowReady();
    });
    resizeObserver.observe(canvasHostRef.value);
  }
  window.addEventListener("resize", scheduleFlowReadyCheck);
});

watch(
  () => isBoardActive.value,
  (active) => {
    if (active) {
      scheduleFlowReadyCheck();
    } else {
      flowReady.value = false;
      inspectorOpen.value = false;
      globalPanelOpen.value = false;
    }
  }
);

watch(
  () => boardData.value,
  () => {
    scheduleFlowReadyCheck();
  },
  { deep: true }
);

watch(
  () => activeAnchor.value,
  (newAnchor) => {
    scheduleFlowReadyCheck();
    if (newAnchor === "board.inspector") {
      inspectorOpen.value = true;
      globalPanelOpen.value = false;
    } else if (newAnchor === "board.global") {
      globalPanelOpen.value = true;
      inspectorOpen.value = false;
    }
  }
);

onUnmounted(() => {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  resizeObserver = null;
  window.removeEventListener("resize", scheduleFlowReadyCheck);
});


function toggleGlobalPanel() {
  if (globalPanelOpen.value) {
    closeGlobalPanel();
  } else {
    globalPanelOpen.value = true;
    inspectorOpen.value = false;
    activeAnchor.value = "board.global";
  }
}

function closeGlobalPanel() {
  globalPanelOpen.value = false;
  if (activeAnchor.value === "board.global") {
    activeAnchor.value = "board.canvas";
  }
}

function handleArrangeLayout() {
  arrangeLayout().then(() => {
    if (vueFlowInstance) {
      setTimeout(() => {
        vueFlowInstance.fitView({ padding: 0.1, duration: 600 });
      }, 50);
    }
  });
}

function closeInspector() {
  inspectorOpen.value = false;
  if (activeAnchor.value === "board.inspector") {
    activeAnchor.value = "board.canvas";
  }
}

function toggleInspector() {
  if (inspectorOpen.value) {
    closeInspector();
  } else {
    inspectorOpen.value = true;
    globalPanelOpen.value = false;
    activeAnchor.value = "board.inspector";
  }
}

function handlePaneClick() {
  // Deselect node and close inspector
  if (selectedNode.value) {
    focusNode(""); // Call focusNode with empty id to deselect
  }
  closeInspector();
  closeGlobalPanel();
}
</script>

<template>
  <section class="board-root" data-view-id="board.main" :data-board-theme="currentTheme">
    <div v-if="isBoardActive" class="board-shell">
      <section
        ref="canvasHostRef"
        class="board-canvas"
        :data-anchor="activeAnchor === 'board.canvas' ? 'active' : 'inactive'"
      >
        <VueFlow
          v-if="flowReady"
          :nodes="flowNodes"
          :edges="flowEdges"
          :node-types="nodeTypes"
          :fit-view-on-init="true"
          :min-zoom="0.25"
          :max-zoom="1.8"
          class="board-flow"
          @pane-ready="onPaneReady"
          @node-click="handleNodeClick"
          @node-drag-stop="handleNodeDragStop"
          @connect="handleConnect"
          @connect-start="handleConnectStart"
          @connect-end="handleConnectEnd"
          @nodes-change="handleNodesChange"
          @edges-change="handleEdgesChange"
          @pane-click="handlePaneClick"
        >
          <Background :gap="24" :size="1" pattern-color="rgba(148, 163, 184, 0.14)" />
          <MiniMap position="bottom-right" pannable zoomable />
        </VueFlow>
        <div v-else class="board-canvas__boot">Initializing canvas...</div>
      </section>

      <div class="board-overlay-top">
        <BoardToolbar
          :is-mutating="isMutating"
          :global-panel-open="globalPanelOpen"
          @add-note="addQuickNote"
          @arrange-layout="handleArrangeLayout"
          @toggle-global-panel="toggleGlobalPanel"
        />
      </div>

      <div class="board-overlay-left" :class="{ 'board-overlay-left--open': globalPanelOpen }">
        <BoardGlobalPanel
          :active-anchor="activeAnchor"
          :capability-titles="capabilityTitles"
          :edge-count="edges.length"
          :is-mutating="isMutating"
          :nodes="nodes"
          :pinned-count="pinnedCount"
          :focused-node-id="selection.focused_node_id"
          :style-settings="boardStyleSettings"
          :debug-enabled="debugEnabled"
          :theme="currentTheme"
          @focus-node="focusNode"
          @update-style-settings="updateStyleSettings"
          @toggle-debug="toggleBoardDebug"
          @toggle-theme="toggleTheme"
        />
      </div>

      <div class="board-overlay-right" :class="{ 'board-overlay-right--open': inspectorOpen }">
        <BoardInspector
          :active-anchor="activeAnchor"
          :is-mutating="isMutating"
          :selected-node="selectedNode"
          @close="closeInspector"
          @toggle-pin-node="togglePinNode"
        />
      </div>

      <div v-if="!boardData" class="board-recovering">
        <p class="board-recovering__title">Recovering board workspace...</p>
        <p class="board-recovering__hint">
          Cached data is being normalized. If this message persists, re-open the board once.
        </p>
      </div>
    </div>

    <div v-else class="idle-state">
      <p class="idle-state__title">Holographic Clue Wall</p>
      <p class="idle-state__hint">
        Waiting for the top-level <code>view.open</code> capability with an active <code>board.workspace</code> resource.
      </p>
    </div>
  </section>
</template>

<style scoped>
.board-root[data-board-theme="dark"] {
  --board-canvas-base: #0b0f14;
  --board-canvas-grid-major: rgba(148, 163, 184, 0.14);
  --board-canvas-grid-minor: rgba(148, 163, 184, 0.07);
  --board-surface: rgba(15, 23, 42, 0.56);
  --board-surface-subtle: rgba(30, 41, 59, 0.4);
  --board-panel-bg: rgba(15, 23, 42, 0.92);
  --board-border: rgba(148, 163, 184, 0.22);
  --board-text-primary: #e5e7eb;
  --board-text-secondary: #9ca3af;
  --board-accent: #38bdf8;
  --board-accent-soft: rgba(56, 189, 248, 0.22);
  --board-node-bg: rgba(15, 23, 42, 0.9);
  --board-node-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
  --board-edge-default: rgba(148, 163, 184, 0.45);
  --board-edge-active: #22d3ee;
  --board-pin-border: rgba(250, 204, 21, 0.48);
  --board-pin-soft: rgba(250, 204, 21, 0.16);
  --board-pin-text: #facc15;
  --board-toolbar-shadow: 0 10px 28px rgba(2, 6, 23, 0.28);
  --board-panel-shadow: 0 18px 42px rgba(2, 6, 23, 0.34);

  /* Note Node Styles */
  --board-text-node-bg: linear-gradient(135deg, rgba(254, 243, 199, 0.15), rgba(252, 211, 77, 0.05));
  --board-text-node-color: var(--board-text-primary);
  --board-text-node-border: rgba(252, 211, 77, 0.2);
}

.board-root[data-board-theme="light"] {
  --board-canvas-base: #f9fafb;
  --board-canvas-grid-major: rgba(15, 23, 42, 0.14);
  --board-canvas-grid-minor: rgba(15, 23, 42, 0.07);
  --board-surface: rgba(255, 255, 255, 0.85);
  --board-surface-subtle: rgba(243, 244, 246, 0.85);
  --board-panel-bg: rgba(255, 255, 255, 0.95);
  --board-border: rgba(15, 23, 42, 0.12);
  --board-text-primary: #111827;
  --board-text-secondary: #4b5563;
  --board-accent: #0284c7;
  --board-accent-soft: rgba(2, 132, 199, 0.15);
  --board-node-bg: rgba(255, 255, 255, 0.95);
  --board-node-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  --board-edge-default: rgba(15, 23, 42, 0.25);
  --board-edge-active: #0284c7;
  --board-pin-border: rgba(202, 138, 4, 0.48);
  --board-pin-soft: rgba(202, 138, 4, 0.16);
  --board-pin-text: #ca8a04;
  --board-toolbar-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  --board-panel-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);

  /* Note Node Styles */
  --board-text-node-bg: linear-gradient(135deg, rgba(255, 251, 235, 0.95), rgba(254, 243, 199, 0.85));
  --board-text-node-color: #1F2937;
  --board-text-node-border: rgba(252, 211, 77, 0.4);
}

.board-root {
  width: 100%;
  max-width: 100%;
  /* 列向 flex 子项默认 min-width:auto，宽画布（Vue Flow）会抬高最小宽度，导致在 iframe/分栏内无法铺满 */
  min-width: 0;
  /* 嵌套在分栏 / iframe / flex 宿主内时用父级高度，避免 100dvh 按顶层视口计量导致右侧工作区撑不满或溢出 */
  height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.board-root[data-board-theme="light"] {
  --board-canvas-base: #e5e7eb;
  --board-canvas-grid-major: rgba(100, 116, 139, 0.24);
  --board-canvas-grid-minor: rgba(100, 116, 139, 0.12);
  --board-surface: rgba(255, 255, 255, 0.82);
  --board-surface-subtle: rgba(255, 255, 255, 0.62);
  --board-panel-bg: rgba(255, 255, 255, 0.94);
  --board-border: rgba(100, 116, 139, 0.28);
  --board-text-primary: #0f172a;
  --board-text-secondary: #475569;
  --board-accent: #0284c7;
  --board-accent-soft: rgba(2, 132, 199, 0.2);
  --board-node-bg: rgba(255, 255, 255, 0.96);
  --board-node-shadow: 0 6px 18px rgba(15, 23, 42, 0.14);
  --board-edge-default: rgba(100, 116, 139, 0.48);
  --board-edge-active: #0369a1;
  --board-pin-border: rgba(180, 83, 9, 0.45);
  --board-pin-soft: rgba(180, 83, 9, 0.14);
  --board-pin-text: #92400e;
  --board-toolbar-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
  --board-panel-shadow: 0 14px 34px rgba(15, 23, 42, 0.2);
}

.board-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  background: var(--board-canvas-base);
}

.board-canvas {
  position: absolute;
  inset: 0;
  border: 1px solid var(--board-border);
}

.board-canvas[data-anchor="active"] {
  box-shadow: inset 0 0 0 1px var(--board-accent-soft);
}

.board-flow {
  width: 100%;
  height: 100%;
}

.board-canvas__boot {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--board-text-secondary);
  font-size: 0.82rem;
}

.board-overlay-top {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 20;
}

.board-overlay-left {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 340px;
  z-index: 30;
  pointer-events: none;
}

.board-overlay-left--open {
  pointer-events: none; /* Keep none so clicks on empty parts pass through, panel children enable it */
}

.board-overlay-left :deep(.board-global-panel) {
  transform: translateX(calc(-100% - 20px));
  opacity: 0;
  pointer-events: auto; /* Enable for the panel itself */
}

.board-overlay-left--open :deep(.board-global-panel) {
  transform: translateX(0);
  opacity: 1;
}

.board-overlay-right {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 340px;
  z-index: 30;
  pointer-events: none;
}

.board-overlay-right--open {
  pointer-events: none;
}

.board-overlay-right :deep(.board-inspector) {
  transform: translateX(calc(100% + 20px));
  opacity: 0;
  pointer-events: auto; /* Enable for the panel itself */
}

.board-overlay-right--open :deep(.board-inspector) {
  transform: translateX(0);
  opacity: 1;
}

.idle-state {
  position: relative;
  flex: 1 1 100%;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
  border: 1px solid var(--board-border);
  background: var(--board-canvas-base);
  text-align: center;
}

::deep(.vue-flow__minimap) {
  background: var(--board-surface-subtle);
  border: 1px solid var(--board-border);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

::deep(.vue-flow__minimap-mask) {
  fill: var(--board-canvas-base);
  opacity: 0.6;
}

::deep(.vue-flow__edge-path) {
  stroke: var(--board-edge-default);
  stroke-width: 1.6;
  opacity: 0.48;
  transition: stroke-width 120ms ease, opacity 120ms ease, stroke 120ms ease;
}

::deep(.vue-flow__edge-text) {
  fill: var(--board-text-secondary);
  font-size: 11px;
}

::deep(.vue-flow__edge-textbg) {
  fill: color-mix(in srgb, var(--board-panel-bg) 82%, transparent);
  stroke: var(--board-border);
  stroke-width: 1;
}

::deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  opacity: 0.9;
  stroke-width: 2.2;
}

::deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: var(--board-edge-active);
  opacity: 1;
  stroke-width: 2.6;
}

::deep(.board-edge--related .vue-flow__edge-path) {
  opacity: 0.8;
}

::deep(.board-edge--dimmed .vue-flow__edge-path) {
  opacity: 0.2;
}

::deep(.vue-flow__connection-path) {
  stroke: var(--board-edge-active);
  stroke-width: 2.1;
  opacity: 0.95;
}

::deep(.vue-flow__attribution) {
  display: none;
}

.idle-state__title {
  margin: 0 0 8px;
  font-size: 1.4rem;
  color: var(--board-text-primary);
}

.idle-state__hint {
  margin: 0;
  color: var(--board-text-secondary);
}
</style>