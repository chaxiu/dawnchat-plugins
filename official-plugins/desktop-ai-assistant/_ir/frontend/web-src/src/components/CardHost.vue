<script setup lang="ts">
import { computed } from "vue";

import { resolveCardComponent } from "../cards/registry";
import type { AssistantCardPayload } from "../cards/types";
import type { GuideNarrationState, GuideTipPayload } from "../runtime/guideState";

const props = defineProps<{
  card: AssistantCardPayload | null;
  tip?: GuideTipPayload | null;
  narration?: GuideNarrationState | null;
}>();

const activeCanvasCard = computed(() => {
  if (!props.card) {
    return null;
  }
  return { ...props.card, component: resolveCardComponent(props.card.card_type) };
});

const activeNarration = computed(() => {
  if (!props.narration || props.narration.status === "idle") {
    return null;
  }
  return props.narration;
});

const hasVisibleGuideUi = computed(() => {
  return Boolean(activeCanvasCard.value || activeNarration.value || props.tip);
});
</script>

<template>
  <section v-if="hasVisibleGuideUi" class="host">
    <aside
      v-if="activeNarration"
      class="narration-banner"
      :data-status="activeNarration.status"
    >
      <strong>{{ activeNarration.status }}</strong>
      <span>{{ activeNarration.text }}</span>
      <small v-if="activeNarration.errorMessage">{{ activeNarration.errorMessage }}</small>
    </aside>
    <aside v-if="tip" class="tip-banner" :data-level="tip.level || 'info'">
      <strong v-if="tip.title">{{ tip.title }}</strong>
      <span>{{ tip.message }}</span>
    </aside>
    <article v-if="activeCanvasCard" class="card-item">
      <component
        :is="activeCanvasCard.component || 'div'"
        v-bind="activeCanvasCard.component ? { title: activeCanvasCard.title, data: activeCanvasCard.data } : {}"
      >
        <template v-if="!activeCanvasCard.component">
          Unsupported card type: {{ activeCanvasCard.card_type }}
        </template>
      </component>
    </article>
  </section>
</template>

<style scoped>
.host {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 4;
  width: min(360px, calc(100vw - 32px));
  display: grid;
  gap: 10px;
}
.narration-banner,
.tip-banner,
.card-item {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(103, 232, 249, 0.24);
  background: rgba(8, 47, 73, 0.58);
  color: #e0f2fe;
}
.narration-banner {
  border-color: rgba(129, 140, 248, 0.32);
  background: rgba(30, 41, 59, 0.72);
}
.narration-banner strong,
.tip-banner strong {
  font-size: 0.84rem;
  font-weight: 600;
  text-transform: uppercase;
}
.narration-banner span,
.tip-banner span {
  line-height: 1.5;
}
.narration-banner small {
  color: rgba(226, 232, 240, 0.8);
  line-height: 1.4;
}
.narration-banner[data-status="completed"] {
  border-color: rgba(74, 222, 128, 0.28);
  background: rgba(20, 83, 45, 0.4);
  color: #dcfce7;
}
.narration-banner[data-status="failed"],
.narration-banner[data-status="cancelled"] {
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(127, 29, 29, 0.42);
  color: #fee2e2;
}
.narration-banner[data-status="cancelling"] {
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(120, 53, 15, 0.42);
  color: #fef3c7;
}
.tip-banner[data-level="warning"] {
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(120, 53, 15, 0.42);
  color: #fef3c7;
}
.tip-banner[data-level="error"] {
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(127, 29, 29, 0.42);
  color: #fee2e2;
}
.tip-banner[data-level="success"] {
  border-color: rgba(74, 222, 128, 0.28);
  background: rgba(20, 83, 45, 0.4);
  color: #dcfce7;
}
.card-item {
  padding: 0;
  overflow: hidden;
  border-color: rgba(103, 232, 249, 0.28);
  background: rgba(15, 23, 42, 0.82);
}
.card-item :deep(.card) {
  min-height: 0;
}
</style>
