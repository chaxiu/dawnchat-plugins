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
    <h3>{{ title || "词汇讲解" }}</h3>
    <p class="primary">{{ word }}</p>
    <p class="muted">{{ meaning }}</p>
    <ul v-if="etymology.length > 0">
      <li v-for="item in etymology" :key="item">{{ item }}</li>
    </ul>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  background: #fff;
}
.primary {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 4px 0;
}
.muted {
  color: #475569;
  margin: 0 0 10px;
}
ul {
  margin: 0;
  padding-left: 18px;
}
</style>
