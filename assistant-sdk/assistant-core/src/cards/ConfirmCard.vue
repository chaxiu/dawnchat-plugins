<script setup lang="ts">
import { computed, ref } from "vue";

import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../runtime/events";
import { emitAssistantRuntimeEvent } from "../runtime/runtimeEventBridge";

const props = defineProps<{
  title?: string;
  data: Record<string, unknown>;
}>();
const emit = defineEmits<{
  completed: [{ reason?: string; dismiss_after_ms?: number }];
}>();

const question = String(props.data.question || props.data.message || "");
const confirmId = String(props.data.confirm_id || props.data.id || "confirm-card");
const sessionId = String(props.data.session_id || "");
const stepId = String(props.data.step_id || "");
const confirmLabel = String(props.data.confirm_label || "确认");
const cancelLabel = String(props.data.cancel_label || "取消");
const responded = ref<"confirmed" | "cancelled" | "">("");

const responseLabel = computed(() => {
  if (responded.value === "confirmed") {
    return confirmLabel;
  }
  if (responded.value === "cancelled") {
    return cancelLabel;
  }
  return "";
});

function respond(confirmed: boolean) {
  if (responded.value) {
    return;
  }
  responded.value = confirmed ? "confirmed" : "cancelled";
  emitAssistantRuntimeEvent({
    type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_CONFIRM_RESPONDED,
    source: "guide",
    session_id: sessionId || undefined,
    step_id: stepId || undefined,
    payload: {
      confirm_id: confirmId,
      question,
      confirmed,
      response: responded.value,
    },
  });
  emit("completed", {
    reason: "confirm_responded",
    dismiss_after_ms: 1800,
  });
}
</script>

<template>
  <section class="card">
    <header class="card-head">
      <span class="chip">Confirm</span>
      <h3>{{ title || "需要确认" }}</h3>
    </header>
    <p class="question">{{ question }}</p>
    <footer class="actions">
      <button
        type="button"
        class="confirm-btn confirm-btn--primary"
        @click="respond(true)"
      >
        {{ confirmLabel }}
      </button>
      <button
        type="button"
        class="confirm-btn confirm-btn--secondary"
        @click="respond(false)"
      >
        {{ cancelLabel }}
      </button>
      <p v-if="responded" class="response-note">
        已响应：{{ responseLabel }}
      </p>
    </footer>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  padding: 14px 16px 16px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.7));
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.16);
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
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  background: rgba(8, 47, 73, 0.45);
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
  line-height: 1.5;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.confirm-btn {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
}
.confirm-btn:hover:enabled {
  transform: translateY(-1px);
}
.confirm-btn--primary {
  background: linear-gradient(135deg, #38bdf8, #22c55e);
  color: #0f172a;
}
.confirm-btn--secondary {
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: #e2e8f0;
}
.confirm-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.response-note {
  margin: 0;
  color: #c7d2fe;
  font-size: 0.92rem;
}
</style>
