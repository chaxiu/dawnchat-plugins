<script setup lang="ts">
defineProps<{
  isMutating: boolean;
  globalPanelOpen: boolean;
}>();

defineEmits<{
  addNote: [];
  arrangeLayout: [];
  toggleGlobalPanel: [];
}>();
</script>

<template>
  <div class="board-toolbar">
    <div class="board-toolbar__meta">
      <strong>Workspace</strong>
    </div>
    <div class="board-toolbar__actions">
      <button type="button" class="toolbar-btn" :disabled="isMutating" @click="$emit('addNote')">
        Add
      </button>
      <button
        type="button"
        class="toolbar-btn toolbar-btn--accent"
        :disabled="isMutating"
        @click="$emit('arrangeLayout')"
      >
        Arrange
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'toolbar-btn--active': globalPanelOpen }"
        :aria-pressed="globalPanelOpen ? 'true' : 'false'"
        @click="$emit('toggleGlobalPanel')"
      >
        {{ globalPanelOpen ? "Hide Panel" : "Show Panel" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.board-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid var(--board-border);
  background: var(--board-surface);
  backdrop-filter: blur(8px);
  box-shadow: var(--board-toolbar-shadow);
}

.board-toolbar__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.board-toolbar__meta strong {
  color: var(--board-text-primary);
  font-size: 0.85rem;
  font-weight: 600;
}

.board-toolbar__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-btn {
  height: 32px;
  border: 1px solid var(--board-border);
  border-radius: 10px;
  padding: 0 10px;
  background: var(--board-surface-subtle);
  color: var(--board-text-primary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.toolbar-btn--accent {
  border-color: var(--board-accent);
  color: var(--board-accent);
  background: var(--board-accent-soft);
}

.toolbar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
