<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";

import {
  installAssistantRuntimeCapabilities,
  uninstallAssistantRuntimeCapabilities,
} from "./runtime/bootstrap";
import { ASSISTANT_UI_LAYER_PAGE } from "./runtime/assistantUiLayout";

let registeredCapabilityNames: string[] = [];
const route = useRoute();
const shellStageStyle = computed(() => ({
  zIndex: ASSISTANT_UI_LAYER_PAGE,
}));
const isImmersiveRoute = computed(() =>
  route.name === "view-board-main"
  || route.path.includes("/views/board/main")
  || route.name === "view-plane-main"
  || route.path.includes("/views/plane/main")
  || route.name === "view-music-main"
  || route.path.includes("/views/music/main")
);

onMounted(() => {
  registeredCapabilityNames = installAssistantRuntimeCapabilities();
});

onUnmounted(() => {
  uninstallAssistantRuntimeCapabilities(registeredCapabilityNames);
  registeredCapabilityNames = [];
});
</script>

<template>
  <main class="assistant-shell" :class="{ 'assistant-shell--immersive': isImmersiveRoute }">
    <div v-if="!isImmersiveRoute" class="aurora aurora-a"></div>
    <div v-if="!isImmersiveRoute" class="aurora aurora-b"></div>
    <section class="shell-stage" :style="shellStageStyle">
      <RouterView />
    </section>
  </main>
</template>

<style scoped>
.assistant-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  padding: 0;
  color: var(--text-primary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.assistant-shell--immersive {
  background: #0b0f14;
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
  z-index: 10;
  flex: 1 1 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* 列向 flex 下子项默认 min-width:auto，会按内容最小宽度收缩，导致视图区无法铺满 iframe 宽度 */
  min-width: 0;
  width: 100%;
}
/* RouterView 根节点（如 page-shell）需参与拉伸，避免仅依赖子组件 width:100% 在 iframe 下不稳定 */
.shell-stage > * {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
}
</style>
