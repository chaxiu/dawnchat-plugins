<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import { ASSISTANT_UI_LAYER_ORB } from "../runtime/assistantUiLayout";
import { useSessionVisualState } from "../runtime/session/visualState";
import AiWaveCore from "./AiWaveCore.vue";

const route = useRoute();
const { sessionVisualStatus } = useSessionVisualState();
const isWelcomeRoute = computed(() => route.name === "assistant-welcome");
const containerStyle = computed(() => ({
  left: "0px",
  bottom: "0px",
  width: "100vw",
  height: "100vh",
  zIndex: ASSISTANT_UI_LAYER_ORB,
}));
</script>

<template>
  <section
    v-if="isWelcomeRoute"
    class="assistant-orb-layer"
    data-orb-state="hero"
    :style="containerStyle"
  >
    <AiWaveCore
      mode="hero"
      :motion-mode="sessionVisualStatus === 'running' ? 'active' : 'idle'"
      :show-greeting="true"
      welcome-text="Hello, I am your AI assistant"
    />
  </section>
</template>

<style scoped>
.assistant-orb-layer {
  position: fixed;
  pointer-events: none;
}
</style>
