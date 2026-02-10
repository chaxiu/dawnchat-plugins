<template>
  <MessageItem role="user">
    <MessageBubble variant="user">
      {{ content }}
    </MessageBubble>
    <MessageMeta :text="time" />
  </MessageItem>
</template>

<script setup lang="ts">
import MessageItem from './MessageItem.vue'
import MessageBubble from './MessageBubble.vue'
import MessageMeta from './MessageMeta.vue'

defineProps<{
  content: string
  time: string
}>()
</script>
