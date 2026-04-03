<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
  ASSISTANT_UI_LAYER_ORB,
  ORB_DOCK_BOTTOM,
  ORB_DOCK_LEFT,
  ORB_DOCK_SIZE,
} from "../runtime/assistantUiLayout";
import { useSessionVisualState } from "../runtime/session/visualState";
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
      zIndex: ASSISTANT_UI_LAYER_ORB,
    };
  }
  return {
    left: `${ORB_DOCK_LEFT}px`,
    bottom: `${ORB_DOCK_BOTTOM}px`,
    width: `${ORB_DOCK_SIZE}px`,
    height: `${ORB_DOCK_SIZE}px`,
    zIndex: ASSISTANT_UI_LAYER_ORB,
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
  pointer-events: none;
}
</style>
