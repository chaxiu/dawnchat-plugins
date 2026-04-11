<script setup lang="ts">
import { computed } from "vue";
import { listViewRegistrations } from "@dawnchat/assistant-core/view";

import { loadProviderConfig } from "../../features/provider/providerStorage";
import { getMobileAssistantIdentity } from "../../runtime/assistantIdentity";
import { ROUTE_PATHS } from "../../router/routes";
import { MOBILE_ASSISTANT_HOME_VIEW_ID } from "./mobileAssistantHome.view";

const providerConfig = loadProviderConfig();
const identity = getMobileAssistantIdentity();

const configuredProviderLabel = computed(() => {
  if (!providerConfig.apiKey.trim()) {
    return "Provider not configured";
  }
  return `${providerConfig.provider} · ${providerConfig.modelId}`;
});

const sampleViews = computed(() =>
  listViewRegistrations().filter((registration) => registration.view_id !== MOBILE_ASSISTANT_HOME_VIEW_ID)
);
</script>

<template>
  <section class="home">
    <div class="home-scroll">
      <p class="home-lead">
        Chat lives in the shell panel (side column on wide screens, bottom sheet on narrow). Runtime tools can
        list views, open scenes, and describe state.
      </p>

      <dl class="home-meta">
        <div class="home-meta__row">
          <dt>Provider</dt>
          <dd>{{ configuredProviderLabel }}</dd>
        </div>
        <div class="home-meta__row">
          <dt>Instance</dt>
          <dd><code>{{ identity.assistantInstanceId }}</code></dd>
        </div>
        <div class="home-meta__row">
          <dt>Session</dt>
          <dd><code>{{ identity.sessionId }}</code></dd>
        </div>
      </dl>

      <h2 class="home-h2">Quick tips</h2>
      <ul class="home-list">
        <li><code>assistant.view.list</code> — catalog of scenes</li>
        <li><code>view.open</code> — navigate the stack to a view</li>
        <li><code>assistant.view.describe</code> — inspect active state</li>
      </ul>

      <h2 class="home-h2">Navigation</h2>
      <ul class="home-links">
        <li>
          <RouterLink class="home-link" :to="ROUTE_PATHS.welcome">
            <span class="home-link__title">Idle — orb welcome</span>
            <span class="home-link__id">{{ ROUTE_PATHS.welcome }}</span>
          </RouterLink>
        </li>
        <li v-for="registration in sampleViews" :key="registration.view_id">
          <RouterLink class="home-link" :to="registration.route.full_path">
            <span class="home-link__title">{{ registration.title }}</span>
            <span class="home-link__id">{{ registration.view_id }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.home {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.home-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 18px 20px;
  -webkit-overflow-scrolling: touch;
}

.home-lead {
  margin: 0 0 16px;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.home-meta {
  margin: 0 0 20px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  display: grid;
  gap: 10px;
}

.home-meta__row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
  font-size: 0.85rem;
}

.home-meta dt {
  margin: 0;
  color: var(--text-muted);
  font-weight: 500;
}

.home-meta dd {
  margin: 0;
  color: var(--text-primary);
  word-break: break-word;
}

.home-meta code {
  font-size: 0.8rem;
}

.home-h2 {
  margin: 0 0 10px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.home-list {
  margin: 0 0 20px;
  padding-left: 1.1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.65;
}

.home-list code {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.home-links {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  text-decoration: none;
  color: inherit;
  transition: border-color 140ms ease, background 140ms ease;
}

.home-link:hover {
  border-color: color-mix(in srgb, var(--primary) 28%, var(--border));
  background: var(--bg-primary);
}

.home-link__title {
  font-weight: 600;
  font-size: 0.92rem;
}

.home-link__id {
  font-size: 0.78rem;
  color: var(--text-muted);
  word-break: break-all;
}
</style>
