<template>
  <div class="message-content" :class="variantClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type MessageVariant = 'user' | 'assistant' | 'system'

const props = defineProps<{
  variant?: MessageVariant
}>()

const variantClass = computed(() => {
  if (props.variant === 'user') return 'variant-user'
  if (props.variant === 'assistant') return 'variant-assistant'
  return undefined
})
</script>

<style scoped>
.message-content {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  line-height: 1.5;
  word-break: break-word;
  max-width: 85%;
  border: 1px solid var(--color-border);
}

.message-content.variant-user {
  background: var(--color-primary);
  color: white;
  border: none;
  border-bottom-right-radius: 2px;
}

.message-content.variant-assistant {
  border-bottom-left-radius: 2px;
}
</style>
