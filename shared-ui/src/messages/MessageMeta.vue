<template>
  <div class="message-time">{{ text }}</div>
</template>

<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<style scoped>
.message-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
  padding: 0 0.25rem;
}
</style>
