<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
  ORB_DOCK_BOTTOM,
  ORB_DOCK_LEFT,
  ORB_DOCK_SIZE,
} from "../runtime/assistantUiLayout";
import { useSessionVisualState } from "../runtime/sessionVisualState";
import AiWaveCore from "./AiWaveCore.vue";

const route = useRoute();
const { sessionVisualStatus } = useSessionVisualState();
const isWelcomeRoute = computed(() => route.name === "assistant-welcome");
const orbState = computed(() => (isWelcomeRoute.value ? "hero" : "dock"));

const containerStyle = computed(() => {
  if (isWelcomeRoute.value) {
    return {
      left: "0px",
      bottom: "0px",
      width: "100vw",
      height: "100vh",
    };
  }
  return {
    left: `${ORB_DOCK_LEFT}px`,
    bottom: `${ORB_DOCK_BOTTOM}px`,
    width: `${ORB_DOCK_SIZE}px`,
    height: `${ORB_DOCK_SIZE}px`,
  };
});

const coreMode = computed(() => {
  return isWelcomeRoute.value ? "hero" : "dock";
});
</script>

<template>
  <section
    class="assistant-orb-layer"
    :data-orb-state="orbState"
    :style="containerStyle"
  >
    <AiWaveCore
      :mode="coreMode"
      :motion-mode="sessionVisualStatus === 'running' ? 'active' : 'idle'"
      :show-greeting="coreMode === 'hero'"
      welcome-text="Hello, I am your AI assistant"
    />
  </section>
</template>

<style scoped>
.assistant-orb-layer {
  position: fixed;
  z-index: 6;
  pointer-events: none;
}
</style>
