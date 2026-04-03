<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import CardHost from "../../../components/CardHost.vue";
import { useGuideState } from "../../../runtime/guide/state";

const route = useRoute();
const { currentCard, activeTip, narrationState } = useGuideState();

/** 独立欢迎路由：全屏沉浸式，不挤在业务视图的空态里 */
const isAssistantWelcome = computed(() => route.name === "assistant-welcome");
</script>

<template>
  <section class="page-shell" :class="{ 'page-shell--welcome': isAssistantWelcome }">
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
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.page-shell--welcome {
  min-height: 100vh;
  min-height: 100dvh;
  padding: 0;
}
.view-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}
.view-stage :deep(.view-root) {
  flex: 1;
  min-height: 0;
  height: 100%;
}
</style>
