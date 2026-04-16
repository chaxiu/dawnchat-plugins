<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import CardHost from "../../../components/CardHost.vue";
import { useGuideState } from "../../../runtime/guide/state";

const route = useRoute();
const { currentCard, activeTip, narrationState } = useGuideState();

/** 原 welcome / splash 路由已移除；保留计算属性以便将来恢复独立全屏页时复用 padding 逻辑。 */
const isAssistantWelcome = computed(() => false);
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
  min-width: 0;
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
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
}
/* RouterView 渲染的根节点需参与拉伸，否则 board / word 等仅随内容宽度收缩 */
.view-stage > * {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  align-self: stretch;
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
