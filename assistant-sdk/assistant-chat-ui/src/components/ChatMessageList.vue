<template>
  <div ref="messageListRef" class="message-list" @scroll="handleScroll">
    <div v-if="presentedTimelineItems.length === 0 && !props.isStreaming" class="empty-tip">
      {{ mergedLabels.emptyText }}
    </div>

    <template v-for="timeline in presentedTimelineItems" :key="timeline.id">
      <div v-if="timeline.kind === 'part'" class="msg-item-row" :class="timeline.role === 'user' ? 'user' : 'assistant-flat'">
        <template v-if="timeline.role === 'user'">
          <span class="msg-role">{{ mergedLabels.userLabel }}</span>
          <div class="msg-item">
            <ChatMessagePartRenderer
              :item="timeline.item"
              :reasoning-expanded="isReasoningExpanded(timeline.item.id, timeline.item.isStreaming)"
              :tool-input-aria-label="mergedLabels.toolInputAriaLabel"
              :tool-input-title="mergedLabels.toolInputTitle"
              :tool-name-label="mergedLabels.toolNameLabel"
              @toggle-reasoning="toggleReasoning(timeline.item.id, timeline.item.isStreaming)"
            />
          </div>
        </template>
        <template v-else>
          <ChatMessagePartRenderer
            :item="timeline.item"
            :reasoning-expanded="isReasoningExpanded(timeline.item.id, timeline.item.isStreaming)"
            :tool-input-aria-label="mergedLabels.toolInputAriaLabel"
            :tool-input-title="mergedLabels.toolInputTitle"
            :tool-name-label="mergedLabels.toolNameLabel"
            @toggle-reasoning="toggleReasoning(timeline.item.id, timeline.item.isStreaming)"
          />
        </template>
      </div>

      <ChatQuestionCard
        v-else-if="timeline.kind === 'question'"
        :question="timeline.question"
        :agent-label="mergedLabels.assistantLabel"
        :question-required-label="mergedLabels.questionRequiredLabel"
        :question-label="mergedLabels.questionLabel"
        :custom-answer-label="mergedLabels.customAnswerLabel"
        :submit-label="mergedLabels.submitLabel"
        :reject-label="mergedLabels.rejectLabel"
        @question-reply="(requestID, answers) => emit('question-reply', requestID, answers)"
        @question-reject="(requestID) => emit('question-reject', requestID)"
      />

      <ChatPermissionCard
        v-else-if="timeline.kind === 'permission'"
        :permission="timeline.permission"
        :agent-label="mergedLabels.assistantLabel"
        :permission-required-label="mergedLabels.permissionRequiredLabel"
        :allow-once-label="mergedLabels.allowOnceLabel"
        :always-allow-label="mergedLabels.alwaysAllowLabel"
        :reject-label="mergedLabels.rejectLabel"
        @permission="(id, response, remember) => emit('permission', id, response, remember)"
      />

      <div v-else-if="timeline.kind === 'todo'" class="todo-timeline-item" :class="{ pinned: isScrollingDown }">
        <ChatTodoDock
          :todos="timeline.todos"
          :title="mergedLabels.todoTitle"
          :collapse-label="mergedLabels.todoCollapseLabel"
          :expand-label="mergedLabels.todoExpandLabel"
        />
      </div>
    </template>

    <ChatAssistantWaiting
      :timeline-items="props.timelineItems"
      :is-streaming="props.isStreaming"
      :has-pending-playback="hasPendingPlayback"
      :text="waitingText"
      :waiting-reason="props.waitingReason"
    />
    <div v-if="showPlanQuickSwitch" class="plan-quick-switch">
      <span class="plan-quick-switch-tip">{{ mergedLabels.planQuickSwitchTip }}</span>
      <button class="plan-quick-switch-btn" type="button" @click="emit('switch-to-build')">
        {{ mergedLabels.planSwitchLabel }}
      </button>
    </div>
    <div v-if="lastError" class="error-tip">
      <div class="error-summary">{{ lastError }}</div>
      <details v-if="showErrorDetails" class="error-details">
        <summary>{{ mergedLabels.errorDetailToggle }}</summary>
        <pre>{{ props.lastErrorRaw }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import {
  DEFAULT_CHAT_MESSAGE_LIST_LABELS,
  type ChatMessageListLabels,
  type ChatTimelineItem,
  type ChatWaitingReason,
} from "../types";
import { useStreamingPresentation } from "../useStreamingPresentation";
import ChatAssistantWaiting from "./ChatAssistantWaiting.vue";
import ChatMessagePartRenderer from "./ChatMessagePartRenderer.vue";
import ChatPermissionCard from "./ChatPermissionCard.vue";
import ChatQuestionCard from "./ChatQuestionCard.vue";
import ChatTodoDock from "./ChatTodoDock.vue";

const props = defineProps<{
  timelineItems: ChatTimelineItem[];
  activeReasoningItemId: string;
  isStreaming: boolean;
  waitingReason: ChatWaitingReason;
  canSwitchPlanToBuild: boolean;
  lastError: string | null;
  lastErrorRaw?: string | null;
  labels?: Partial<ChatMessageListLabels>;
}>();

const emit = defineEmits<{
  permission: [id: string, response: "once" | "always" | "reject", remember?: boolean];
  "question-reply": [requestID: string, answers: string[][]];
  "question-reject": [requestID: string];
  "switch-to-build": [];
}>();

const messageListRef = ref<HTMLElement | null>(null);
const reasoningExpanded = ref<Record<string, boolean>>({});
const shouldAutoScroll = ref(true);
const isScrollingDown = ref(false);
const lastScrollTop = ref(0);
const timelineItemsRef = computed(() => props.timelineItems);
const { presentedTimelineItems, hasPendingPlayback } = useStreamingPresentation(timelineItemsRef);

const mergedLabels = computed<ChatMessageListLabels>(() => ({
  ...DEFAULT_CHAT_MESSAGE_LIST_LABELS,
  ...(props.labels || {}),
}));

const waitingText = computed(() => {
  if (props.waitingReason === "waiting_permission") return mergedLabels.value.waitingPermissionText;
  if (props.waitingReason === "waiting_question") return mergedLabels.value.waitingQuestionText;
  if (props.waitingReason === "stalled") return mergedLabels.value.waitingStalledText;
  return mergedLabels.value.waitingGeneratingText || mergedLabels.value.streamingText;
});

const hasAssistantReply = computed(() => {
  return presentedTimelineItems.value.some((item) => {
    if (item.kind !== "part" || item.role === "user") return false;
    if (item.item.type === "text" || item.item.type === "reasoning") {
      return String(item.item.text || "").length > 0;
    }
    return true;
  });
});

const showPlanQuickSwitch = computed(() => {
  if (props.isStreaming) return false;
  return props.canSwitchPlanToBuild && hasAssistantReply.value;
});

const showErrorDetails = computed(() => {
  if (!props.lastError || !props.lastErrorRaw) return false;
  const readable = String(props.lastError).trim();
  const raw = String(props.lastErrorRaw).trim();
  return Boolean(raw) && raw !== readable;
});

const renderActivitySignature = computed(() => {
  const last = presentedTimelineItems.value[presentedTimelineItems.value.length - 1];
  if (!last) {
    return `empty:${props.isStreaming ? "1" : "0"}:${hasPendingPlayback.value ? "1" : "0"}`;
  }
  if (last.kind === "part") {
    return [
      "part",
      presentedTimelineItems.value.length,
      props.isStreaming ? "1" : "0",
      last.id,
      last.item.type,
      String(last.item.text || "").length,
      String(last.item.status || ""),
      last.item.isStreaming ? "1" : "0",
    ].join(":");
  }
  if (last.kind === "todo") {
    return [
      "todo",
      presentedTimelineItems.value.length,
      props.isStreaming ? "1" : "0",
      last.id,
      last.todos.length,
      last.todos.map((item) => `${item.id}:${item.status}`).join("|"),
    ].join(":");
  }
  if (last.kind === "permission") {
    return [
      "permission",
      presentedTimelineItems.value.length,
      props.isStreaming ? "1" : "0",
      last.id,
      last.permission.status,
    ].join(":");
  }
  return [
    "question",
    presentedTimelineItems.value.length,
    props.isStreaming ? "1" : "0",
    last.id,
    last.question.id,
  ].join(":");
});

const isReasoningExpanded = (id: string, isStreamingItem: boolean) => {
  if (isStreamingItem) return true;
  return Boolean(reasoningExpanded.value[id]);
};

const toggleReasoning = (id: string, isStreamingItem: boolean) => {
  if (isStreamingItem) return;
  reasoningExpanded.value[id] = !reasoningExpanded.value[id];
};

watch(
  () => props.activeReasoningItemId,
  (activeId) => {
    const nextState: Record<string, boolean> = {};
    if (activeId) {
      nextState[activeId] = true;
    }
    reasoningExpanded.value = nextState;
  }
);

watch(
  () => renderActivitySignature.value,
  async () => {
    await nextTick();
    const element = messageListRef.value;
    if (element && shouldAutoScroll.value) {
      element.scrollTop = element.scrollHeight;
    }
  }
);

const handleScroll = () => {
  const element = messageListRef.value;
  if (!element) return;
  const top = element.scrollTop;
  isScrollingDown.value = top > lastScrollTop.value;
  lastScrollTop.value = top;
  const distanceToBottom = element.scrollHeight - (element.scrollTop + element.clientHeight);
  shouldAutoScroll.value = distanceToBottom <= 72;
};
</script>

<style scoped>
.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--color-surface-1);
}

.empty-tip {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.msg-item-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.msg-item-row.user {
  align-items: flex-end;
}

.msg-item-row.assistant-flat {
  align-items: stretch;
}

.msg-role {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: 0 0.1rem;
}

.msg-item {
  max-width: 92%;
  min-width: 0;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
}

.msg-item-row.user .msg-item {
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface-2));
}

.todo-timeline-item {
  width: min(760px, 100%);
}

.todo-timeline-item.pinned {
  position: sticky;
  top: 0;
  z-index: 2;
}

.plan-quick-switch {
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-2));
}

.plan-quick-switch-tip {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.plan-quick-switch-btn {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-3);
  color: var(--color-text);
  height: 30px;
  padding: 0 0.65rem;
  font-size: 0.78rem;
  cursor: pointer;
}

.error-tip {
  color: #d9534f;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.error-summary {
  line-height: 1.35;
}

.error-details {
  color: color-mix(in srgb, #d9534f 90%, var(--color-text));
}

.error-details summary {
  cursor: pointer;
  user-select: none;
}

.error-details pre {
  margin: 0.35rem 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.35;
}
</style>
