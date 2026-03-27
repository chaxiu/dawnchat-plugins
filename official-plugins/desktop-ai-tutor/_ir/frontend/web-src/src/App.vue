<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

import { listCardFunctions } from "./cards/registry";
import type { TutorCardPayload } from "./cards/types";
import CardHost from "./components/CardHost.vue";
import { registerCapability, toTutorCardPayload, unregisterCapability } from "./runtime/capabilities";

const cards = ref<TutorCardPayload[]>([
  {
    card_type: "word",
    title: "欢迎",
    data: {
      word: "Tutor",
      meaning: "你的自进化知识与私教助手",
      etymology: ["支持富媒体呈现", "支持代码级进化"],
    },
  },
]);

const appendCard = (payload: Record<string, unknown>) => {
  const normalized = toTutorCardPayload(payload);
  cards.value = [...cards.value, normalized];
  return {
    ok: true,
    data: {
      card_count: cards.value.length,
    },
  };
};

const clearCards = () => {
  cards.value = [];
  return {
    ok: true,
    data: {
      card_count: 0,
    },
  };
};

onMounted(() => {
  const [renderDef, clearDef] = listCardFunctions();
  registerCapability(renderDef, async (payload) => appendCard(payload));
  registerCapability(clearDef, async () => clearCards());
});

onUnmounted(() => {
  unregisterCapability("tutor.render_card");
  unregisterCapability("tutor.clear_cards");
});
</script>

<template>
  <main class="tutor-shell">
    <header class="title-bar">
      <h1>Desktop AI Tutor</h1>
      <p>Agent 可以通过 MCP 查询并调用前端能力函数</p>
    </header>
    <CardHost :cards="cards" />
  </main>
</template>

<style scoped>
.tutor-shell {
  width: 100%;
  min-height: 100%;
  background: #f8fafc;
  color: #0f172a;
}
.title-bar {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 16px 6px;
}
h1 {
  margin: 0;
  font-size: 1.4rem;
}
p {
  margin: 6px 0 0;
  color: #475569;
}
</style>
