<script setup lang="ts">
import { computed } from "vue";

import { useViewState } from "../../../runtime/view";

const { activeViewId, activeAnchor, currentResource, activeManifest } = useViewState();

const isActiveWordView = computed(() => activeViewId.value === "word.main");
const word = computed(() => String(currentResource.value?.data.word || "").trim());
const meaning = computed(() => String(currentResource.value?.data.meaning || "").trim());
const etymology = computed(() => {
  const items = currentResource.value?.data.etymology;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => String(item || "").trim()).filter((item) => item.length > 0);
});
const capabilityTitles = computed(() => {
  return activeManifest.value?.capabilities.map((capability) => capability.title) || [];
});

const isWordWorkspaceReady = computed(
  () => isActiveWordView.value && Boolean(currentResource.value) && Boolean(activeManifest.value),
);
</script>

<template>
  <section class="view-root" data-view-id="word.main">
    <div v-if="isWordWorkspaceReady" class="workspace">
      <header
        class="panel panel-header"
        :data-anchor="activeAnchor === 'word.header' ? 'active' : 'inactive'"
      >
        <span class="chip">Word View</span>
        <h2>{{ currentResource!.title || "词汇工作区" }}</h2>
        <p>{{ word || "未设置单词" }}</p>
      </header>

      <section
        class="panel"
        :data-anchor="activeAnchor === 'word.meaning' ? 'active' : 'inactive'"
      >
        <div class="section-head">
          <strong>Meaning</strong>
          <span>word.meaning</span>
        </div>
        <p class="body-text">{{ meaning || "Waiting for meaning..." }}</p>
      </section>

      <section
        class="panel"
        :data-anchor="activeAnchor === 'word.etymology' ? 'active' : 'inactive'"
      >
        <div class="section-head">
          <strong>Etymology</strong>
          <span>word.etymology</span>
        </div>
        <ul v-if="etymology.length > 0" class="etymology-list">
          <li v-for="item in etymology" :key="item">{{ item }}</li>
        </ul>
        <p v-else class="body-text">暂无词源信息</p>
      </section>

      <footer class="panel panel-footer">
        <div class="section-head">
          <strong>Capabilities</strong>
          <span>{{ capabilityTitles.length }}</span>
        </div>
        <div class="capability-list">
          <span v-for="title in capabilityTitles" :key="title">{{ title }}</span>
        </div>
      </footer>
    </div>

    <div v-else class="word-idle">
      <p class="word-idle__title">Word workspace</p>
      <p class="word-idle__hint">
        Waiting for <code>view.open</code> from the host with an active word resource.
      </p>
    </div>
  </section>
</template>

<style scoped>
.view-root {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
.workspace {
  display: grid;
  gap: 16px;
}
.word-idle {
  flex: 1;
  display: grid;
  place-content: center;
  gap: 10px;
  padding: 24px 16px;
  min-height: min(420px, 70vh);
  border-radius: 20px;
  border: 1px dashed rgba(103, 232, 249, 0.22);
  background: rgba(15, 23, 42, 0.45);
  text-align: center;
  color: #cbd5e1;
}
.word-idle__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #e2e8f0;
}
.word-idle__hint {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: #94a3b8;
}
.word-idle code {
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.9);
  color: #a5f3fc;
}
.panel {
  border: 1px solid rgba(103, 232, 249, 0.18);
  border-radius: 24px;
  padding: 20px;
  background: rgba(15, 23, 42, 0.8);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18);
}
.panel[data-anchor="active"] {
  border-color: rgba(94, 234, 212, 0.4);
  box-shadow: 0 0 0 1px rgba(94, 234, 212, 0.14), inset 0 1px 0 rgba(148, 163, 184, 0.18);
}
.panel-header h2 {
  margin: 14px 0 8px;
  font-size: clamp(1.7rem, 3vw, 2.4rem);
  color: #f8fafc;
}
.panel-header p {
  margin: 0;
  font-size: 1.05rem;
  color: #cbd5e1;
}
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  color: #67e8f9;
  border: 1px solid rgba(103, 232, 249, 0.28);
  background: rgba(8, 47, 73, 0.48);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.section-head strong {
  color: #f8fafc;
}
.section-head span {
  color: #94a3b8;
  font-size: 0.82rem;
}
.body-text {
  margin: 0;
  line-height: 1.7;
  color: #cbd5e1;
}
.etymology-list {
  margin: 0;
  padding-left: 18px;
  color: #cbd5e1;
  display: grid;
  gap: 8px;
}
.panel-footer {
  gap: 12px;
}
.capability-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.capability-list span {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(30, 41, 59, 0.84);
  color: #e2e8f0;
  font-size: 0.82rem;
}
</style>
