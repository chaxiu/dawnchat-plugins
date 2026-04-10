import { computed, ref, watch } from "vue";

import {
  createAgentLoopRunner,
  type AgentLoopMessage,
  type AgentLoopStreamEvent,
} from "@dawnchat/host-orchestration-sdk/agent-loop";
import { createVercelAiAgentLoopModelAdapter } from "@dawnchat/host-orchestration-sdk/vercel-ai";

import { createProviderModel } from "../provider/providerModel";
import type { AssistantProviderConfig } from "../provider/providerTypes";
import {
  listWebAssistantToolDefinitions,
  createWebAssistantHostToolRouter,
} from "../../runtime/tools/hostToolRouter";
import { getWebAssistantIdentity } from "../../runtime/assistantIdentity";
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
  "You are the DawnChat web assistant.",
  "Use tools when they help produce a more accurate answer.",
  "Use math.add for exact arithmetic.",
  "The UI has a left chat panel and a right assistant page.",
  "Use assistant.view.list to inspect available views before switching scenes.",
  "Use view.open before describing or reasoning about a specific page on the right.",
  "Use assistant.view.describe or assistant.view.contract when you need current page state or scene rules.",
].join(" ");

function cloneMessages(messages: AgentLoopMessage[]): AgentLoopMessage[] {
  return messages.map((message) => JSON.parse(JSON.stringify(message)) as AgentLoopMessage);
}

function summarizeMessages(messages: AgentLoopMessage[]) {
  return messages.map((message, index) => ({
    index,
    role: message.role,
    name: "name" in message ? message.name || "" : "",
    content_type: typeof message.content,
    content_preview:
      typeof message.content === "string"
        ? message.content.slice(0, 120)
        : JSON.stringify(message.content).slice(0, 180),
    tool_call_count:
      message.role === "assistant" && Array.isArray(message.toolCalls)
        ? message.toolCalls.length
        : 0,
    tool_call_id: message.role === "tool" ? message.toolCallId || "" : "",
  }));
}

export function useAssistantChat() {
  const assistantIdentity = getWebAssistantIdentity();
  installChatDebugWindowHandle(assistantIdentity);
  const prompt = ref("");
  const stableTranscript = ref<AgentLoopMessage[]>(
    loadStoredTranscript(assistantIdentity.transcriptStorageKey)
  );
  const streamingTranscript = ref<AgentLoopMessage[]>([]);
  const isRunning = ref(false);
  const errorMessage = ref("");
  const lastStopReason = ref("");
  const transcript = computed<AgentLoopMessage[]>(() => [
    ...stableTranscript.value,
    ...streamingTranscript.value,
  ]);

  const hasTranscript = computed(() => transcript.value.length > 0);
  appendChatDebugLog(assistantIdentity, "chat_session_initialized", {
    assistant_instance_id: assistantIdentity.assistantInstanceId,
    session_id: assistantIdentity.sessionId,
    transcript_entries: stableTranscript.value.length,
  });

  watch(
    stableTranscript,
    (nextTranscript) => {
      appendChatDebugLog(assistantIdentity, "transcript_persisted", {
        entries: nextTranscript.length,
      }, "debug");
      if (nextTranscript.length > 0) {
        saveStoredTranscript(assistantIdentity.transcriptStorageKey, nextTranscript);
      } else {
        clearStoredTranscript(assistantIdentity.transcriptStorageKey);
      }
    },
    { deep: true }
  );

  function setStreamingTranscript(nextTranscript: AgentLoopMessage[]) {
    streamingTranscript.value = cloneMessages(nextTranscript);
  }

  function applyStreamingEvent(
    event: AgentLoopStreamEvent,
    runStreamingTranscript: AgentLoopMessage[],
    activeAssistantIndex: { value: number }
  ) {
    const updateAssistantMessage = (message: AgentLoopMessage) => {
      if (activeAssistantIndex.value < 0 || activeAssistantIndex.value >= runStreamingTranscript.length) {
        runStreamingTranscript.push(JSON.parse(JSON.stringify(message)) as AgentLoopMessage);
        activeAssistantIndex.value = runStreamingTranscript.length - 1;
        return;
      }
      runStreamingTranscript[activeAssistantIndex.value] =
        JSON.parse(JSON.stringify(message)) as AgentLoopMessage;
    };

    if (event.type === "assistant_text_started") {
      updateAssistantMessage(event.message);
      return;
    }

    if (event.type === "assistant_text_delta") {
      updateAssistantMessage(event.message);
      return;
    }

    if (event.type === "tool_call_started") {
      updateAssistantMessage(event.message);
      appendChatDebugLog(assistantIdentity, "stream_tool_call_started", {
        tool_name: event.call.name,
        tool_call_id: event.call.id,
      }, "debug");
      return;
    }

    if (event.type === "assistant_message_completed") {
      updateAssistantMessage(event.message);
      activeAssistantIndex.value = -1;
      return;
    }

    if (event.type === "tool_result_received") {
      runStreamingTranscript.push({
        role: "tool",
        name: event.call.name,
        toolCallId: event.call.id,
        content: event.result,
      });
      appendChatDebugLog(assistantIdentity, "stream_tool_result_received", {
        tool_name: event.call.name,
        tool_call_id: event.call.id,
      }, "debug");
    }
  }

  async function submitPrompt(config: AssistantProviderConfig) {
    const nextPrompt = prompt.value.trim();
    if (!nextPrompt || isRunning.value) {
      appendChatDebugLog(assistantIdentity, "submit_prompt_skipped", {
        reason: !nextPrompt ? "empty_prompt" : "already_running",
        transcript_entries: transcript.value.length,
      }, "warn");
      return;
    }
    if (!config.apiKey.trim() || !config.modelId.trim()) {
      errorMessage.value = "Please save a valid provider configuration first.";
      appendChatDebugLog(assistantIdentity, "submit_prompt_rejected", {
        reason: "provider_config_incomplete",
        provider: config.provider,
        has_api_key: Boolean(config.apiKey.trim()),
        has_model_id: Boolean(config.modelId.trim()),
      }, "warn");
      return;
    }

    isRunning.value = true;
    errorMessage.value = "";
    prompt.value = "";
    let runInputMessages: AgentLoopMessage[] = [];
    let runInputTools: ReturnType<typeof listWebAssistantToolDefinitions> = [];
    const runStreamingTranscript: AgentLoopMessage[] = [];
    const activeAssistantIndex = { value: -1 };

    try {
      const model = createProviderModel(config);
      const modelAdapter = createVercelAiAgentLoopModelAdapter({
        model,
        system: DEFAULT_SYSTEM_PROMPT,
        providerOptions: config.providerOptions,
        headers: config.headers,
      });
      const runner = createAgentLoopRunner({
        model: modelAdapter,
        toolRouter: createWebAssistantHostToolRouter(),
      });
      const tools = listWebAssistantToolDefinitions();
      runInputTools = tools;
      const userMessage: AgentLoopMessage = {
        role: "user",
        content: nextPrompt,
      };
      stableTranscript.value = [...stableTranscript.value, userMessage];
      setStreamingTranscript([]);
      runInputMessages = cloneMessages(stableTranscript.value);
      appendChatDebugLog(assistantIdentity, "runner_run_started", {
        provider: config.provider,
        model_id: config.modelId,
        input_message_count: runInputMessages.length,
        tools: tools.map((tool) => tool.name),
        message_summary: summarizeMessages(runInputMessages),
      });
      const result = await runner.run({
        messages: runInputMessages,
        tools,
        onEvent(event) {
          applyStreamingEvent(event, runStreamingTranscript, activeAssistantIndex);
          setStreamingTranscript(runStreamingTranscript);
        },
      });
      appendChatDebugLog(assistantIdentity, "runner_run_succeeded", {
        stop_reason: result.stopReason,
        iterations: result.iterations,
        transcript_entries: result.transcript.length,
        output_ok: typeof result.output === "object" && result.output ? result.output.ok !== false : true,
        output_preview:
          typeof result.output === "object" && result.output
            ? JSON.stringify(result.output).slice(0, 240)
            : String(result.output),
      });
      stableTranscript.value = result.transcript;
      setStreamingTranscript([]);
      lastStopReason.value = result.stopReason;
      if (result.output && typeof result.output === "object" && result.output.ok === false) {
        errorMessage.value = String(result.output.message || result.output.error_code || "Agent run failed.");
        appendChatDebugLog(assistantIdentity, "runner_run_output_error", {
          stop_reason: result.stopReason,
          output: result.output as Record<string, unknown>,
        }, "warn");
      }
    } catch (error) {
      setStreamingTranscript([]);
      errorMessage.value = error instanceof Error ? error.message : String(error);
      logChatError(assistantIdentity, "runner_run_failed", error, {
        provider: config.provider,
        model_id: config.modelId,
        input_message_count: runInputMessages.length,
        input_tools: runInputTools.map((tool) => tool.name),
        input_message_summary: summarizeMessages(runInputMessages),
      });
    } finally {
      isRunning.value = false;
    }
  }

  function clearConversation() {
    appendChatDebugLog(assistantIdentity, "conversation_cleared", {
      previous_entries: transcript.value.length,
    }, "warn");
    stableTranscript.value = [];
    setStreamingTranscript([]);
    prompt.value = "";
    errorMessage.value = "";
    lastStopReason.value = "";
    clearStoredTranscript(assistantIdentity.transcriptStorageKey);
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
