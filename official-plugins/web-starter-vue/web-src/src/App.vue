<script setup lang="ts">
import { computed } from 'vue'

const templatePluginId = 'com.dawnchat.web-starter-vue'
const params = new URLSearchParams(window.location.search)

const language = computed(() => params.get('lang') || 'en')
const theme = computed(() => params.get('theme') || 'dark')
const themeLabel = computed(() => (theme.value === 'light' ? 'Light' : 'Dark'))
</script>

<template>
  <main class="app-shell" :data-theme="theme">
    <section class="hero-card">
      <p class="eyebrow">DawnChat Web Starter</p>
      <h1>Build your web app with natural language.</h1>
      <p class="summary">
        This starter is a pure frontend Vue workspace. Edit
        <code>web-src/src/App.vue</code> or add components under
        <code>web-src/src/components</code> to iterate quickly.
      </p>
      <div class="badge-row">
        <span class="badge">Plugin: {{ templatePluginId }}</span>
        <span class="badge">Theme: {{ themeLabel }}</span>
        <span class="badge">Lang: {{ language }}</span>
      </div>
    </section>

    <section class="content-grid">
      <article class="content-card">
        <h2>Suggested next steps</h2>
        <ul>
          <li>Replace the hero content with your product story.</li>
          <li>Create reusable UI in <code>src/components</code>.</li>
          <li>Move page state into composables or stores as the app grows.</li>
        </ul>
      </article>

      <article class="content-card">
        <h2>Why this template</h2>
        <ul>
          <li>TypeScript-first Vue 3 setup.</li>
          <li>Vite dev server for instant preview hot updates.</li>
          <li>Works with DawnChat inspector and coding agent out of the box.</li>
        </ul>
      </article>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 40px 24px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.2), transparent 30%),
    linear-gradient(180deg, #0f172a, #111827 45%, #020617);
  color: #f8fafc;
  font-family:
    Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.app-shell[data-theme='light'] {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 30%),
    linear-gradient(180deg, #f8fafc, #e2e8f0 55%, #cbd5e1);
  color: #0f172a;
}

.hero-card,
.content-card {
  max-width: 1120px;
  margin: 0 auto;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(16px);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
}

.app-shell[data-theme='light'] .hero-card,
.app-shell[data-theme='light'] .content-card {
  background: rgba(255, 255, 255, 0.82);
}

.hero-card {
  padding: 40px;
}

.eyebrow {
  margin: 0 0 12px;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #93c5fd;
}

h1 {
  margin: 0;
  font-size: clamp(2.6rem, 6vw, 4.6rem);
  line-height: 1.05;
}

.summary {
  max-width: 720px;
  margin: 18px 0 0;
  font-size: 1.05rem;
  line-height: 1.7;
  color: rgba(226, 232, 240, 0.92);
}

.app-shell[data-theme='light'] .summary {
  color: rgba(15, 23, 42, 0.72);
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  color: inherit;
  font-size: 0.92rem;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  max-width: 1120px;
  margin: 24px auto 0;
}

.content-card {
  padding: 28px;
}

.content-card h2 {
  margin: 0 0 16px;
  font-size: 1.35rem;
}

.content-card ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.8;
  color: rgba(226, 232, 240, 0.9);
}

.app-shell[data-theme='light'] .content-card ul {
  color: rgba(15, 23, 42, 0.72);
}

code {
  padding: 0.1rem 0.35rem;
  border-radius: 0.4rem;
  background: rgba(15, 23, 42, 0.22);
}

@media (max-width: 720px) {
  .app-shell {
    padding: 24px 16px;
  }

  .hero-card,
  .content-card {
    border-radius: 20px;
  }

  .hero-card {
    padding: 28px 22px;
  }
}
</style>

<style>
html,
body,
#app {
  min-height: 100%;
}

body {
  margin: 0;
}
</style>
