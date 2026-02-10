<template>
  <MessageItem role="system" variant="thought-message">
    <CollapsibleMessage
      :title="title"
      :icon="icon"
      :default-expanded="false"
      :expand-text="expandText"
      :collapse-text="collapseText"
    >
      <div class="thought-content-text">{{ content }}</div>
    </CollapsibleMessage>
  </MessageItem>
</template>

<script setup lang="ts">
import CollapsibleMessage from './CollapsibleMessage.vue'
import MessageItem from './MessageItem.vue'

defineProps<{
  title: string
  content: string
  icon?: any
  expandText: string
  collapseText: string
}>()
</script>
