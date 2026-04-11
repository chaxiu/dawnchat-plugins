import { computed, onScopeDispose, ref, watch } from "vue";

import {
  createAssistantChatSession,
  type AssistantChatSessionSnapshot,
} from "@dawnchat/assistant-app-sdk";
import {
  createAgentLoopRunner,
} from "@dawnchat/host-orchestration-sdk/agent-loop";
import { createVercelAiAgentLoopModelAdapter } from "@dawnchat/host-orchestration-sdk/vercel-ai";

import { createProviderModel } from "../provider/providerModel";
import type { AssistantProviderConfig } from "../provider/providerTypes";
import {
  listMobileAssistantToolDefinitions,
  createMobileAssistantHostToolRouter,
} from "../../runtime/tools/hostToolRouter";
import { getMobileAssistantIdentity } from "../../runtime/assistantIdentity";
import {
  clearStoredTranscript,
  loadStoredTranscript,
  saveStoredTranscript,
} from "./chatStorage";
import {
  appendChatDebugLog,
  installChatDebugWindowHandle,
  logChatError,
} from "./chatDebugLog";

const DEFAULT_SYSTEM_PROMPT = [
  "You are the DawnChat mobile assistant running inside an Ionic Vue shell.",
  "Use tools when they help produce a more accurate answer.",
  "Use math.add for exact arithmetic.",
  "The user chats on the Assistant screen; additional scenes live under routed views.",
  "Use assistant.view.list to inspect available views before switching scenes.",
  "Use view.open before describing or reasoning about a specific scene.",
  "Use assistant.view.describe or assistant.view.contract when you need current page state or scene rules.",
].join(" ");

export function useAssistantChat() {
  const assistantIdentity = getMobileAssistantIdentity();
  installChatDebugWindowHandle(assistantIdentity);
  const prompt = ref("");
  const transcript = ref([] as ReturnType<typeof loadStoredTranscript>);
  const isRunning = ref(false);
  const errorMessage = ref("");
  const lastStopReason = ref("");
  const hasTranscript = computed(() => transcript.value.length > 0);

  const session = createAssistantChatSession<AssistantProviderConfig>({
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    transcriptStore: {
      loadTranscript: () => loadStoredTranscript(assistantIdentity.transcriptStorageKey),
      saveTranscript: (nextTranscript) => saveStoredTranscript(assistantIdentity.transcriptStorageKey, nextTranscript),
      clearTranscript: () => clearStoredTranscript(assistantIdentity.transcriptStorageKey),
    },
    logger: {
      log(event, data, level) {
        const nextData = event === "chat_session_initialized"
          ? {
              assistant_instance_id: assistantIdentity.assistantInstanceId,
              session_id: assistantIdentity.sessionId,
              ...data,
            }
          : data;
        appendChatDebugLog(assistantIdentity, event, nextData, level);
      },
      logError(event, error, extra) {
        logChatError(assistantIdentity, event, error, extra);
      },
    },
    validateConfig(config) {
      if (!config.apiKey.trim() || !config.modelId.trim()) {
        return "Please save a valid provider configuration first.";
      }
      return "";
    },
    createRunContext({ config, systemPrompt }) {
      const model = createProviderModel(config);
      const modelAdapter = createVercelAiAgentLoopModelAdapter({
        model,
        system: systemPrompt,
        providerOptions: config.providerOptions,
        headers: config.headers,
      });
      return {
        runner: createAgentLoopRunner({
          model: modelAdapter,
          toolRouter: createMobileAssistantHostToolRouter(),
        }),
        tools: listMobileAssistantToolDefinitions(),
      };
    },
  });

  function syncSnapshot(snapshot: AssistantChatSessionSnapshot) {
    if (prompt.value !== snapshot.prompt) {
      prompt.value = snapshot.prompt;
    }
    transcript.value = snapshot.transcript;
    isRunning.value = snapshot.isRunning;
    errorMessage.value = snapshot.errorMessage;
    lastStopReason.value = snapshot.lastStopReason;
  }

  syncSnapshot(session.getSnapshot());
  const unsubscribe = session.subscribe(syncSnapshot);
  onScopeDispose(() => {
    unsubscribe();
  });

  watch(prompt, (nextPrompt) => {
    if (session.getSnapshot().prompt !== nextPrompt) {
      session.setPrompt(nextPrompt);
    }
  });

  void session.hydrate();

  async function submitPrompt(config: AssistantProviderConfig) {
    await session.submitPrompt(config);
  }

  async function clearConversation() {
    await session.clearConversation();
  }

  return {
    prompt,
    transcript,
    isRunning,
    errorMessage,
    lastStopReason,
    hasTranscript,
    submitPrompt,
    clearConversation,
  };
}
