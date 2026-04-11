import type {
  AgentLoopMessage,
  AgentLoopRunner,
  AgentLoopStreamEvent,
  AgentLoopToolDefinition,
} from "@dawnchat/host-orchestration-sdk/agent-loop";

type MaybePromise<T> = T | Promise<T>;

export type AssistantChatLogLevel = "debug" | "info" | "warn" | "error";

export interface AssistantChatRunContext {
  runner: AgentLoopRunner;
  tools: AgentLoopToolDefinition[];
}

export interface CreateAssistantChatRunContextInput<TConfig> {
  config: TConfig;
  systemPrompt: string;
}

export interface AssistantChatTranscriptStore {
  loadTranscript(): MaybePromise<AgentLoopMessage[]>;
  saveTranscript(transcript: AgentLoopMessage[]): MaybePromise<void>;
  clearTranscript(): MaybePromise<void>;
}

export interface AssistantChatLogger {
  log(event: string, data: Record<string, unknown>, level?: AssistantChatLogLevel): void;
  logError?(event: string, error: unknown, extra?: Record<string, unknown>): void;
}

export interface AssistantChatSessionSnapshot {
  prompt: string;
  stableTranscript: AgentLoopMessage[];
  streamingTranscript: AgentLoopMessage[];
  transcript: AgentLoopMessage[];
  isRunning: boolean;
  errorMessage: string;
  lastStopReason: string;
  hasTranscript: boolean;
}

export interface AssistantChatStreamingState {
  streamingTranscript: AgentLoopMessage[];
  activeAssistantIndex: number;
}

export interface CreateAssistantChatSessionOptions<TConfig> {
  systemPrompt: string;
  transcriptStore?: AssistantChatTranscriptStore;
  logger?: AssistantChatLogger;
  validateConfig?: (config: TConfig) => string;
  createRunContext: (
    input: CreateAssistantChatRunContextInput<TConfig>
  ) => MaybePromise<AssistantChatRunContext>;
}

export interface AssistantChatSession<TConfig> {
  hydrate(): Promise<void>;
  subscribe(listener: (snapshot: AssistantChatSessionSnapshot) => void): () => void;
  getSnapshot(): AssistantChatSessionSnapshot;
  setPrompt(prompt: string): void;
  submitPrompt(config: TConfig): Promise<void>;
  clearConversation(): Promise<void>;
}

function createNoopTranscriptStore(): AssistantChatTranscriptStore {
  return {
    loadTranscript: () => [],
    saveTranscript: () => undefined,
    clearTranscript: () => undefined,
  };
}

function cloneMessage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneMessages(messages: AgentLoopMessage[]): AgentLoopMessage[] {
  return messages.map((message) => cloneMessage(message));
}

export function summarizeMessages(messages: AgentLoopMessage[]) {
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

export function applyAgentLoopStreamEvent(
  event: AgentLoopStreamEvent,
  input: AssistantChatStreamingState
): AssistantChatStreamingState {
  const nextTranscript = cloneMessages(input.streamingTranscript);
  let activeAssistantIndex = input.activeAssistantIndex;

  const updateAssistantMessage = (message: AgentLoopMessage) => {
    const nextMessage = cloneMessage(message);
    if (activeAssistantIndex < 0 || activeAssistantIndex >= nextTranscript.length) {
      nextTranscript.push(nextMessage);
      activeAssistantIndex = nextTranscript.length - 1;
      return;
    }
    nextTranscript[activeAssistantIndex] = nextMessage;
  };

  if (event.type === "assistant_text_started" || event.type === "assistant_text_delta") {
    updateAssistantMessage(event.message);
    return {
      streamingTranscript: nextTranscript,
      activeAssistantIndex,
    };
  }

  if (event.type === "tool_call_started") {
    updateAssistantMessage(event.message);
    return {
      streamingTranscript: nextTranscript,
      activeAssistantIndex,
    };
  }

  if (event.type === "assistant_message_completed") {
    updateAssistantMessage(event.message);
    return {
      streamingTranscript: nextTranscript,
      activeAssistantIndex: -1,
    };
  }

  if (event.type === "tool_result_received") {
    nextTranscript.push({
      role: "tool",
      name: event.call.name,
      toolCallId: event.call.id,
      content: cloneMessage(event.result),
    });
    return {
      streamingTranscript: nextTranscript,
      activeAssistantIndex,
    };
  }

  return {
    streamingTranscript: nextTranscript,
    activeAssistantIndex,
  };
}

export function createAssistantChatSession<TConfig>(
  options: CreateAssistantChatSessionOptions<TConfig>
): AssistantChatSession<TConfig> {
  const transcriptStore = options.transcriptStore || createNoopTranscriptStore();
  const subscribers = new Set<(snapshot: AssistantChatSessionSnapshot) => void>();
  let hydrated = false;

  const state = {
    prompt: "",
    stableTranscript: [] as AgentLoopMessage[],
    streamingTranscript: [] as AgentLoopMessage[],
    isRunning: false,
    errorMessage: "",
    lastStopReason: "",
  };

  const getSnapshot = (): AssistantChatSessionSnapshot => ({
    prompt: state.prompt,
    stableTranscript: cloneMessages(state.stableTranscript),
    streamingTranscript: cloneMessages(state.streamingTranscript),
    transcript: cloneMessages([...state.stableTranscript, ...state.streamingTranscript]),
    isRunning: state.isRunning,
    errorMessage: state.errorMessage,
    lastStopReason: state.lastStopReason,
    hasTranscript: state.stableTranscript.length + state.streamingTranscript.length > 0,
  });

  const emit = () => {
    const snapshot = getSnapshot();
    subscribers.forEach((listener) => listener(snapshot));
  };

  const log = (event: string, data: Record<string, unknown>, level: AssistantChatLogLevel = "info") => {
    options.logger?.log(event, data, level);
  };

  const persistStableTranscript = async () => {
    if (state.stableTranscript.length > 0) {
      await transcriptStore.saveTranscript(cloneMessages(state.stableTranscript));
      log("transcript_persisted", {
        entries: state.stableTranscript.length,
      }, "debug");
      return;
    }
    await transcriptStore.clearTranscript();
    log("transcript_persisted", {
      entries: 0,
    }, "debug");
  };

  return {
    async hydrate() {
      if (hydrated) {
        return;
      }
      hydrated = true;
      const loadedTranscript = await transcriptStore.loadTranscript();
      state.stableTranscript = cloneMessages(loadedTranscript);
      emit();
      log("chat_session_initialized", {
        transcript_entries: state.stableTranscript.length,
      });
    },

    subscribe(listener) {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },

    getSnapshot,

    setPrompt(prompt: string) {
      state.prompt = prompt;
      emit();
    },

    async submitPrompt(config: TConfig) {
      const nextPrompt = state.prompt.trim();
      if (!nextPrompt || state.isRunning) {
        log("submit_prompt_skipped", {
          reason: !nextPrompt ? "empty_prompt" : "already_running",
          transcript_entries: state.stableTranscript.length + state.streamingTranscript.length,
        }, "warn");
        return;
      }

      const validationError = options.validateConfig?.(config) || "";
      if (validationError) {
        state.errorMessage = validationError;
        emit();
        log("submit_prompt_rejected", {
          reason: "config_invalid",
          message: validationError,
        }, "warn");
        return;
      }

      state.isRunning = true;
      state.errorMessage = "";
      state.prompt = "";
      emit();

      let runInputMessages: AgentLoopMessage[] = [];
      let runInputTools: AgentLoopToolDefinition[] = [];
      let activeAssistantIndex = -1;

      try {
        const { runner, tools } = await options.createRunContext({
          config,
          systemPrompt: options.systemPrompt,
        });
        runInputTools = tools;

        const userMessage: AgentLoopMessage = {
          role: "user",
          content: nextPrompt,
        };
        state.stableTranscript = [...state.stableTranscript, userMessage];
        state.streamingTranscript = [];
        await persistStableTranscript();
        emit();

        runInputMessages = cloneMessages(state.stableTranscript);
        log("runner_run_started", {
          input_message_count: runInputMessages.length,
          tools: tools.map((tool) => tool.name),
          message_summary: summarizeMessages(runInputMessages),
        });

        const result = await runner.run({
          messages: runInputMessages,
          tools,
          onEvent: async (event) => {
            const nextStreamingState = applyAgentLoopStreamEvent(event, {
              streamingTranscript: state.streamingTranscript,
              activeAssistantIndex,
            });
            state.streamingTranscript = nextStreamingState.streamingTranscript;
            activeAssistantIndex = nextStreamingState.activeAssistantIndex;

            if (event.type === "tool_call_started") {
              log("stream_tool_call_started", {
                tool_name: event.call.name,
                tool_call_id: event.call.id,
              }, "debug");
            } else if (event.type === "tool_result_received") {
              log("stream_tool_result_received", {
                tool_name: event.call.name,
                tool_call_id: event.call.id,
              }, "debug");
            }
            emit();
          },
        });

        log("runner_run_succeeded", {
          stop_reason: result.stopReason,
          iterations: result.iterations,
          transcript_entries: result.transcript.length,
          output_ok: typeof result.output === "object" && result.output ? result.output.ok !== false : true,
          output_preview:
            typeof result.output === "object" && result.output
              ? JSON.stringify(result.output).slice(0, 240)
              : String(result.output),
        });

        state.stableTranscript = cloneMessages(result.transcript);
        state.streamingTranscript = [];
        state.lastStopReason = result.stopReason;
        if (result.output && typeof result.output === "object" && result.output.ok === false) {
          state.errorMessage = String(result.output.message || result.output.error_code || "Agent run failed.");
          log("runner_run_output_error", {
            stop_reason: result.stopReason,
            output: result.output as Record<string, unknown>,
          }, "warn");
        }
        await persistStableTranscript();
        emit();
      } catch (error) {
        state.streamingTranscript = [];
        state.errorMessage = error instanceof Error ? error.message : String(error);
        emit();
        if (options.logger?.logError) {
          options.logger.logError("runner_run_failed", error, {
            input_message_count: runInputMessages.length,
            input_tools: runInputTools.map((tool) => tool.name),
            input_message_summary: summarizeMessages(runInputMessages),
          });
        } else {
          log("runner_run_failed", {
            error: error instanceof Error ? error.message : String(error),
            input_message_count: runInputMessages.length,
            input_tools: runInputTools.map((tool) => tool.name),
            input_message_summary: summarizeMessages(runInputMessages),
          }, "error");
        }
      } finally {
        state.isRunning = false;
        emit();
      }
    },

    async clearConversation() {
      log("conversation_cleared", {
        previous_entries: state.stableTranscript.length + state.streamingTranscript.length,
      }, "warn");
      state.stableTranscript = [];
      state.streamingTranscript = [];
      state.prompt = "";
      state.errorMessage = "";
      state.lastStopReason = "";
      await transcriptStore.clearTranscript();
      emit();
    },
  };
}
