<template>
  <div class="msg-item-row assistant task-row">
    <span class="msg-role">{{ agentLabel }}</span>
    <div
      class="msg-item task-card"
      :class="{ 'is-expanded': inlineExpanded }"
      :data-status="task.status || 'pending'"
      role="button"
      tabindex="0"
      @click="onCardClick"
      @keydown.enter.prevent="onCardClick"
      @keydown.space.prevent="onCardClick"
    >
      <div class="task-header">
        <span class="task-title">{{ task.title }}</span>
        <span v-if="task.status" class="task-status" :data-status="task.status">
          {{ statusLabel }}
        </span>
      </div>
      <p v-if="task.agentLabel" class="task-agent">{{ task.agentLabel }}</p>
      <p v-if="task.summary" class="task-summary">{{ task.summary }}</p>

      <div
        v-if="task.expandableInline && inlineExpanded"
        class="task-inline-details"
        @click.stop
      >
        <div
          v-if="task.mode || (task.writeScope && task.writeScope.length > 0) || formattedDuration || task.exitCode != null"
          class="task-inline-meta"
        >
          <span v-if="task.mode" class="task-meta-chip">mode: {{ task.mode }}</span>
          <span
            v-if="task.writeScope && task.writeScope.length > 0"
            class="task-meta-chip"
          >
            scope: {{ task.writeScope.join(", ") }}
          </span>
          <span v-if="formattedDuration" class="task-meta-chip">{{ formattedDuration }}</span>
          <span v-if="task.exitCode != null" class="task-meta-chip">exit: {{ task.exitCode }}</span>
        </div>

        <div v-if="task.prompt" class="task-inline-section">
          <div class="task-inline-label">Task Brief</div>
          <pre class="task-inline-pre task-inline-prompt">{{ task.prompt }}</pre>
        </div>

        <div class="task-inline-section">
          <div class="task-inline-label">CLI Output</div>
          <pre class="task-inline-pre task-inline-output">{{
            task.output || (isRunningStatus ? "Waiting for CLI stream output..." : "No output recorded.")
          }}</pre>
        </div>
      </div>

      <span class="task-hint">{{ effectiveHintLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

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

const inlineExpanded = ref(false);

const isRunningStatus = computed(() => {
  const status = String(props.task.status || "pending").toLowerCase();
  return status === "running" || status === "pending";
});

const statusLabel = computed(() => {
  const status = String(props.task.status || "pending").toLowerCase();
  if (status === "completed" || status === "done") return "Completed";
  if (status === "failed" || status === "error" || status === "auth_required" || status === "missing_binary") {
    return "Failed";
  }
  if (status === "aborted") return "Aborted";
  if (status === "running" || status === "pending") return "Running";
  return props.task.status || "Pending";
});

const formattedDuration = computed(() => {
  const ms = props.task.durationMs;
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
});

const effectiveHintLabel = computed(() => {
  if (props.task.expandableInline && inlineExpanded.value) {
    return "Collapse details";
  }
  return props.openHintLabel;
});

function onCardClick() {
  if (props.task.expandableInline) {
    inlineExpanded.value = !inlineExpanded.value;
  }
  emit("task-open", props.task.id);
}
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

.task-row .msg-item.is-expanded {
  width: min(680px, calc(96% - 1.15rem));
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
.task-status[data-status="error"],
.task-status[data-status="auth_required"],
.task-status[data-status="missing_binary"] {
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

.task-inline-details {
  margin-top: 0.55rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: default;
}

.task-inline-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.task-meta-chip {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  color: var(--color-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.task-inline-section {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.task-inline-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.task-inline-pre {
  margin: 0;
  padding: 0.45rem 0.55rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-1, #111) 75%, transparent);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.74rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-y: auto;
}

.task-inline-prompt {
  max-height: 140px;
}

.task-inline-output {
  max-height: 260px;
}

.task-hint {
  display: inline-block;
  margin-top: 0.45rem;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}
</style>
