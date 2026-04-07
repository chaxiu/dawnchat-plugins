<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position, type NodeProps } from "@vue-flow/core";
import { BOARD_HANDLE_CORNER_INSET_PX } from "../model/handles";

interface BoardCardNodeData {
  title: string;
  description: string;
  media_type: string;
  semantic_type: string;
  tags: string[];
  pinned: boolean;
  focused: boolean;
  incoming_count: number;
  outgoing_count: number;
  handles_mode: "left-right" | "four-sides" | "eight-points";
  is_connect_target: boolean;
  is_related: boolean;
  is_dimmed: boolean;
}

const props = defineProps<NodeProps<BoardCardNodeData>>();
const supportsVerticalHandles = computed(() => props.data.handles_mode !== "left-right");
const supportsCornerHandles = computed(() => props.data.handles_mode === "eight-points");
const cornerInsetStyle = `${BOARD_HANDLE_CORNER_INSET_PX}px`;

const iconPath = computed(() => {
  switch (props.data.media_type) {
    case 'image':
      return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
    case 'webpage':
      return 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-3.146-8.926m5.658 0a9.003 9.003 0 00-5.658-8.926M9 12a9 9 0 013.146-8.926m5.658 0A9.003 9.003 0 0012 3m0 18v-9';
    default: // text or others
      return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
  }
});
</script>

<template>
  <div
    class="board-card"
    :class="[
      `board-card--${data.media_type}`,
      data.focused ? 'board-card--focused' : '',
      data.pinned ? 'board-card--pinned' : '',
      data.is_connect_target ? 'board-card--connect-target' : '',
      data.is_related ? 'board-card--related' : '',
      data.is_dimmed ? 'board-card--dimmed' : '',
    ]"
    :data-board-node-id="id"
  >
    <Handle
      id="left"
      type="target"
      :position="Position.Left"
      class="board-card__handle board-card__handle--target"
      :data-board-target-node-id="id"
    />
    <Handle
      id="right"
      type="source"
      :position="Position.Right"
      class="board-card__handle board-card__handle--source"
      :data-board-source-node-id="id"
    />
    <Handle
      v-if="supportsVerticalHandles"
      id="top"
      type="target"
      :position="Position.Top"
      class="board-card__handle board-card__handle--target"
      :data-board-target-node-id="id"
    />
    <Handle
      v-if="supportsVerticalHandles"
      id="bottom"
      type="source"
      :position="Position.Bottom"
      class="board-card__handle board-card__handle--source"
      :data-board-source-node-id="id"
    />
    <Handle
      v-if="supportsCornerHandles"
      id="top-left"
      type="target"
      :position="Position.Top"
      class="board-card__handle board-card__handle--target board-card__handle--corner"
      :style="{ left: cornerInsetStyle }"
      :data-board-target-node-id="id"
    />
    <Handle
      v-if="supportsCornerHandles"
      id="top-right"
      type="source"
      :position="Position.Top"
      class="board-card__handle board-card__handle--source board-card__handle--corner"
      :style="{ left: `calc(100% - ${cornerInsetStyle})` }"
      :data-board-source-node-id="id"
    />
    <Handle
      v-if="supportsCornerHandles"
      id="bottom-left"
      type="target"
      :position="Position.Bottom"
      class="board-card__handle board-card__handle--target board-card__handle--corner"
      :style="{ left: cornerInsetStyle }"
      :data-board-target-node-id="id"
    />
    <Handle
      v-if="supportsCornerHandles"
      id="bottom-right"
      type="source"
      :position="Position.Bottom"
      class="board-card__handle board-card__handle--source board-card__handle--corner"
      :style="{ left: `calc(100% - ${cornerInsetStyle})` }"
      :data-board-source-node-id="id"
    />
    
    <div class="board-card__content">
      <div class="board-card__icon-wrapper" :title="data.media_type">
        <svg class="board-card__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPath"></path>
        </svg>
      </div>
      <div class="board-card__text">
        <strong class="board-card__title">{{ data.title }}</strong>
        <p v-if="data.description" class="board-card__description">{{ data.description }}</p>
        <div class="board-card__metrics">
          <span class="board-card__metric">In {{ data.incoming_count }}</span>
          <span class="board-card__metric">Out {{ data.outgoing_count }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="data.pinned" class="board-card__pin-indicator">
      <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.board-card {
  position: relative;
  min-width: 200px;
  max-width: 280px;
  border-radius: 12px;
  border: 1px solid var(--board-border);
  background: var(--board-node-bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  color: var(--board-text-primary);
  transition: box-shadow 150ms ease, border-color 150ms ease;
  overflow: hidden;
}

.board-card--dimmed {
  opacity: 0.45;
}

.board-card--related {
  opacity: 1;
}

/* Subtle pastel backgrounds for different media types */
.board-card--text {
  background: var(--board-text-node-bg, var(--board-node-bg));
  color: var(--board-text-node-color, var(--board-text-primary));
  border-color: var(--board-text-node-border, var(--board-border));
}

.board-card--image {
  background: var(--board-node-bg);
}

.board-card--webpage {
  background: var(--board-node-bg);
}

/* Hover effect */
.board-card:hover {
  border-color: var(--board-text-secondary);
}

/* Figma-blue Selection */
.board-card--focused {
  border-color: #0D99FF !important;
  box-shadow: 0 0 0 2px rgba(13, 153, 255, 0.3) !important;
}

.board-card--connect-target {
  border-color: var(--board-accent) !important;
  box-shadow: 0 0 0 2px var(--board-accent-soft);
}

.board-card__handle {
  width: 9px;
  height: 9px;
  border: 1.5px solid #9CA3AF;
  background: var(--board-canvas-base);
  transition: border-color 150ms ease, transform 120ms ease, box-shadow 150ms ease;
}

.board-card__handle--corner {
  z-index: 2;
}

.board-card__handle:hover {
  transform: scale(1.35);
  box-shadow: 0 0 0 3px var(--board-accent-soft);
  border-color: var(--board-accent);
}

.board-card--focused .board-card__handle {
  border-color: #0D99FF;
  background: #fff;
}

.board-card--connect-target .board-card__handle--target {
  transform: scale(1.25);
  border-color: var(--board-accent);
  box-shadow: 0 0 0 3px var(--board-accent-soft);
}

.board-card__content {
  display: flex;
  padding: 14px;
  gap: 12px;
}

.board-card__icon-wrapper {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--board-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--board-text-secondary);
}

.board-card--text .board-card__icon-wrapper {
  background: rgba(245, 158, 11, 0.15);
  color: #D97706;
}

.board-card__icon {
  width: 14px;
  height: 14px;
}

.board-card__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.board-card__title {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
}

.board-card__description {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  opacity: 0.85;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.board-card__metrics {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.board-card__metric {
  font-size: 0.68rem;
  color: var(--board-text-secondary);
  background: var(--board-surface-subtle);
  border-radius: 999px;
  padding: 2px 7px;
}

.board-card__pin-indicator {
  position: absolute;
  top: 0;
  right: 12px;
  width: 14px;
  color: #F59E0B;
}
</style>
