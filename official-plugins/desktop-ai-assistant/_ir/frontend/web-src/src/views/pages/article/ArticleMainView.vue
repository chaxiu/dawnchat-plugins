<script setup lang="ts">
import { computed } from "vue";

import { useViewState } from "../../../runtime/view";

const { activeViewId, activeAnchor, currentResource, activeManifest } = useViewState();

const isActiveArticleView = computed(() => activeViewId.value === "article.main");
const articleSummary = computed(() => String(currentResource.value?.data.summary || "").trim());
const articleSections = computed(() => {
  const items = currentResource.value?.data.sections;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => String(item || "").trim()).filter((item) => item.length > 0);
});
const articleAnnotations = computed(() => {
  const items = currentResource.value?.data.annotations;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => String(item || "").trim()).filter((item) => item.length > 0);
});
const articleTags = computed(() => {
  const items = currentResource.value?.data.tags;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => String(item || "").trim()).filter((item) => item.length > 0);
});
const capabilityTitles = computed(() => {
  return activeManifest.value?.capabilities.map((capability) => capability.title) || [];
});

const isArticleWorkspaceReady = computed(
  () => isActiveArticleView.value && Boolean(currentResource.value) && Boolean(activeManifest.value),
);
</script>

<template>
  <section class="view-root" data-view-id="article.main">
    <div v-if="isArticleWorkspaceReady" class="workspace">
      <header
        class="panel panel-header"
        :data-anchor="activeAnchor === 'article.header' ? 'active' : 'inactive'"
      >
        <span class="chip">Article View</span>
        <h2>{{ currentResource!.title || "文章工作区" }}</h2>
        <div class="tag-list">
          <span v-for="tag in articleTags" :key="tag">{{ tag }}</span>
        </div>
      </header>

      <section
        class="panel"
        :data-anchor="activeAnchor === 'article.summary' ? 'active' : 'inactive'"
      >
        <div class="section-head">
          <strong>Summary</strong>
          <span>article.summary</span>
        </div>
        <p class="body-text">{{ articleSummary || "Waiting for summary..." }}</p>
      </section>

      <section
        class="panel"
        :data-anchor="activeAnchor === 'article.body' ? 'active' : 'inactive'"
      >
        <div class="section-head">
          <strong>Body</strong>
          <span>article.body</span>
        </div>
        <ol v-if="articleSections.length > 0" class="section-list">
          <li v-for="section in articleSections" :key="section">{{ section }}</li>
        </ol>
        <p v-else class="body-text">暂无正文段落</p>
      </section>

      <section
        class="panel"
        :data-anchor="activeAnchor === 'article.annotations' ? 'active' : 'inactive'"
      >
        <div class="section-head">
          <strong>Annotations</strong>
          <span>article.annotations</span>
        </div>
        <ul v-if="articleAnnotations.length > 0" class="annotation-list">
          <li v-for="item in articleAnnotations" :key="item">{{ item }}</li>
        </ul>
        <p v-else class="body-text">暂无附注</p>
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

    <div v-else class="article-idle">
      <p class="article-idle__title">Article workspace</p>
      <p class="article-idle__hint">
        Waiting for <code>view.open</code> from the host with an active article resource.
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
.article-idle {
  flex: 1;
  display: grid;
  place-content: center;
  gap: 10px;
  padding: 24px 16px;
  min-height: min(420px, 70vh);
  border-radius: 20px;
  border: 1px dashed rgba(192, 132, 252, 0.24);
  background: rgba(15, 23, 42, 0.45);
  text-align: center;
  color: #cbd5e1;
}
.article-idle__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #e2e8f0;
}
.article-idle__hint {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: #94a3b8;
}
.article-idle code {
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.9);
  color: #e9d5ff;
}
.panel {
  border: 1px solid rgba(192, 132, 252, 0.18);
  border-radius: 24px;
  padding: 20px;
  background: rgba(15, 23, 42, 0.8);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18);
}
.panel[data-anchor="active"] {
  border-color: rgba(216, 180, 254, 0.42);
  box-shadow: 0 0 0 1px rgba(216, 180, 254, 0.14), inset 0 1px 0 rgba(148, 163, 184, 0.18);
}
.panel-header h2 {
  margin: 14px 0 8px;
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  color: #f8fafc;
}
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  color: #e9d5ff;
  border: 1px solid rgba(216, 180, 254, 0.3);
  background: rgba(76, 29, 149, 0.36);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tag-list,
.capability-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-list span,
.capability-list span {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(30, 41, 59, 0.84);
  color: #e2e8f0;
  font-size: 0.82rem;
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
.section-list,
.annotation-list {
  margin: 0;
  padding-left: 18px;
  color: #cbd5e1;
  display: grid;
  gap: 8px;
}
</style>
