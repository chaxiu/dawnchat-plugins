<template>
  <div class="msg-item-row assistant task-row">
    <span class="msg-role">{{ agentLabel }}</span>
    <button
      type="button"
      class="msg-item task-card"
      :data-status="task.status || 'pending'"
      @click="emit('task-open', task.id)"
    >
      <div class="task-header">
        <span class="task-title">{{ task.title }}</span>
        <span v-if="task.status" class="task-status" :data-status="task.status">
          {{ statusLabel }}
        </span>
      </div>
      <p v-if="task.agentLabel" class="task-agent">{{ task.agentLabel }}</p>
      <p v-if="task.summary" class="task-summary">{{ task.summary }}</p>
      <span class="task-hint">{{ openHintLabel }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { ChatTaskInfo } from "../types";

const props = withDefaults(
  defineProps<{
    task: ChatTaskInfo;
    agentLabel?: string;
    openHintLabel?: string;
  }>(),
  {
    agentLabel: "Assistant",
    openHintLabel: "View details",
  },
);

const emit = defineEmits<{
  "task-open": [taskId: string];
}>();

const statusLabel = computed(() => {
  const status = String(props.task.status || "pending").toLowerCase();
  if (status === "completed" || status === "done") return "Completed";
  if (status === "failed" || status === "error") return "Failed";
  if (status === "running" || status === "pending") return "Running";
  return props.task.status || "Pending";
});
</script>

<style scoped>
.msg-item-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.msg-item-row.assistant {
  align-items: flex-start;
}

.msg-role {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: 0 0.1rem;
}

.msg-item {
  max-width: 92%;
  min-width: 0;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
}

.task-row .msg-item {
  margin-left: 1.15rem;
  width: min(560px, calc(92% - 1.15rem));
  text-align: left;
  cursor: pointer;
}

.task-card {
  font: inherit;
  color: inherit;
}

.task-card:hover {
  border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface-2));
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.task-title {
  font-size: 0.82rem;
  font-weight: 600;
}

.task-status {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.task-status[data-status="completed"],
.task-status[data-status="done"] {
  color: #2f855a;
}

.task-status[data-status="failed"],
.task-status[data-status="error"] {
  color: #d9534f;
}

.task-status[data-status="running"],
.task-status[data-status="pending"] {
  color: color-mix(in srgb, var(--color-primary) 80%, var(--color-text));
}

.task-agent {
  margin: 0.28rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.task-summary {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
}

.task-hint {
  display: inline-block;
  margin-top: 0.45rem;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}
</style>
