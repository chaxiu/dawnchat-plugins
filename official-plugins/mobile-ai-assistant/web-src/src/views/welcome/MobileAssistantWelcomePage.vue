<script setup lang="ts">
import { AssistantAiOrb } from "@dawnchat/assistant-chat-ui";

import { useSessionVisualState } from "../../runtime/session/visualState";

const { sessionVisualStatus } = useSessionVisualState();
</script>

<template>
  <main class="mobile-assistant-welcome">
    <AssistantAiOrb
      :motion-mode="sessionVisualStatus === 'running' ? 'active' : 'idle'"
      :show-greeting="true"
      welcome-text="Hello, I am your AI assistant"
    />
  </main>
</template>

<style scoped>
.mobile-assistant-welcome {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mobile-assistant-welcome :deep(.dc-ai-orb) {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}
</style>
