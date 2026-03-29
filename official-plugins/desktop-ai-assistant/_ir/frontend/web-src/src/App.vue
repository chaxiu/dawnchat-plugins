<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

import { createCardCapabilityRegistrations } from "./cards/registry";
import { registerCapabilities, toAssistantCardPayload, unregisterCapabilities } from "./runtime/capabilities";
import { useAssistantCards } from "./runtime/assistantCards";

let registeredCapabilityNames: string[] = [];
const { appendCard: appendAssistantCard, clearCards: clearAssistantCards } = useAssistantCards();

const appendCard = (payload: Record<string, unknown>) => {
  const normalized = toAssistantCardPayload(payload);
  const count = appendAssistantCard(normalized);
  return {
    ok: true,
    data: {
      card_count: count,
    },
  };
};

const clearCards = () => {
  clearAssistantCards();
  return {
    ok: true,
    data: {
      card_count: 0,
    },
  };
};

onMounted(() => {
  const registrations = createCardCapabilityRegistrations({
    onRenderCard: async (payload) => appendCard(payload),
    onClearCards: async () => clearCards(),
  });
  const registrationResult = registerCapabilities(registrations);
  registeredCapabilityNames = registrationResult.registered;
});

onUnmounted(() => {
  unregisterCapabilities(registeredCapabilityNames);
  registeredCapabilityNames = [];
});
</script>

<template>
  <main class="assistant-shell">
    <div class="aurora aurora-a"></div>
    <div class="aurora aurora-b"></div>
    <header class="title-bar">
      <div class="title-wrap">
        <span class="eyebrow">Self-Evolving Assistant</span>
        <h1>Desktop AI Assistant</h1>
        <p>通过 MCP 实时编排卡片能力，构建可进化的智能助理体验</p>
        <nav class="route-nav">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/playground">Playground</RouterLink>
        </nav>
      </div>
      <section class="runtime-pill">
        <span class="runtime-dot"></span>
        <strong>Agent Runtime Active</strong>
      </section>
    </header>
    <RouterView />
  </main>
</template>

<style scoped>
.assistant-shell {
  position: relative;
  min-height: 100%;
  padding: 24px 0 36px;
  color: var(--text-primary);
  overflow: hidden;
}
.aurora {
  position: absolute;
  z-index: 0;
  border-radius: 999px;
  filter: blur(80px);
  opacity: 0.48;
  pointer-events: none;
}
.aurora-a {
  width: 380px;
  height: 380px;
  left: -120px;
  top: -140px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.56) 0%, rgba(14, 116, 144, 0) 72%);
}
.aurora-b {
  width: 320px;
  height: 320px;
  right: -110px;
  top: 70px;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.46) 0%, rgba(49, 46, 129, 0) 72%);
}
.title-bar {
  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 4px 16px 8px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}
.title-wrap {
  max-width: 620px;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--line-subtle);
  background: var(--surface-soft);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  backdrop-filter: blur(6px);
}
h1 {
  margin: 10px 0 0;
  font-size: clamp(1.8rem, 2.8vw, 2.45rem);
  letter-spacing: 0.01em;
  color: #eef6ff;
  text-shadow: 0 0 22px rgba(56, 189, 248, 0.22);
}
p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.55;
}
.route-nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}
.route-nav a {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line-subtle);
  color: #dbeafe;
  text-decoration: none;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}
.route-nav a.router-link-active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}
.runtime-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
  border: 1px solid var(--line-subtle);
  background: rgba(8, 20, 40, 0.72);
  padding: 8px 12px;
  color: #dbeafe;
  font-size: 0.84rem;
  backdrop-filter: blur(8px);
}
.runtime-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #22d3ee;
  box-shadow:
    0 0 0 4px rgba(34, 211, 238, 0.18),
    0 0 14px rgba(34, 211, 238, 0.6);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    transform: scale(0.9);
  }
  50% {
    transform: scale(1.06);
  }
}
@media (max-width: 760px) {
  .title-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
