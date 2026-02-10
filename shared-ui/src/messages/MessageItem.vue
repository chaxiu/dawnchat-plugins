<template>
  <div class="message" :class="[role, variant]">
    <slot />
  </div>
</template>

<script setup lang="ts">
type MessageRole = 'user' | 'assistant' | 'system'

defineProps<{
  role: MessageRole
  variant?: string
}>()
</script>

<style scoped>
.message {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease-out;
  align-items: flex-start;
  max-width: 100%;
}

.message.user {
  align-items: flex-end;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.tool-call-wrapper,
.message.tool-result-wrapper,
.message.plan-message,
.message.thought-message,
.message.hil-message-wrapper {
  max-width: 85%;
}

.message :deep(.inline-icon) {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}

.message :deep(.mr-1) {
  margin-right: 0.25rem;
}

.message :deep(.animate-spin),
.message :deep(.spinning) {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
