<template>
  <MessageItem role="assistant" variant="streaming">
    <MessageBubble variant="assistant">
      <span class="stream-content">{{ content }}</span>
      <span v-if="!isFinal" class="stream-cursor">▊</span>
    </MessageBubble>
  </MessageItem>
</template>

<script setup lang="ts">
import MessageItem from './MessageItem.vue'
import MessageBubble from './MessageBubble.vue'

defineProps<{
  content: string
  isFinal?: boolean
}>()
</script>

<style scoped>
.stream-cursor {
  margin-left: 2px;
  opacity: 0.8;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}
</style>
