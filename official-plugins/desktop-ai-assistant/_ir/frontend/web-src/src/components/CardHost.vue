<script setup lang="ts">
import { computed } from "vue";

import { resolveCardComponent } from "../cards/registry";
import type { AssistantCardPayload } from "../cards/types";

const props = defineProps<{
  cards: AssistantCardPayload[];
}>();

const normalizedCards = computed(() =>
  props.cards.map((card, index) => ({
    ...card,
    key: `${card.card_type}-${index}`,
    component: resolveCardComponent(card.card_type),
  }))
);
</script>

<template>
  <section class="host">
    <header class="host-header">
      <h2>助理画布</h2>
      <p>Agent 可以动态添加讲解、任务和多媒体内容卡片</p>
    </header>
    <article v-for="card in normalizedCards" :key="card.key" class="card-item">
      <component
        :is="card.component || 'div'"
        v-bind="card.component ? { title: card.title, data: card.data } : {}"
      >
        <template v-if="!card.component">
          Unsupported card type: {{ card.card_type }}
        </template>
      </component>
    </article>
  </section>
</template>

<style scoped>
.host {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  gap: 16px;
}
.host-header {
  border-radius: 20px;
  padding: 16px 18px;
  border: 1px solid var(--line-subtle);
  background: var(--surface-soft);
  backdrop-filter: blur(8px);
}
.host-header h2 {
  margin: 0;
  font-size: 1.03rem;
  letter-spacing: 0.01em;
  color: #eff6ff;
}
.host-header p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}
.card-item {
  width: 100%;
}
</style>
