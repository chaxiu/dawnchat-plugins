<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

import AssistantOrbLayer from "./components/AssistantOrbLayer.vue";
import {
  installAssistantRuntimeCapabilities,
  uninstallAssistantRuntimeCapabilities,
} from "./runtime/bootstrap";

let registeredCapabilityNames: string[] = [];

onMounted(() => {
  registeredCapabilityNames = installAssistantRuntimeCapabilities();
});

onUnmounted(() => {
  uninstallAssistantRuntimeCapabilities(registeredCapabilityNames);
  registeredCapabilityNames = [];
});
</script>

<template>
  <main class="assistant-shell">
    <div class="aurora aurora-a"></div>
    <div class="aurora aurora-b"></div>
    <AssistantOrbLayer />
    <section class="shell-stage">
      <RouterView />
    </section>
  </main>
</template>

<style scoped>
.assistant-shell {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 0;
  color: var(--text-primary);
  overflow: hidden;
}
.aurora {
  position: absolute;
  z-index: 0;
  border-radius: 999px;
  filter: blur(80px);
  opacity: 0.48;
  pointer-events: none;
}
.aurora-a {
  width: 380px;
  height: 380px;
  left: -120px;
  top: -140px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.56) 0%, rgba(14, 116, 144, 0) 72%);
}
.aurora-b {
  width: 320px;
  height: 320px;
  right: -110px;
  top: 70px;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.46) 0%, rgba(49, 46, 129, 0) 72%);
}
.shell-stage {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  min-height: 100dvh;
}
</style>
