<script setup lang="ts">
import { AssistantAiOrb } from "@dawnchat/assistant-chat-ui";
import { ASSISTANT_LAUNCHER_ROUTE } from "@dawnchat/assistant-core/view";
import { useSessionVisualState } from "@dawnchat/assistant-core/session";
import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { sessionVisualStatus } = useSessionVisualState();

const SPLASH_MS = 2800;
let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  timer = setTimeout(() => {
    void router.replace(ASSISTANT_LAUNCHER_ROUTE);
  }, SPLASH_MS);
});

onUnmounted(() => {
  if (timer !== undefined) {
    clearTimeout(timer);
  }
});
</script>

<template>
  <main class="web-assistant-splash">
    <AssistantAiOrb
      :motion-mode="sessionVisualStatus === 'running' ? 'active' : 'idle'"
      :show-greeting="true"
      welcome-text="Hello, I am your AI assistant"
    />
  </main>
</template>

<style scoped>
.web-assistant-splash {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.web-assistant-splash :deep(.dc-ai-orb) {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}
</style>
