<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

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
  <main class="app-shell">
    <RouterView />
  </main>
</template>

<style scoped>
.app-shell {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 28%),
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.16), transparent 24%),
    linear-gradient(180deg, #09111d, #0f172a 40%, #030712);
}
</style>
