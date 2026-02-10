<template>
  <MessageItem role="system" variant="status-message">
    <div class="status-indicator" v-if="isLatest">
      <Loader2 :size="14" class="status-icon spinning" />
      <span class="status-text">{{ content }}</span>
    </div>
    <div v-else class="status-indicator completed">
      <Check :size="14" class="status-icon" />
      <span class="status-text">{{ receivedText }}</span>
    </div>
  </MessageItem>
</template>

<script setup lang="ts">
import { Check, Loader2 } from 'lucide-vue-next'
import MessageItem from './MessageItem.vue'

defineProps<{
  content: string
  isLatest: boolean
  receivedText: string
}>()
</script>

<style scoped>
.status-message {
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-bg-secondary);
  border-radius: 20px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.status-indicator.completed {
  opacity: 0.8;
}

.status-icon {
  font-size: 1rem;
}

.status-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
