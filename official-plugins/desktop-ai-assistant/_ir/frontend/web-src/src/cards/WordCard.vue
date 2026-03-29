<script setup lang="ts">
const props = defineProps<{
  title?: string;
  data: Record<string, unknown>;
}>();

const word = String(props.data.word || "");
const meaning = String(props.data.meaning || "");
const etymology = Array.isArray(props.data.etymology)
  ? props.data.etymology.map((item) => String(item))
  : [];
</script>

<template>
  <section class="card">
    <header class="card-head">
      <span class="chip">Word</span>
      <h3>{{ title || "词汇讲解" }}</h3>
    </header>
    <p class="primary">{{ word }}</p>
    <p class="muted">{{ meaning }}</p>
    <ul v-if="etymology.length > 0" class="list">
      <li v-for="item in etymology" :key="item">{{ item }}</li>
    </ul>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid var(--line-subtle);
  border-radius: 18px;
  padding: 18px;
  background: var(--surface-card);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18);
}
.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.chip {
  font-size: 0.72rem;
  border-radius: 999px;
  padding: 4px 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #67e8f9;
  border: 1px solid rgba(103, 232, 249, 0.3);
  background: rgba(8, 47, 73, 0.5);
}
h3 {
  margin: 0;
  font-size: 1.02rem;
  color: #eff6ff;
}
.primary {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 12px 0 4px;
  color: #f8fafc;
  letter-spacing: 0.01em;
}
.muted {
  color: var(--text-secondary);
  margin: 0 0 10px;
  line-height: 1.6;
}
.list {
  margin: 0;
  padding-left: 18px;
  color: #cbd5e1;
  display: grid;
  gap: 6px;
}
</style>
