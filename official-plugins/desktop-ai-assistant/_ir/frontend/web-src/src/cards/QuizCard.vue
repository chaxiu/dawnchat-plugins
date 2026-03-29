<script setup lang="ts">
const props = defineProps<{
  title?: string;
  data: Record<string, unknown>;
}>();

const question = String(props.data.question || "");
const options = Array.isArray(props.data.options) ? props.data.options.map((item) => String(item)) : [];
</script>

<template>
  <section class="card">
    <header class="card-head">
      <span class="chip">Quiz</span>
      <h3>{{ title || "互动测验" }}</h3>
    </header>
    <p class="question">{{ question }}</p>
    <ol class="options">
      <li v-for="option in options" :key="option">{{ option }}</li>
    </ol>
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
  color: #818cf8;
  border: 1px solid rgba(129, 140, 248, 0.3);
  background: rgba(30, 27, 75, 0.5);
}
h3 {
  margin: 0;
  font-size: 1.02rem;
  color: #eff6ff;
}
.question {
  margin: 12px 0 12px;
  font-weight: 600;
  color: #e2e8f0;
}
.options {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
  color: #cbd5e1;
}
.options li::marker {
  color: #7dd3fc;
}
</style>
