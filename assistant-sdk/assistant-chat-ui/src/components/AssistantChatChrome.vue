<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import type { SettingsField } from "../types/assistantSettingsForm";
import type { AssistantChatChromeLabels, AssistantChatSavedConfigSummary } from "../types/assistantChrome";
import type { ChatMessageListLabels, ChatTimelineItem, ChatWaitingReason } from "../types";

import AssistantChatSettingsFields from "./AssistantChatSettingsFields.vue";
import ChatMessageList from "./ChatMessageList.vue";

const props = withDefaults(
  defineProps<{
    labels: AssistantChatChromeLabels;
    providerFields: SettingsField[];
    isMobile: boolean;
    /** When false on mobile, only the bottom dock (expand + single-line input) is shown. Desktop ignores this. */
    mobileSheetExpanded?: boolean;
    settingsOpen: boolean;
    isConfigured: boolean;
    isRunning: boolean;
    errorMessage: string;
    statusMessage: string;
    lastStopReason: string;
    savedConfig: AssistantChatSavedConfigSummary;
    maskedApiKey: string;
    draftConfig: Record<string, unknown>;
    prompt: string;
    timelineItems: ChatTimelineItem[];
    messageListLabels: ChatMessageListLabels;
    waitingReason: ChatWaitingReason;
    canSwitchPlanToBuild?: boolean;
  }>(),
  {
    canSwitchPlanToBuild: false,
    mobileSheetExpanded: true,
  },
);

const emit = defineEmits<{
  "update:prompt": [value: string];
  "update:settingsOpen": [open: boolean];
  "toggle-settings": [];
  submit: [];
  "update:draft-config": [patch: Record<string, unknown>];
  "change-provider": [provider: string];
  "save-draft": [];
  "reset-draft": [];
  "clear-saved": [];
  "clear-conversation": [];
  "copy-debug-logs": [];
  "expand-mobile-sheet": [];
}>();

const showFullChrome = computed(
  () => !props.isMobile || props.mobileSheetExpanded,
);

const toolbarRef = ref<HTMLElement | null>(null);
const settingsPanelRef = ref<HTMLElement | null>(null);

function onDocumentClick(event: MouseEvent) {
  if (!props.settingsOpen) {
    return;
  }
  const target = event.target as Node | null;
  if (!target) {
    return;
  }
  if (toolbarRef.value?.contains(target) || settingsPanelRef.value?.contains(target)) {
    return;
  }
  emit("update:settingsOpen", false);
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.settingsOpen) {
    emit("update:settingsOpen", false);
  }
}

onMounted(() => {
  if (typeof document !== "undefined") {
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeydown);
  }
});

onUnmounted(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onDocumentKeydown);
  }
});

function onPromptInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null;
  if (!target) {
    return;
  }
  emit("update:prompt", target.value);
}

function onDockPromptInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (!target) {
    return;
  }
  emit("update:prompt", target.value);
}

function onSubmit() {
  emit("submit");
}

function onExpandSheet() {
  emit("expand-mobile-sheet");
}
</script>

<template>
  <section
    class="chat-panel"
    :class="{ 'chat-panel--mobile-collapsed': isMobile && !mobileSheetExpanded }"
  >
    <template v-if="showFullChrome">
      <div ref="toolbarRef" class="chat-toolbar">
        <div class="chat-toolbar__title">
          <span class="chat-toolbar__label">{{ labels.toolbarTitle }}</span>
          <span
            class="chat-toolbar__status"
            :data-ready="isConfigured"
            :title="isConfigured ? labels.providerReadyTitle : labels.providerNotReadyTitle"
          />
        </div>
        <div class="chat-toolbar__actions">
          <button
            type="button"
            class="chat-toolbar__btn chat-toolbar__btn--icon"
            data-testid="chat-settings-trigger"
            :aria-label="labels.settingsAriaLabel"
            :aria-expanded="settingsOpen"
            @click.stop="emit('toggle-settings')"
          >
            <span class="chat-toolbar__gear" aria-hidden="true" />
          </button>
        </div>

        <div
          v-show="settingsOpen"
          ref="settingsPanelRef"
          class="settings-popover"
          role="dialog"
          :aria-label="labels.settingsDialogAriaLabel"
          @click.stop
        >
          <header class="settings-popover__head">
            <div>
              <p class="settings-popover__eyebrow">{{ labels.settingsEyebrow }}</p>
              <h2 class="settings-popover__title">{{ labels.settingsTitle }}</h2>
            </div>
            <span class="status-chip" :data-ready="isConfigured">
              {{ isConfigured ? labels.statusReady : labels.statusNeedsKey }}
            </span>
          </header>

          <section class="settings-popover__section">
            <h3 class="settings-popover__section-title">{{ labels.sectionSaved }}</h3>
            <div class="settings-meta">
              <span>{{ savedConfig.provider }}</span>
              <span>{{ savedConfig.modelId }}</span>
              <span>{{ maskedApiKey }}</span>
            </div>
            <p v-if="lastStopReason" class="settings-meta settings-meta--muted">
              {{ labels.lastStopPrefix }}{{ lastStopReason }}
            </p>
          </section>

          <section class="settings-popover__section">
            <h3 class="settings-popover__section-title">{{ labels.sectionProvider }}</h3>
            <AssistantChatSettingsFields
              :fields="providerFields"
              :draft-config="draftConfig"
              @update:draft-config="emit('update:draft-config', $event)"
              @change-provider="emit('change-provider', $event)"
            />

            <div class="action-row">
              <button
                data-testid="save-provider-button"
                type="button"
                class="btn-primary"
                @click="emit('save-draft')"
              >
                {{ labels.saveLocally }}
              </button>
              <button type="button" class="btn-secondary" @click="emit('reset-draft')">
                {{ labels.resetDraft }}
              </button>
              <button type="button" class="btn-secondary btn-secondary--danger" @click="emit('clear-saved')">
                {{ labels.clearSaved }}
              </button>
            </div>
            <p v-if="statusMessage" class="status-message">{{ statusMessage }}</p>
          </section>

          <section class="settings-popover__section">
            <h3 class="settings-popover__section-title">{{ labels.sectionConversation }}</h3>
            <button type="button" class="btn-secondary full-width" @click="emit('clear-conversation')">
              {{ labels.clearChat }}
            </button>
            <button type="button" class="btn-secondary full-width" @click="emit('copy-debug-logs')">
              {{ labels.copyDebugLogs }}
            </button>
          </section>
        </div>
      </div>

      <div class="message-region">
        <ChatMessageList
          :timeline-items="timelineItems"
          active-reasoning-item-id=""
          :is-streaming="isRunning"
          :waiting-reason="waitingReason"
          :can-switch-plan-to-build="canSwitchPlanToBuild"
          :last-error="errorMessage || null"
          :labels="messageListLabels"
        />
      </div>

      <div class="input-region">
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <form data-testid="chat-form" class="composer" @submit.prevent="onSubmit">
          <textarea
            data-testid="chat-prompt"
            :value="prompt"
            rows="3"
            class="composer__textarea"
            :placeholder="labels.composerPlaceholder"
            :disabled="isRunning"
            @input="onPromptInput"
          />
          <div class="composer__actions">
            <button
              data-testid="submit-prompt-button"
              type="submit"
              class="composer__send"
              :disabled="isRunning"
            >
              {{ isRunning ? labels.sending : labels.send }}
            </button>
          </div>
        </form>
      </div>
    </template>

    <div v-else class="mobile-dock" data-testid="mobile-chat-dock">
      <div class="mobile-dock__pill" aria-hidden="true" />
      <button
        type="button"
        class="mobile-dock__expand"
        data-testid="mobile-expand-sheet"
        :aria-label="labels.expandSheetAriaLabel"
        :aria-expanded="false"
        @click="onExpandSheet"
      >
        <svg class="mobile-dock__chevron" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"
          />
        </svg>
      </button>
      <p v-if="errorMessage" class="mobile-dock__error">{{ errorMessage }}</p>
      <form data-testid="chat-dock-form" class="mobile-dock__form" @submit.prevent="onSubmit">
        <input
          data-testid="chat-dock-prompt"
          class="mobile-dock__input"
          type="text"
          :value="prompt"
          :placeholder="labels.mobileDockPlaceholder"
          :disabled="isRunning"
          enterkeyhint="send"
          @input="onDockPromptInput"
        />
        <button
          data-testid="chat-dock-submit"
          type="submit"
          class="mobile-dock__send"
          :disabled="isRunning"
          :aria-label="isRunning ? labels.sending : labels.send"
        >
          {{ isRunning ? "…" : labels.send }}
        </button>
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

.chat-panel--mobile-collapsed {
  justify-content: flex-end;
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

.chat-toolbar__btn:hover {
  background: var(--bg-hover, color-mix(in srgb, var(--text-primary) 6%, var(--bg-secondary)));
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
  padding: 18px 16px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  box-shadow: var(--shadow-lg);
  z-index: 30;
}

.settings-popover__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
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
  color: var(--text-primary);
}

.settings-popover__section {
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid var(--border);
}

.settings-popover__section-title {
  margin: 0 0 12px;
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
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
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
  flex-shrink: 0;
}

.status-chip[data-ready="true"] {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 35%, var(--border));
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.btn-primary {
  font: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--primary) 40%, var(--border));
  background: var(--primary);
  color: #fff;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, var(--primary));
}

.btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-secondary {
  font: inherit;
  font-size: 0.875rem;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover, color-mix(in srgb, var(--text-primary) 6%, var(--bg-secondary)));
}

.btn-secondary--danger {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 35%, var(--border));
  background: var(--bg-secondary);
}

.full-width {
  width: 100%;
}

.full-width + .full-width {
  margin-top: 8px;
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

.input-region {
  flex: 0 0 auto;
  border-top: 1px solid var(--border);
  background: var(--bg-primary);
  padding: 10px 14px 12px;
}

.error-message {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--danger);
}

.composer {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
}

.composer__textarea {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  resize: none;
  min-height: 52px;
  max-height: 160px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-primary);
  line-height: 1.45;
}

.composer__textarea:focus {
  outline: none;
}

.composer__textarea::placeholder {
  color: var(--text-muted);
}

.composer__actions {
  display: flex;
  flex-shrink: 0;
  align-items: flex-end;
  padding-bottom: 2px;
}

.composer__send {
  font: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border));
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
}

.composer__send:hover:not(:disabled) {
  background: var(--primary-hover, var(--primary));
}

.composer__send:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.mobile-dock {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-height: var(--assistant-chat-dock-peek-height, 120px);
  padding: 6px 14px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg-primary);
  box-sizing: border-box;
}

.mobile-dock__pill {
  align-self: center;
  width: 40px;
  height: 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 45%, var(--border));
  flex-shrink: 0;
}

.mobile-dock__expand {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2px 0 4px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.mobile-dock__expand:hover {
  color: var(--text-primary);
}

.mobile-dock__chevron {
  display: block;
}

.mobile-dock__error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--danger);
}

.mobile-dock__form {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.mobile-dock__input {
  flex: 1 1 auto;
  min-width: 0;
  font: inherit;
  font-size: 0.9375rem;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.mobile-dock__input::placeholder {
  color: var(--text-muted);
}

.mobile-dock__input:focus {
  outline: 2px solid color-mix(in srgb, var(--primary) 35%, transparent);
  outline-offset: 0;
}

.mobile-dock__send {
  flex-shrink: 0;
  font: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border));
  background: var(--primary);
  color: #fff;
  cursor: pointer;
}

.mobile-dock__send:hover:not(:disabled) {
  background: var(--primary-hover, var(--primary));
}

.mobile-dock__send:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (min-width: 961px) {
  .settings-popover {
    left: auto;
    width: min(380px, calc(100% - 24px));
    max-width: calc(100% - 24px);
  }
}
</style>
