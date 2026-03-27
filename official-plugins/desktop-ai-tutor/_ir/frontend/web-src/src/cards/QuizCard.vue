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
    <h3>{{ title || "互动测验" }}</h3>
    <p class="question">{{ question }}</p>
    <ol>
      <li v-for="option in options" :key="option">{{ option }}</li>
    </ol>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  background: #fff;
}
.question {
  margin: 6px 0 10px;
  font-weight: 600;
}
ol {
  margin: 0;
  padding-left: 18px;
}
</style>
