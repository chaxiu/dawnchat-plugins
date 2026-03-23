<script setup lang="ts">
import { computed, ref } from "vue";

// @iwp.link views/pages/home.md::n.440f
const nameInput = ref("DawnChat");

const greetingText = computed(() => {
  // @iwp.link views/pages/home.md::n.8fa7
  const normalizedName = nameInput.value.trim() || "World";
  // @iwp.link views/pages/home.md::n.ac16
  return `Hello, ${normalizedName}!`;
});
</script>

<template>
  <section class="hello-page">
    <article class="hello-card">
      <p class="hello-badge">Desktop Hello World</p>
      <h1>{{ greetingText }}</h1>
      <p class="hello-tip">这是最小可运行的 Bun + Vue + IWP 桌面插件模板。</p>
      <label class="hello-label" for="name-input">Your name</label>
      <input id="name-input" v-model="nameInput" class="hello-input" placeholder="Type a name" />
      <!-- @iwp.link views/pages/home.md::n.ba0c -->
      <p class="hello-api-tip">后端接口：GET /api/hello?name=...</p>
    </article>
  </section>
</template>

<style scoped>
.hello-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 24px;
}

.hello-card {
  width: min(560px, 100%);
  padding: 24px;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.hello-badge {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
}

h1 {
  margin: 0;
  font-size: clamp(28px, 5vw, 36px);
  line-height: 1.2;
}

.hello-tip {
  margin: 12px 0 18px;
  color: #334155;
}

.hello-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #334155;
}

.hello-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #94a3b8;
  border-radius: 10px;
  font-size: 14px;
}

.hello-input:focus {
  outline: 2px solid #bfdbfe;
  outline-offset: 2px;
  border-color: #3b82f6;
}

.hello-api-tip {
  margin: 14px 0 0;
  font-size: 13px;
  color: #475569;
}
</style>
