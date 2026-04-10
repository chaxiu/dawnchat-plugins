<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import "@dawnchat/assistant-chat-ui/style.css";
import { ChatMessageList } from "@dawnchat/assistant-chat-ui";

import { useAssistantChat } from "../../features/chat/useAssistantChat";
import {
  getWebAssistantLabels,
  getWebAssistantWaitingReason,
  toWebAssistantTimelineItems,
} from "../../features/chat/webAssistantChatAdapter";
import { useProviderConfig } from "../../features/provider/useProviderConfig";

const {
  draftConfig,
  savedConfig,
  isConfigured,
  statusMessage,
  updateProvider,
  saveDraft,
  resetDraft,
  clearProviderConfig,
} = useProviderConfig();
const {
  prompt,
  transcript,
  isRunning,
  errorMessage,
  lastStopReason,
  submitPrompt,
  clearConversation,
} = useAssistantChat();

const settingsOpen = ref(false);
const toolbarRef = ref<HTMLElement | null>(null);
const settingsPanelRef = ref<HTMLElement | null>(null);

const isMobile = ref(false);
const messagesExpanded = ref(false);

function updateMobileFlag() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    isMobile.value = false;
    return;
  }
  isMobile.value = window.matchMedia("(max-width: 960px)").matches;
}

let mobileMediaQuery: MediaQueryList | null = null;

onMounted(() => {
  updateMobileFlag();
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    mobileMediaQuery = window.matchMedia("(max-width: 960px)");
    mobileMediaQuery.addEventListener("change", updateMobileFlag);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeydown);
  }
});

onUnmounted(() => {
  mobileMediaQuery?.removeEventListener("change", updateMobileFlag);
  if (typeof document !== "undefined") {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onDocumentKeydown);
  }
});

watch(
  isMobile,
  (next) => {
    if (!next) {
      messagesExpanded.value = true;
      return;
    }
    messagesExpanded.value = false;
  },
  { immediate: true }
);

function onDocumentClick(event: MouseEvent) {
  if (!settingsOpen.value) {
    return;
  }
  const target = event.target as Node | null;
  if (!target) {
    return;
  }
  if (toolbarRef.value?.contains(target) || settingsPanelRef.value?.contains(target)) {
    return;
  }
  settingsOpen.value = false;
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    settingsOpen.value = false;
  }
}

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value;
}

function toggleMessagesPanel() {
  messagesExpanded.value = !messagesExpanded.value;
}

const maskedApiKey = computed(() => {
  const apiKey = savedConfig.value.apiKey.trim();
  if (!apiKey) {
    return "Not configured";
  }
  if (apiKey.length <= 8) {
    return `${apiKey.slice(0, 2)}***`;
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
});

const timelineItems = computed(() =>
  toWebAssistantTimelineItems(transcript.value, {
    isRunning: isRunning.value,
  })
);
const messageListLabels = computed(() => getWebAssistantLabels());
const waitingReason = computed(() =>
  getWebAssistantWaitingReason({
    isRunning: isRunning.value,
    transcript: transcript.value,
  })
);

async function handleSubmit() {
  await submitPrompt(savedConfig.value);
}

async function copyDebugLogs() {
  if (typeof window === "undefined") {
    return;
  }
  const handle = window.__DAWNCHAT_WEB_ASSISTANT_DEBUG__;
  const logs = handle?.readChatLogs?.() || [];
  const payload = JSON.stringify({
    assistant_instance_id: handle?.assistantInstanceId || "",
    session_id: handle?.sessionId || "",
    storage_key: handle?.storageKey || "",
    count: logs.length,
    logs,
  }, null, 2);

  const fallbackCopy = () => {
    if (typeof document === "undefined") {
      return false;
    }
    const textarea = document.createElement("textarea");
    textarea.value = payload;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  };

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(payload);
      statusMessage.value = "Debug logs copied to clipboard.";
      return;
    }
  } catch (error) {
    // In iframe preview, clipboard can be blocked by Permissions Policy.
    console.warn("[web-assistant/chat] clipboard.writeText failed, try fallback copy", error);
  }

  try {
    if (fallbackCopy()) {
      statusMessage.value = "Debug logs copied to clipboard (fallback).";
      return;
    }
  } catch (error) {
    console.warn("[web-assistant/chat] fallback copy failed", error);
  }

  statusMessage.value =
    "Clipboard is blocked in preview. Use window.__DAWNCHAT_WEB_ASSISTANT_DEBUG__.readChatLogs() in iframe console.";
}
</script>

<template>
  <section class="chat-panel">
    <div ref="toolbarRef" class="chat-toolbar">
      <div class="chat-toolbar__title">
        <span class="chat-toolbar__label">Chat</span>
        <span
          class="chat-toolbar__status"
          :data-ready="isConfigured"
          :title="isConfigured ? 'Provider ready' : 'Configure provider in settings'"
        />
      </div>
      <div class="chat-toolbar__actions">
        <button
          v-if="isMobile"
          type="button"
          class="chat-toolbar__btn"
          data-testid="messages-toggle"
          :aria-expanded="messagesExpanded"
          @click="toggleMessagesPanel"
        >
          {{ messagesExpanded ? "Hide messages" : "Messages" }}
        </button>
        <button
          type="button"
          class="chat-toolbar__btn chat-toolbar__btn--icon"
          data-testid="chat-settings-trigger"
          aria-label="Open chat settings"
          :aria-expanded="settingsOpen"
          @click.stop="toggleSettings"
        >
          <span class="chat-toolbar__gear" aria-hidden="true" />
        </button>
      </div>

      <div
        v-show="settingsOpen"
        ref="settingsPanelRef"
        class="settings-popover"
        role="dialog"
        aria-label="Chat settings"
        @click.stop
      >
        <header class="settings-popover__head">
          <div>
            <p class="settings-popover__eyebrow">Settings</p>
            <h2 class="settings-popover__title">Model &amp; status</h2>
          </div>
          <span class="status-chip" :data-ready="isConfigured">
            {{ isConfigured ? "Ready" : "Needs API key" }}
          </span>
        </header>

        <section class="settings-popover__section">
          <h3 class="settings-popover__section-title">Saved</h3>
          <div class="settings-meta">
            <span>{{ savedConfig.provider }}</span>
            <span>{{ savedConfig.modelId }}</span>
            <span>{{ maskedApiKey }}</span>
          </div>
          <p v-if="lastStopReason" class="settings-meta settings-meta--muted">
            Last stop: {{ lastStopReason }}
          </p>
        </section>

        <section class="settings-popover__section">
          <h3 class="settings-popover__section-title">Provider</h3>
          <div class="form-grid">
            <label class="field">
              <span>Provider</span>
              <select
                data-testid="provider-select"
                :value="draftConfig.provider"
                @change="updateProvider(($event.target as HTMLSelectElement).value as 'openai' | 'gemini')"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </label>

            <label class="field">
              <span>Model ID</span>
              <input v-model="draftConfig.modelId" type="text" placeholder="Model id" />
            </label>

            <label class="field field--full">
              <span>API key</span>
              <input v-model="draftConfig.apiKey" type="password" placeholder="API key" />
            </label>

            <label v-if="draftConfig.provider === 'openai'" class="field field--full">
              <span>Base URL (optional)</span>
              <input v-model="draftConfig.baseURL" type="text" placeholder="https://api.openai.com/v1" />
            </label>
          </div>

          <div class="action-row">
            <button data-testid="save-provider-button" type="button" @click="saveDraft">Save locally</button>
            <button type="button" class="ghost" @click="resetDraft">Reset draft</button>
            <button type="button" class="ghost danger" @click="clearProviderConfig">Clear saved</button>
          </div>
          <p v-if="statusMessage" class="status-message">{{ statusMessage }}</p>
        </section>

        <section class="settings-popover__section">
          <h3 class="settings-popover__section-title">Conversation</h3>
          <button type="button" class="ghost full-width" @click="clearConversation">Clear chat history</button>
          <button type="button" class="ghost full-width" @click="copyDebugLogs">Copy debug logs</button>
        </section>
      </div>
    </div>

    <div
      class="message-region"
      :data-collapsed="isMobile && !messagesExpanded"
      :aria-hidden="isMobile && !messagesExpanded"
    >
      <ChatMessageList
        :timeline-items="timelineItems"
        :active-reasoning-item-id="''"
        :is-streaming="isRunning"
        :waiting-reason="waitingReason"
        :can-switch-plan-to-build="false"
        :last-error="errorMessage || null"
        :labels="messageListLabels"
      />
    </div>

    <div class="input-region">
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <form data-testid="chat-form" class="composer" @submit.prevent="handleSubmit">
        <textarea
          data-testid="chat-prompt"
          v-model="prompt"
          rows="3"
          class="composer__textarea"
          placeholder="Message the assistant…"
          :disabled="isRunning"
        />
        <div class="composer__actions">
          <button data-testid="submit-prompt-button" type="submit" :disabled="isRunning">
            {{ isRunning ? "Running…" : "Send" }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.chat-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}

.chat-toolbar {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-primary);
  z-index: 2;
}

.chat-toolbar__title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.chat-toolbar__label {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.chat-toolbar__status {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--warning);
  flex-shrink: 0;
}

.chat-toolbar__status[data-ready="true"] {
  background: var(--success);
}

.chat-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-toolbar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
}

.chat-toolbar__btn--icon {
  width: 40px;
  height: 40px;
  padding: 0;
}

.chat-toolbar__gear {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid var(--text-secondary);
  position: relative;
}

.chat-toolbar__gear::after {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 999px;
  border: 2px solid var(--text-secondary);
}

.settings-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 12px;
  left: 12px;
  max-height: min(70vh, 520px);
  overflow: auto;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
  z-index: 30;
}

.settings-popover__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.settings-popover__eyebrow {
  margin: 0 0 6px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
}

.settings-popover__title {
  margin: 0;
  font-size: 1.05rem;
}

.settings-popover__section {
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--border);
}

.settings-popover__section-title {
  margin: 0 0 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.settings-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.settings-meta span {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
}

.settings-meta--muted {
  color: var(--text-secondary);
  margin-top: 8px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 0.8rem;
  color: var(--warning);
}

.status-chip[data-ready="true"] {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 35%, var(--border));
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.field--full {
  grid-column: 1 / -1;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.full-width {
  width: 100%;
}

.status-message {
  margin: 10px 0 0;
  font-size: 0.85rem;
  color: var(--primary);
}

.message-region {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-region[data-collapsed="true"] {
  flex: 0 0 0;
  max-height: 0;
  min-height: 0;
  overflow: hidden;
  border: none;
}

.message-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-row {
  display: flex;
  width: 100%;
}

.message-row[data-role="user"] {
  justify-content: flex-end;
}

.message-row[data-role="assistant"] {
  justify-content: flex-start;
}

.message-bubble {
  width: min(100%, 92%);
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  box-shadow: var(--shadow-sm);
}

.message-row[data-role="user"] .message-bubble {
  background: color-mix(in srgb, var(--primary) 14%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--primary) 28%, var(--border));
}

.message-row[data-role="assistant"] .message-bubble {
  border-color: color-mix(in srgb, var(--primary) 22%, var(--border));
}

.message-bubble__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.message-bubble__author {
  font-weight: 600;
  color: var(--text-primary);
}

.message-bubble__meta {
  color: var(--text-muted);
}

.message-bubble__text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);
}

.message-tool-calls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.message-tool-calls__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
  background: color-mix(in srgb, var(--bg-elevated) 86%, var(--primary) 14%);
}

.message-tool-calls__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
}

.message-tool-calls__args {
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
}

.tool-step-card {
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--success) 26%, var(--border));
  background: color-mix(in srgb, var(--success) 7%, var(--bg-secondary));
}

.tool-step-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.tool-step-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--success) 14%, var(--bg-primary));
  color: var(--success);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tool-step-card__status {
  margin-left: auto;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.tool-step-card__content {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);
}

.typing-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
}

.typing-state span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--text-muted);
  opacity: 0.5;
  animation: typingPulse 1s ease-in-out infinite;
}

.typing-state span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-state span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typingPulse {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.empty-state {
  margin: auto;
  text-align: center;
  padding: 24px 12px;
  color: var(--text-secondary);
}

.empty-state__title {
  margin: 0 0 6px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state__hint {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
}

.input-region {
  flex: 0 0 auto;
  border-top: 1px solid var(--border);
  background: var(--bg-primary);
  padding: 12px 14px 14px;
}

.error-message {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--danger);
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.composer__textarea {
  width: 100%;
  resize: none;
  min-height: 72px;
  max-height: 160px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.composer__textarea::placeholder {
  color: var(--text-muted);
}

.composer__actions {
  display: flex;
  justify-content: flex-end;
}

.composer__actions button {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border));
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.composer__actions button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

input,
select,
textarea,
button {
  font: inherit;
}

input,
select,
textarea,
button.ghost {
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

input,
select {
  padding: 8px 10px;
}

button.ghost {
  padding: 8px 12px;
  cursor: pointer;
  background: var(--bg-secondary);
}

button.ghost.danger {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 35%, var(--border));
}

@media (min-width: 961px) {
  .settings-popover {
    left: auto;
    width: min(380px, calc(100vw - 48px));
  }
}
</style>
