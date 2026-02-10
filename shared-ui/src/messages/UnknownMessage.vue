<template>
  <MessageItem role="system" variant="unknown-message">
    <div class="unknown-content">
      <FileText :size="16" class="unknown-icon" />
      <span class="unknown-text">{{ content }}</span>
    </div>
  </MessageItem>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import MessageItem from './MessageItem.vue'

defineProps<{
  content: string
}>()
</script>

<style scoped>
.unknown-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  max-width: 85%;
}

.unknown-icon {
  flex-shrink: 0;
}
</style>
