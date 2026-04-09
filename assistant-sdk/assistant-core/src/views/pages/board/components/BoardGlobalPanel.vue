<script setup lang="ts">
import type { BoardNode, BoardStyleSettings } from "../model/types";

defineProps<{
  activeAnchor: string;
  capabilityTitles: string[];
  edgeCount: number;
  isMutating: boolean;
  nodes: BoardNode[];
  pinnedCount: number;
  focusedNodeId: string;
  theme: string;
  styleSettings: BoardStyleSettings;
  debugEnabled: boolean;
}>();

const emit = defineEmits<{
  focusNode: [nodeId: string];
  toggleTheme: [];
  toggleDebug: [];
  updateStyleSettings: [patch: Partial<BoardStyleSettings>];
}>();

function updateLayoutDirection(value: string) {
  emit("updateStyleSettings", { layout_direction: value === "TB" ? "TB" : "LR" });
}

function updateLayoutAlgorithm(value: string) {
  const layout_algorithm: BoardStyleSettings["layout_algorithm"] = value === "layered" || value === "mindmap"
    ? value
    : "stress";
  emit("updateStyleSettings", { layout_algorithm });
}

function updateEdgeStyle(value: string) {
  const edge_style = value === "smoothstep" || value === "straight" ? value : "bezier";
  emit("updateStyleSettings", { edge_style });
}

function updateEdgeCurvature(value: string) {
  const raw = Number(value);
  const edge_curvature = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.5;
  emit("updateStyleSettings", { edge_curvature });
}

function updateHandlesMode(value: string) {
  const handles_mode: BoardStyleSettings["handles_mode"] = value === "four-sides" || value === "eight-points"
    ? value
    : "left-right";
  emit("updateStyleSettings", { handles_mode });
}

function updateAvoidOverlapStrength(value: string) {
  const avoid_overlap_strength = value === "low" || value === "high" ? value : "medium";
  emit("updateStyleSettings", { avoid_overlap_strength });
}

function updateAutoLayoutOnAdd(value: boolean) {
  emit("updateStyleSettings", { auto_layout_on_add: value });
}
</script>

<template>
  <aside class="board-global-panel" :data-anchor="activeAnchor === 'board.global' ? 'active' : 'inactive'" @click.stop>
    <header class="board-global-panel__top">
      <strong>Global</strong>
      <button type="button" class="theme-toggle-btn" @click="$emit('toggleTheme')" title="Toggle Theme">
        <svg v-if="theme === 'dark'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
      </button>
    </header>

    <div class="panel-content">
      <section class="info-section">
        <div class="scene-stats">
          <span>Nodes {{ nodes.length }}</span>
          <span>Edges {{ edgeCount }}</span>
          <span>Pinned {{ pinnedCount }}</span>
        </div>
      </section>

      <section class="info-section flex-fill">
        <div class="section-head">
          <strong>Node Index</strong>
          <span>{{ nodes.length }}</span>
        </div>
        <div class="node-list">
          <button
            v-for="node in nodes"
            :key="node.id"
            type="button"
            class="node-list__item"
            :class="{ 'node-list__item--active': node.id === focusedNodeId }"
            :disabled="isMutating"
            @click="$emit('focusNode', node.id)"
          >
            <strong>{{ node.title }}</strong>
            <span>{{ node.media_type }} · {{ node.semantic_type }}</span>
          </button>
        </div>
      </section>

      <section class="info-section">
        <div class="section-head">
          <strong>Board Style & Layout</strong>
        </div>
        <div class="style-settings-grid">
          <label class="field">
            <span>Layout Algorithm</span>
            <select
              class="field-control"
              :value="styleSettings.layout_algorithm"
              @change="updateLayoutAlgorithm(($event.target as HTMLSelectElement).value)"
            >
              <option value="stress">Stress</option>
              <option value="layered">Layered</option>
              <option value="mindmap">MindMap</option>
            </select>
          </label>
          <label class="field">
            <span>Layout Direction</span>
            <select
              class="field-control"
              :value="styleSettings.layout_direction"
              @change="updateLayoutDirection(($event.target as HTMLSelectElement).value)"
            >
              <option value="LR">LR</option>
              <option value="TB">TB</option>
            </select>
          </label>
          <label class="field">
            <span>Edge Style</span>
            <select
              class="field-control"
              :value="styleSettings.edge_style"
              @change="updateEdgeStyle(($event.target as HTMLSelectElement).value)"
            >
              <option value="bezier">Bezier</option>
              <option value="smoothstep">Smoothstep</option>
              <option value="straight">Straight</option>
            </select>
          </label>
          <label class="field field--wide">
            <span>Edge Curvature ({{ styleSettings.edge_curvature.toFixed(2) }})</span>
            <input
              class="field-control"
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="styleSettings.edge_curvature"
              @input="updateEdgeCurvature(($event.target as HTMLInputElement).value)"
            >
          </label>
          <label class="field">
            <span>Handles Mode</span>
            <select
              class="field-control"
              :value="styleSettings.handles_mode"
              @change="updateHandlesMode(($event.target as HTMLSelectElement).value)"
            >
              <option value="left-right">Left-Right</option>
              <option value="four-sides">Four-Sides</option>
              <option value="eight-points">Eight-Points</option>
            </select>
          </label>
          <label class="field">
            <span>Avoid Overlap</span>
            <select
              class="field-control"
              :value="styleSettings.avoid_overlap_strength"
              @change="updateAvoidOverlapStrength(($event.target as HTMLSelectElement).value)"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label class="field field--toggle">
            <span>Auto Layout On Node Add</span>
            <input
              type="checkbox"
              :checked="styleSettings.auto_layout_on_add"
              @change="updateAutoLayoutOnAdd(($event.target as HTMLInputElement).checked)"
            >
          </label>
        </div>
      </section>

      <section class="info-section">
        <div class="section-head">
          <strong>Debug</strong>
        </div>
        <label class="field field--toggle">
          <span>Board Debug Logs</span>
          <input
            type="checkbox"
            :checked="debugEnabled"
            @change="$emit('toggleDebug')"
          >
        </label>
      </section>

      <section class="info-section">
        <div class="section-head">
          <strong>Capabilities</strong>
          <span>{{ capabilityTitles.length }}</span>
        </div>
        <div class="capability-list">
          <span v-for="title in capabilityTitles" :key="title">{{ title }}</span>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.board-global-panel {
  position: absolute;
  top: 60px; /* Below toolbar */
  left: 12px;
  bottom: 12px;
  width: min(320px, calc(100vw - 24px));
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--board-border);
  background: var(--board-panel-bg);
  backdrop-filter: blur(12px);
  box-shadow: var(--board-panel-shadow);
  color: var(--board-text-primary);
  pointer-events: auto;
  transition: transform 200ms ease, opacity 200ms ease;
}

.board-global-panel[data-anchor="active"] {
  box-shadow:
    var(--board-panel-shadow),
    0 0 0 1px var(--board-accent);
}

.board-global-panel__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 12px;
  border-bottom: 1px solid var(--board-border);
}

.board-global-panel__top strong {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--board-text-primary);
}

.theme-toggle-btn {
  background: transparent;
  border: none;
  color: var(--board-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  transition: background 150ms ease, color 150ms ease;
}

.theme-toggle-btn:hover {
  background: var(--board-surface-subtle);
  color: var(--board-text-primary);
}

.icon {
  width: 16px;
  height: 16px;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  flex: 1;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.flex-fill {
  flex: 1;
  min-height: 0;
}

.scene-stats {
  display: flex;
  gap: 8px;
}

.scene-stats span {
  font-size: 0.75rem;
  color: var(--board-text-secondary);
  background: var(--board-surface-subtle);
  padding: 4px 8px;
  border-radius: 6px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-head strong {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--board-text-primary);
}

.section-head span {
  font-size: 0.75rem;
  color: var(--board-text-secondary);
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
  min-height: 100px;
}

.node-list__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--board-text-primary);
  text-align: left;
  cursor: pointer;
  transition: all 150ms ease;
}

.node-list__item:hover:not(:disabled) {
  background: var(--board-surface);
  border-color: var(--board-border);
}

.node-list__item--active {
  background: var(--board-accent-soft);
  color: var(--board-accent);
}

.node-list__item strong {
  font-size: 0.85rem;
  font-weight: 500;
  color: inherit;
}

.node-list__item span {
  font-size: 0.75rem;
  color: var(--board-text-secondary);
}

.capability-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.capability-list span {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--board-surface-subtle);
  font-size: 0.72rem;
  color: var(--board-text-secondary);
}

.style-settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  font-size: 0.72rem;
  color: var(--board-text-secondary);
}

.field-control {
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--board-border);
  background: var(--board-surface-subtle);
  color: var(--board-text-primary);
  padding: 0 8px;
  font-size: 0.75rem;
}

.field--wide {
  grid-column: 1 / -1;
}

.field--toggle {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background: var(--board-surface-subtle);
  border-radius: 8px;
  border: 1px solid var(--board-border);
  padding: 8px;
}
</style>
