<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import "@dawnchat/assistant-chat-ui/style.css";
import {
  AssistantChatChrome,
  officialOpenAiGeminiProviderFields,
  type AssistantChatChromeLabels,
} from "@dawnchat/assistant-chat-ui";

import { useAssistantChat } from "../../features/chat/useAssistantChat";
import {
  getMobileAssistantLabels,
  getMobileAssistantWaitingReason,
  toMobileAssistantTimelineItems,
} from "../../features/chat/presentation/mobileAssistantChatTimeline";
import { useProviderConfig } from "../../features/provider/useProviderConfig";
import type { AssistantProviderConfig } from "../../features/provider/providerTypes";

const props = withDefaults(
  defineProps<{
    /** Synced with bottom sheet open state from shell (narrow viewport). */
    mobileSheetExpanded?: boolean;
  }>(),
  { mobileSheetExpanded: true },
);

const emit = defineEmits<{
  "expand-mobile-sheet": [];
}>();

const PROVIDER_FIELDS = officialOpenAiGeminiProviderFields();

const chromeLabels: AssistantChatChromeLabels = {
  toolbarTitle: "Chat",
  providerReadyTitle: "Provider ready",
  providerNotReadyTitle: "Configure provider in settings",
  settingsAriaLabel: "Open chat settings",
  settingsDialogAriaLabel: "Chat settings",
  settingsEyebrow: "Settings",
  settingsTitle: "Model & status",
  statusReady: "Ready",
  statusNeedsKey: "Needs API key",
  sectionSaved: "Saved",
  sectionProvider: "Provider",
  sectionConversation: "Conversation",
  lastStopPrefix: "Last stop: ",
  composerPlaceholder: "Message the assistant…",
  send: "Send",
  sending: "Running…",
  clearChat: "Clear chat history",
  copyDebugLogs: "Copy debug logs",
  saveLocally: "Save locally",
  resetDraft: "Reset draft",
  clearSaved: "Clear saved",
  expandSheetAriaLabel: "展开聊天面板",
  mobileDockPlaceholder: "向助手发送消息…",
};

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
const isMobile = ref(false);

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
});

onUnmounted(() => {
  mobileMediaQuery?.removeEventListener("change", updateMobileFlag);
});

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value;
}

function onUpdateSettingsOpen(open: boolean) {
  settingsOpen.value = open;
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
  toMobileAssistantTimelineItems(transcript.value, {
    isRunning: isRunning.value,
  })
);
const messageListLabels = computed(() => getMobileAssistantLabels());
const waitingReason = computed(() =>
  getMobileAssistantWaitingReason({
    isRunning: isRunning.value,
    transcript: transcript.value,
  })
);

function onDraftPatch(patch: Record<string, unknown>) {
  Object.assign(draftConfig.value, patch as Partial<AssistantProviderConfig>);
}

function onUpdatePrompt(value: string) {
  prompt.value = value;
}

async function handleSubmit() {
  await submitPrompt(savedConfig.value);
}

async function copyDebugLogs() {
  if (typeof window === "undefined") {
    return;
  }
  const handle = window.__DAWNCHAT_MOBILE_ASSISTANT_DEBUG__;
  const logs = handle?.readChatLogs?.() || [];
  const payload = JSON.stringify(
    {
      assistant_instance_id: handle?.assistantInstanceId || "",
      session_id: handle?.sessionId || "",
      storage_key: handle?.storageKey || "",
      count: logs.length,
      logs,
    },
    null,
    2
  );

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
    console.warn("[mobile-assistant/chat] clipboard.writeText failed, try fallback copy", error);
  }

  try {
    if (fallbackCopy()) {
      statusMessage.value = "Debug logs copied to clipboard (fallback).";
      return;
    }
  } catch (error) {
    console.warn("[mobile-assistant/chat] fallback copy failed", error);
  }

  statusMessage.value =
    "Clipboard is blocked in preview. Use window.__DAWNCHAT_MOBILE_ASSISTANT_DEBUG__.readChatLogs() in iframe console.";
}
</script>

<template>
  <AssistantChatChrome
    :labels="chromeLabels"
    :provider-fields="PROVIDER_FIELDS"
    :is-mobile="isMobile"
    :mobile-sheet-expanded="props.mobileSheetExpanded"
    :settings-open="settingsOpen"
    :is-configured="isConfigured"
    :is-running="isRunning"
    :error-message="errorMessage"
    :status-message="statusMessage"
    :last-stop-reason="lastStopReason"
    :saved-config="{ provider: savedConfig.provider, modelId: savedConfig.modelId }"
    :masked-api-key="maskedApiKey"
    :draft-config="draftConfig"
    :prompt="prompt"
    :timeline-items="timelineItems"
    :message-list-labels="messageListLabels"
    :waiting-reason="waitingReason"
    @update:settings-open="onUpdateSettingsOpen"
    @toggle-settings="toggleSettings"
    @update:prompt="onUpdatePrompt"
    @submit="handleSubmit"
    @update:draft-config="onDraftPatch"
    @change-provider="updateProvider($event as AssistantProviderConfig['provider'])"
    @save-draft="saveDraft"
    @reset-draft="resetDraft"
    @clear-saved="clearProviderConfig"
    @clear-conversation="clearConversation"
    @copy-debug-logs="copyDebugLogs"
    @expand-mobile-sheet="emit('expand-mobile-sheet')"
  />
</template>
