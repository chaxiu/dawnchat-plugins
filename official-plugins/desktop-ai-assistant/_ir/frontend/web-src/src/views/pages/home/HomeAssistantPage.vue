<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import CardHost from "../../../components/CardHost.vue";
import { useGuideState } from "../../../runtime/guide/state";

const route = useRoute();
const { currentCard, activeTip, narrationState } = useGuideState();

/** 独立欢迎路由：全屏沉浸式，不挤在业务视图的空态里 */
const isAssistantWelcome = computed(() => route.name === "assistant-welcome");
const isImmersiveView = computed(() =>
  route.name === "view-board-main"
  || route.path.includes("/views/board/main")
  || route.name === "view-plane-main"
  || route.path.includes("/views/plane/main")
  || route.name === "view-image-explainer"
  || route.path.includes("/views/image/explainer")
  || route.name === "view-music-main"
  || route.path.includes("/views/music/main")
);
</script>

<template>
  <section
    class="page-shell"
    :class="{
      'page-shell--welcome': isAssistantWelcome,
      'page-shell--immersive-view': isImmersiveView,
    }"
  >
    <section class="view-stage">
      <RouterView />
    </section>

    <CardHost
      :card="currentCard"
      :tip="activeTip"
      :narration="narrationState"
    />
  </section>
</template>

<style scoped>
.page-shell {
  position: relative;
  flex: 1 1 100%;
  width: 100%;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.page-shell--welcome {
  padding: 0;
}
.page-shell--immersive-view {
  padding: 0;
}
.view-stage {
  position: relative;
  flex: 1 1 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.view-stage :deep(.assistant-welcome) {
  flex: 1;
  min-height: 0;
  height: 100%;
}
.view-stage :deep(.view-root) {
  flex: 1;
  min-height: 0;
  height: 100%;
}
.view-stage :deep(.board-root) {
  flex: 1;
  min-height: 0;
  height: 100%;
}
.view-stage :deep(.piano-scene),
.view-stage :deep(.coordinate-plane-scene),
.view-stage :deep(.image-explainer-scene),
.view-stage :deep(.stage-root) {
  flex: 1;
  min-height: 0;
  height: 100%;
}
</style>
