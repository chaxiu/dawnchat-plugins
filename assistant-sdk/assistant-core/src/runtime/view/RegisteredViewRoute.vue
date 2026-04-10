<script setup lang="ts">
import { computed } from "vue";

import { getViewRegistration } from "./registry";
import ViewHost from "./ViewHost.vue";

const props = defineProps<{
  viewId: string;
}>();

const registration = computed(() => {
  const normalizedViewId = props.viewId.trim();
  if (!normalizedViewId) {
    return null;
  }
  return getViewRegistration(normalizedViewId);
});

const resolvedComponent = computed(() => registration.value?.component || null);
const shouldUseShadowDom = computed(() => registration.value?.render_mode === "shadow-dom");
</script>

<template>
  <ViewHost
    v-if="registration && resolvedComponent && shouldUseShadowDom"
    :component="resolvedComponent"
    :style-texts="registration.style_texts"
    :theme-vars="registration.theme_vars"
    :view-id="registration.view_id"
  />
  <component
    :is="resolvedComponent"
    v-else-if="registration && resolvedComponent"
  />
  <section v-else class="registered-view-route__missing">
    <p class="registered-view-route__title">View unavailable</p>
    <p class="registered-view-route__hint">
      The requested view registration could not be resolved.
    </p>
  </section>
</template>

<style scoped>
.registered-view-route__missing {
  width: 100%;
  min-height: 240px;
  height: 100%;
  display: grid;
  place-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  border: 1px dashed var(--border, #d1d5db);
  border-radius: 16px;
  background: var(--bg-primary, #fff);
  color: var(--text-secondary, #6b7280);
}

.registered-view-route__title {
  margin: 0;
  font-weight: 600;
  color: var(--text-primary, #111827);
}

.registered-view-route__hint {
  margin: 0;
  line-height: 1.5;
}
</style>
