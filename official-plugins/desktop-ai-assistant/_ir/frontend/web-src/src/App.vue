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
  <main class="assistant-shell">
    <div class="aurora aurora-a"></div>
    <div class="aurora aurora-b"></div>
    <header class="title-bar">
      <h1>Desktop AI Assistant</h1>
    </header>
    <section class="card-stage">
      <RouterView />
    </section>
  </main>
</template>

<style scoped>
.assistant-shell {
  position: relative;
  min-height: 100vh;
  padding: 18px 0 20px;
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
.title-bar {
  position: relative;
  z-index: 1;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 16px 8px;
}
h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  letter-spacing: 0.01em;
  color: #eef6ff;
  text-shadow: 0 0 22px rgba(56, 189, 248, 0.22);
}
.card-stage {
  position: relative;
  z-index: 1;
}
@media (max-width: 760px) {
  .title-bar {
    padding: 0 16px 4px;
  }
}
</style>
