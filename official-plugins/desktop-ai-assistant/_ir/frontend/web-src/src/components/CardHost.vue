<script setup lang="ts">
import { computed } from "vue";

import { resolveCardComponent } from "../cards/registry";
import {
  GUIDE_STACK_BOTTOM,
  GUIDE_STACK_LEFT,
  GUIDE_STACK_MAX_WIDTH,
} from "../runtime/assistantUiLayout";
import type { AssistantCardPayload } from "../cards/types";
import type { GuideNarrationState, GuideTipPayload } from "../runtime/guide/state";

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

const hostStyle = computed(() => ({
  left: `${GUIDE_STACK_LEFT}px`,
  bottom: `${GUIDE_STACK_BOTTOM}px`,
  width: `min(${GUIDE_STACK_MAX_WIDTH}px, calc(100vw - 32px))`,
}));
</script>

<template>
  <section v-if="hasVisibleGuideUi" class="host" :style="hostStyle">
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
  z-index: 7;
  display: grid;
  gap: 10px;
  pointer-events: none;
}
.narration-banner,
.tip-banner,
.card-item {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(186, 230, 253, 0.22);
  background: rgba(15, 23, 42, 0.68);
  backdrop-filter: blur(9px);
  color: #f0f9ff;
  box-shadow: 0 10px 26px rgba(2, 6, 23, 0.32);
  pointer-events: auto;
}
.narration-banner {
  border-color: rgba(129, 140, 248, 0.36);
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
  background: rgba(15, 23, 42, 0.86);
}
.card-item :deep(.card) {
  min-height: 0;
}
</style>
