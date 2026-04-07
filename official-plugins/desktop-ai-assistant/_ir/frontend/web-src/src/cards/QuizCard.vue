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

const question = String(props.data.question || "");
const options = Array.isArray(props.data.options) ? props.data.options.map((item) => String(item)) : [];
const quizId = String(props.data.quiz_id || props.data.id || "quiz-card");
const sessionId = String(props.data.session_id || "");
const stepId = String(props.data.step_id || "");
const selectedOption = ref("");
const submittedOption = ref("");

const canSubmit = computed(() => {
  return selectedOption.value.length > 0 && submittedOption.value.length === 0;
});

function selectOption(option: string) {
  if (submittedOption.value) {
    return;
  }
  selectedOption.value = option;
}

function submitAnswer() {
  if (!canSubmit.value) {
    return;
  }
  submittedOption.value = selectedOption.value;
  emitAssistantRuntimeEvent({
    type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
    source: "guide",
    session_id: sessionId || undefined,
    step_id: stepId || undefined,
    payload: {
      quiz_id: quizId,
      question,
      selected_option: submittedOption.value,
    },
  });
  emit("completed", {
    reason: "quiz_submitted",
    dismiss_after_ms: 1800,
  });
}
</script>

<template>
  <section class="card">
    <header class="card-head">
      <span class="chip">Quiz</span>
      <h3>{{ title || "互动测验" }}</h3>
    </header>
    <p class="question">{{ question }}</p>
    <ol class="options">
      <li v-for="option in options" :key="option">
        <button
          type="button"
          class="option-btn"
          :class="{ 'option-btn--selected': selectedOption === option, 'option-btn--submitted': submittedOption === option }"
          @click="selectOption(option)"
        >
          {{ option }}
        </button>
      </li>
    </ol>
    <footer class="actions">
      <button
        type="button"
        class="submit-btn"
        :disabled="!canSubmit"
        @click="submitAnswer"
      >
        {{ submittedOption ? "已提交" : "提交答案" }}
      </button>
      <p v-if="submittedOption" class="submitted-note">
        已提交：{{ submittedOption }}
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
  color: #818cf8;
  border: 1px solid rgba(129, 140, 248, 0.3);
  background: rgba(30, 27, 75, 0.5);
}
h3 {
  margin: 0;
  font-size: 1.02rem;
  color: #eff6ff;
}
.question {
  margin: 12px 0 10px;
  font-weight: 600;
  color: #e2e8f0;
}
.options {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
}
.options li::marker {
  color: #7dd3fc;
}
.option-btn {
  width: 100%;
  text-align: left;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.55);
  color: #cbd5e1;
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}
.option-btn:hover:enabled,
.option-btn--selected {
  border-color: rgba(103, 232, 249, 0.4);
  background: rgba(8, 47, 73, 0.62);
  color: #f0f9ff;
}
.option-btn--submitted {
  border-color: rgba(74, 222, 128, 0.34);
  background: rgba(20, 83, 45, 0.46);
  color: #dcfce7;
}
.option-btn:disabled {
  cursor: default;
}
.actions {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}
.submit-btn {
  width: fit-content;
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  color: #0f172a;
  font-weight: 700;
  cursor: pointer;
}
.submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.submitted-note {
  margin: 0;
  color: #c7d2fe;
  font-size: 0.92rem;
}
</style>
