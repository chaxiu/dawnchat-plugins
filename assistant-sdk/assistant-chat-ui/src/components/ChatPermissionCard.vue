<template>
  <div class="msg-item-row assistant permission-row">
    <span class="msg-role">{{ agentLabel }}</span>
    <div class="msg-item permission-item" :data-status="permission.status">
      <div class="permission-header">
        <div class="permission-heading">
          <span class="permission-tool">{{ permission.tool }}</span>
          <span class="permission-subtitle">{{ permissionRequiredLabel }}</span>
        </div>
        <span class="permission-badge" :data-status="permission.status">{{ statusLabel }}</span>
      </div>
      <p v-if="permission.detail" class="permission-detail">{{ permission.detail }}</p>
      <div v-if="permission.status === 'pending'" class="permission-actions">
        <button
          type="button"
          class="permission-btn"
          @click="emit('permission', permission.id, 'once')"
        >
          {{ allowOnceLabel }}
        </button>
        <button
          type="button"
          class="permission-btn"
          @click="emit('permission', permission.id, 'always', true)"
        >
          {{ alwaysAllowLabel }}
        </button>
        <button
          type="button"
          class="permission-btn danger"
          @click="emit('permission', permission.id, 'reject')"
        >
          {{ rejectLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { ChatPermissionCard as ChatPermissionCardType } from "../types";

const props = defineProps<{
  permission: ChatPermissionCardType;
  agentLabel: string;
  permissionRequiredLabel: string;
  allowOnceLabel: string;
  alwaysAllowLabel: string;
  rejectLabel: string;
}>();

const emit = defineEmits<{
  permission: [id: string, response: "once" | "always" | "reject", remember?: boolean];
}>();

const statusLabel = computed(() => {
  if (props.permission.status === "approved") return "已批准";
  if (props.permission.status === "rejected") return "已拒绝";
  return "待确认";
});
</script>

<style scoped>
.permission-row.msg-item-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
}

.permission-row.msg-item-row.assistant {
  align-items: stretch;
}

.permission-row > .msg-role {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: 0 0.1rem;
}

.permission-item {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border-radius: 10px;
  padding: 0.45rem 0.7rem 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
}

.permission-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.permission-heading {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.permission-tool {
  font-size: 0.78rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--color-primary) 68%, var(--color-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.permission-subtitle {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.permission-badge {
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
  border-radius: 999px;
  padding: 0.08rem 0.45rem;
  font-size: 0.68rem;
  line-height: 1.35;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-surface-3) 70%, transparent);
  white-space: nowrap;
}

.permission-badge[data-status="approved"] {
  color: #2f855a;
  border-color: color-mix(in srgb, #2f855a 35%, var(--color-border));
  background: color-mix(in srgb, #22c55e 12%, transparent);
}

.permission-badge[data-status="rejected"] {
  color: #d9534f;
  border-color: color-mix(in srgb, #d9534f 35%, var(--color-border));
  background: color-mix(in srgb, #ef4444 12%, transparent);
}

.permission-detail {
  margin: 0.35rem 0 0 0;
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.permission-actions {
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.permission-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface-3);
  color: var(--color-text);
  border-radius: 6px;
  height: 26px;
  padding: 0 0.55rem;
  font-size: 0.74rem;
  cursor: pointer;
}

.permission-btn.danger {
  color: #d9534f;
}

.permission-btn:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-3));
}

.permission-btn.danger:hover {
  background: color-mix(in srgb, #ef4444 10%, var(--color-surface-3));
}
</style>
