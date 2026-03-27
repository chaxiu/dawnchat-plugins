<script setup lang="ts">
import { computed } from "vue";

import { resolveCardComponent } from "../cards/registry";
import type { TutorCardPayload } from "../cards/types";

const props = defineProps<{
  cards: TutorCardPayload[];
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
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  gap: 12px;
}
.card-item {
  width: 100%;
}
</style>
