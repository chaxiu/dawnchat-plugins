<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import CardHost from "../../../components/CardHost.vue";
import { useGuideState } from "../../../runtime/guideState";
import { useViewState } from "../../../runtime/viewState";

const route = useRoute();
const { currentCard, activeTip, narrationState } = useGuideState();
const { activeViewId, activeAnchor, activeManifest, currentResource } = useViewState();

/** 独立欢迎路由：全屏沉浸式，不挤在业务视图的空态里 */
const isAssistantWelcome = computed(() => route.name === "assistant-welcome");

const activeViewSummaryEntries = computed(() => {
  if (!activeManifest.value) {
    return [];
  }
  return Object.entries(activeManifest.value.state_summary)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .map(([key, value]) => ({
      key,
      value: String(value),
    }));
});
</script>

<template>
  <section class="page-shell" :class="{ 'page-shell--welcome': isAssistantWelcome }">
    <aside
      v-if="activeManifest && !isAssistantWelcome"
      class="view-banner"
      :data-view-id="activeViewId || activeManifest.view_id"
    >
      <div class="view-banner-head">
        <strong>{{ activeManifest.title }}</strong>
        <span>{{ activeViewId || activeManifest.view_id }}</span>
      </div>
      <p class="view-banner-meta">
        <span>{{ currentResource?.resource_type || activeManifest.resource_type }}</span>
        <span>{{ activeManifest.route_path }}</span>
        <span v-if="activeAnchor">{{ activeAnchor }}</span>
        <span>{{ activeManifest.capabilities.length }} capabilities</span>
      </p>
      <ul v-if="activeViewSummaryEntries.length > 0" class="view-summary-list">
        <li v-for="entry in activeViewSummaryEntries" :key="entry.key">
          <strong>{{ entry.key }}</strong>
          <span>{{ entry.value }}</span>
        </li>
      </ul>
    </aside>

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
  z-index: 1;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  min-height: calc(100vh - 140px);
  padding: 16px;
}
.page-shell--welcome {
  max-width: none;
  margin: 0;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 0;
}
.view-stage {
  position: relative;
  z-index: 1;
}
.view-banner {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(94, 234, 212, 0.28);
  background: rgba(6, 78, 59, 0.3);
  color: #e0f2fe;
}
.view-banner-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.view-banner-head span {
  font-size: 0.84rem;
  color: rgba(204, 251, 241, 0.9);
}
.view-banner-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
}
.view-banner-meta span {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.34);
  color: #ccfbf1;
  font-size: 0.8rem;
}
.view-summary-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.view-summary-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(240, 253, 250, 0.92);
}
.view-summary-list strong {
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(153, 246, 228, 0.88);
}
</style>
