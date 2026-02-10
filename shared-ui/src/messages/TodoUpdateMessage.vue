<template>
  <MessageItem role="system" variant="todo-update-message">
    <div v-if="status === 'failed'" class="system-note error">
      <XCircle :size="14" class="mr-1 inline-icon" />
      {{ stepLabel }} {{ todoId?.substring(0, 8) }} {{ failedLabel }}: {{ error }}
    </div>
  </MessageItem>
</template>

<script setup lang="ts">
import { XCircle } from 'lucide-vue-next'
import MessageItem from './MessageItem.vue'

defineProps<{
  status?: string
  todoId?: string
  error?: string
  stepLabel: string
  failedLabel: string
}>()
</script>

<style scoped>
.system-note {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.03);
  padding: 4px 8px;
  border-radius: 4px;
  margin: 4px 0;
  display: inline-block;
}

.system-note.error {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}
</style>
