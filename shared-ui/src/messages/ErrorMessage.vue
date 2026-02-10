<template>
  <MessageItem role="assistant" variant="error-message">
    <div class="error-content">
      <XCircle :size="20" class="error-icon" />
      <div class="error-details">
        <div class="error-title">{{ errorMessage }}</div>
        <div v-if="errorCode" class="error-code">{{ labels.errorCode }}: {{ errorCode }}</div>
        <div v-if="suggestion" class="error-suggestion">
          <Lightbulb :size="14" class="mr-1 inline-icon" /> {{ suggestion }}
        </div>
      </div>
    </div>
    <MessageMeta :text="time" />
  </MessageItem>
</template>

<script setup lang="ts">
import { Lightbulb, XCircle } from 'lucide-vue-next'
import MessageItem from './MessageItem.vue'
import MessageMeta from './MessageMeta.vue'

defineProps<{
  errorMessage: string
  errorCode?: string
  suggestion?: string
  time: string
  labels: {
    errorCode: string
  }
}>()
</script>

<style scoped>
.error-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(255, 77, 79, 0.08);
  border: 1px solid rgba(255, 77, 79, 0.2);
  max-width: 85%;
}

.error-icon {
  color: #ff4d4f;
  flex-shrink: 0;
}

.error-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.error-title {
  font-weight: 600;
  color: var(--color-text);
}

.error-code {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.error-suggestion {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}
</style>
