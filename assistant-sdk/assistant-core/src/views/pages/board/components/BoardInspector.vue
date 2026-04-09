<script setup lang="ts">
import type { BoardNode } from "../model/types";

defineProps<{
  activeAnchor: string;
  isMutating: boolean;
  selectedNode: BoardNode | null;
}>();

defineEmits<{
  close: [];
  togglePinNode: [node: BoardNode];
}>();
</script>

<template>
  <aside class="board-inspector" :data-anchor="activeAnchor === 'board.inspector' ? 'active' : 'inactive'" @click.stop>
    <header class="board-inspector__top">
      <strong>Properties</strong>
      <button type="button" class="close-btn" @click="$emit('close')">Close</button>
    </header>

    <section class="info-card">
      <div v-if="selectedNode" class="focused-node">
        <div class="metadata-row">
          <span class="media-type-badge">{{ selectedNode.media_type }}</span>
        </div>
        <h3>{{ selectedNode.title }}</h3>
        <p>{{ selectedNode.description || "No description yet." }}</p>
        <div class="metadata-row tags-row">
          <span class="semantic-badge">{{ selectedNode.semantic_type }}</span>
          <span class="tags-badge" v-if="selectedNode.tags.length">{{ selectedNode.tags.join(" · ") }}</span>
        </div>
        <button type="button" class="toolbar-btn pin-btn" :disabled="isMutating" @click="$emit('togglePinNode', selectedNode)">
          {{ selectedNode.pinned ? "Unpin Node" : "Pin Node" }}
        </button>
      </div>
      <p v-else class="empty-copy">Select a node to inspect its properties.</p>
    </section>
  </aside>
</template>

<style scoped>
.board-inspector {
  position: absolute;
  top: 12px;
  right: 12px;
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
}

.board-inspector[data-anchor="active"] {
  box-shadow:
    var(--board-panel-shadow),
    0 0 0 1px var(--board-accent);
}

.board-inspector__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 12px;
  border-bottom: 1px solid var(--board-border);
}

.board-inspector__top strong {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--board-text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--board-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.close-btn:hover {
  background: var(--board-surface-subtle);
  color: var(--board-text-primary);
}

.info-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

.focused-node {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.focused-node h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--board-text-primary);
  line-height: 1.4;
}

.focused-node p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--board-text-secondary);
  line-height: 1.5;
}

.metadata-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tags-row {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--board-border);
}

.media-type-badge,
.semantic-badge,
.tags-badge {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  border: 1px solid var(--board-border);
}

.media-type-badge {
  background: var(--board-accent-soft);
  color: var(--board-accent);
  border-color: transparent;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.semantic-badge {
  background: var(--board-surface);
  color: var(--board-text-primary);
}

.tags-badge {
  background: transparent;
  color: var(--board-text-secondary);
}

.empty-copy {
  margin: auto;
  text-align: center;
  font-size: 0.85rem;
  color: var(--board-text-secondary);
  line-height: 1.5;
}

.pin-btn {
  margin-top: auto;
  width: 100%;
  height: 36px;
  border: 1px solid var(--board-border);
  border-radius: 8px;
  background: var(--board-surface-subtle);
  color: var(--board-text-primary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.pin-btn:hover:not(:disabled) {
  background: var(--board-accent-soft);
  border-color: var(--board-accent);
  color: var(--board-accent);
}

.pin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
