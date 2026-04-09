import { computed, ref } from "vue";

import {
  createAgentLoopRunner,
  type AgentLoopMessage,
} from "@dawnchat/host-orchestration-sdk/agent-loop";
import { createVercelAiAgentLoopModelAdapter } from "@dawnchat/host-orchestration-sdk/vercel-ai";

import { createProviderModel } from "../provider/providerModel";
import type { AssistantProviderConfig } from "../provider/providerTypes";
import {
  createWebAssistantHostToolRouter,
  WEB_ASSISTANT_TOOL_DEFINITIONS,
} from "../../runtime/tools/hostToolRouter";

const DEFAULT_SYSTEM_PROMPT = [
  "You are the DawnChat web assistant MVP.",
  "Use tools when they help produce a more accurate answer.",
  "Use math.add for exact arithmetic.",
  "Use dawnchat.host_info when the user asks about the current host or environment.",
].join(" ");

function cloneMessages(messages: AgentLoopMessage[]): AgentLoopMessage[] {
  return messages.map((message) => JSON.parse(JSON.stringify(message)) as AgentLoopMessage);
}

export function useAssistantChat() {
  const prompt = ref("");
  const transcript = ref<AgentLoopMessage[]>([]);
  const isRunning = ref(false);
  const errorMessage = ref("");
  const lastStopReason = ref("");

  const hasTranscript = computed(() => transcript.value.length > 0);

  async function submitPrompt(config: AssistantProviderConfig) {
    const nextPrompt = prompt.value.trim();
    if (!nextPrompt || isRunning.value) {
      return;
    }
    if (!config.apiKey.trim() || !config.modelId.trim()) {
      errorMessage.value = "Please save a valid provider configuration first.";
      return;
    }

    isRunning.value = true;
    errorMessage.value = "";

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
      const userMessage: AgentLoopMessage = {
        role: "user",
        content: nextPrompt,
      };
      const result = await runner.run({
        messages: [...cloneMessages(transcript.value), userMessage],
        tools: WEB_ASSISTANT_TOOL_DEFINITIONS,
      });
      transcript.value = result.transcript;
      lastStopReason.value = result.stopReason;
      if (result.output && typeof result.output === "object" && result.output.ok === false) {
        errorMessage.value = String(result.output.message || result.output.error_code || "Agent run failed.");
      }
      prompt.value = "";
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error);
    } finally {
      isRunning.value = false;
    }
  }

  function clearConversation() {
    transcript.value = [];
    prompt.value = "";
    errorMessage.value = "";
    lastStopReason.value = "";
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
