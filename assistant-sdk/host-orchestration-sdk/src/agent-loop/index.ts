import { createHostToolRouter, type HostToolInvokeRequest } from "../tool-router/index";
import {
  createHostProtocolError,
  type AgentExecutionMode,
  type HostProtocolPayload,
  type HostProtocolResult,
} from "../protocol";

export interface AgentLoopToolCall {
  id: string;
  name: string;
  input: HostProtocolPayload;
  thought_signature?: string;
}

export interface AgentLoopAssistantMessage {
  role: "assistant";
  content: string | HostProtocolPayload;
  toolCalls?: AgentLoopToolCall[];
  name?: string;
  raw_model_message?: HostProtocolPayload;
}

export interface AgentLoopToolMessage {
  role: "tool";
  content: HostProtocolResult;
  name?: string;
  toolCallId?: string;
}

export interface AgentLoopSystemOrUserMessage {
  role: "system" | "user";
  content: string | HostProtocolPayload;
  name?: string;
}

export type AgentLoopMessage =
  | AgentLoopAssistantMessage
  | AgentLoopToolMessage
  | AgentLoopSystemOrUserMessage;

export interface AgentLoopToolDefinition {
  name: string;
  description?: string;
  inputSchema?: HostProtocolPayload;
}

export interface AgentLoopModelTurnResult {
  assistantMessage: AgentLoopAssistantMessage;
  toolCalls?: AgentLoopToolCall[];
  output?: HostProtocolResult;
  stopReason?: string;
}

export interface AgentLoopTurnInput {
  messages: AgentLoopMessage[];
  tools?: AgentLoopToolDefinition[];
  maxIterations?: number;
  onEvent?: AgentLoopStreamEventHandler;
}

export interface AgentLoopTurnResult {
  transcript: AgentLoopMessage[];
  output: HostProtocolResult;
  iterations: number;
  stopReason: string;
}

export type AgentLoopStreamEvent =
  | {
      type: "assistant_text_started";
      message: AgentLoopAssistantMessage;
      iteration?: number;
    }
  | {
      type: "assistant_text_delta";
      delta: string;
      snapshot: string;
      message: AgentLoopAssistantMessage;
      iteration?: number;
    }
  | {
      type: "tool_call_started";
      call: AgentLoopToolCall;
      message: AgentLoopAssistantMessage;
      iteration?: number;
    }
  | {
      type: "tool_result_received";
      call: AgentLoopToolCall;
      result: HostProtocolResult;
      iteration?: number;
    }
  | {
      type: "assistant_message_completed";
      message: AgentLoopAssistantMessage;
      iteration?: number;
    }
  | {
      type: "run_failed";
      output: HostProtocolResult;
      iterations: number;
      stopReason: string;
    }
  | {
      type: "run_completed";
      result: AgentLoopTurnResult;
    };

export type AgentLoopStreamEventHandler = (
  event: AgentLoopStreamEvent
) => void | Promise<void>;

export interface AgentLoopModelAdapter {
  runTurn(input: AgentLoopTurnInput): Promise<AgentLoopModelTurnResult>;
  runTurnStream?(
    input: AgentLoopTurnInput,
    onEvent: AgentLoopStreamEventHandler
  ): Promise<AgentLoopModelTurnResult>;
}

export interface AgentLoopRunner {
  run(input: AgentLoopTurnInput): Promise<AgentLoopTurnResult>;
}

export interface ExternalAgentLoopRunner extends AgentLoopRunner {
  mode: "external_loop";
}

export interface CreateAgentLoopRunnerOptions {
  executionMode?: AgentExecutionMode;
  model?: AgentLoopModelAdapter;
  toolRouter?: ReturnType<typeof createHostToolRouter>;
  externalRunner?: ExternalAgentLoopRunner;
  maxIterations?: number;
}

function toToolResultMessage(
  call: AgentLoopToolCall,
  result: HostProtocolResult
): AgentLoopToolMessage {
  return {
    role: "tool",
    name: call.name,
    toolCallId: call.id,
    content: result,
  };
}

function toAssistantMessageWithToolCalls(
  message: AgentLoopAssistantMessage,
  toolCalls?: AgentLoopToolCall[]
): AgentLoopAssistantMessage {
  if (!toolCalls || toolCalls.length === 0) {
    return message;
  }
  return {
    ...message,
    toolCalls,
  };
}

async function emitStreamEvent(
  handler: AgentLoopStreamEventHandler | undefined,
  event: AgentLoopStreamEvent
) {
  if (!handler) {
    return;
  }
  await handler(event);
}

export function createAgentLoopRunner(options: CreateAgentLoopRunnerOptions): AgentLoopRunner {
  const executionMode = options.executionMode ?? "local_loop";
  const maxIterations = options.maxIterations ?? 6;

  if (executionMode === "external_loop") {
    return options.externalRunner || {
      async run(input: AgentLoopTurnInput): Promise<AgentLoopTurnResult> {
        return {
          transcript: [...input.messages],
          output: createHostProtocolError(
            "agent_loop_external_runner_missing",
            "external loop mode requires externalRunner"
          ),
          iterations: 0,
          stopReason: "external_runner_missing",
        };
      },
    };
  }

  return {
    async run(input: AgentLoopTurnInput): Promise<AgentLoopTurnResult> {
      if (!options.model) {
        return {
          transcript: [...input.messages],
          output: createHostProtocolError(
            "agent_loop_model_missing",
            "local loop mode requires model adapter"
          ),
          iterations: 0,
          stopReason: "model_missing",
        };
      }
      const transcript = [...input.messages];
      const limit = input.maxIterations ?? maxIterations;
      let iterations = 0;

      while (iterations < limit) {
        iterations += 1;
        const emitForIteration = async (event: AgentLoopStreamEvent) => {
          if (event.type === "run_completed" || event.type === "run_failed") {
            await emitStreamEvent(input.onEvent, event);
            return;
          }
          await emitStreamEvent(input.onEvent, {
            ...event,
            iteration: iterations,
          });
        };
        const useStreamingTurn = Boolean(input.onEvent && options.model.runTurnStream);
        const turn = useStreamingTurn && options.model.runTurnStream
          ? await options.model.runTurnStream({
            messages: transcript,
            tools: input.tools,
            maxIterations: limit,
          }, emitForIteration)
          : await options.model.runTurn({
          messages: transcript,
          tools: input.tools,
          maxIterations: limit,
        });
        const assistantMessage = toAssistantMessageWithToolCalls(turn.assistantMessage, turn.toolCalls);
        transcript.push(assistantMessage);
        if (!useStreamingTurn) {
          await emitForIteration({
            type: "assistant_text_started",
            message: assistantMessage,
          });
          for (const call of turn.toolCalls || []) {
            await emitForIteration({
              type: "tool_call_started",
              call,
              message: assistantMessage,
            });
          }
        }
        await emitForIteration({
          type: "assistant_message_completed",
          message: assistantMessage,
        });

        if (!turn.toolCalls || turn.toolCalls.length === 0) {
          const result = {
            transcript,
            output: turn.output || {
              ok: true,
              content: assistantMessage.content,
            },
            iterations,
            stopReason: turn.stopReason || "assistant_response",
          };
          if (typeof result.output === "object" && result.output && result.output.ok === false) {
            await emitStreamEvent(input.onEvent, {
              type: "run_failed",
              output: result.output,
              iterations,
              stopReason: result.stopReason,
            });
          } else {
            await emitStreamEvent(input.onEvent, {
              type: "run_completed",
              result,
            });
          }
          return result;
        }

        if (!options.toolRouter) {
          const result = {
            transcript,
            output: createHostProtocolError(
              "agent_loop_tool_router_missing",
              "tool router is required when model returns tool calls"
            ),
            iterations,
            stopReason: "tool_router_missing",
          };
          await emitStreamEvent(input.onEvent, {
            type: "run_failed",
            output: result.output,
            iterations,
            stopReason: result.stopReason,
          });
          return result;
        }

        for (const call of turn.toolCalls) {
          const request: HostToolInvokeRequest = {
            functionName: call.name,
            payload: call.input,
          };
          const result = await options.toolRouter.invoke(request);
          transcript.push(toToolResultMessage(call, result));
          await emitForIteration({
            type: "tool_result_received",
            call,
            result,
          });
        }
      }

      const result = {
        transcript,
        output: createHostProtocolError(
          "agent_loop_iteration_limit",
          `agent loop exceeded max iterations (${limit})`
        ),
        iterations,
        stopReason: "max_iterations",
      };
      await emitStreamEvent(input.onEvent, {
        type: "run_failed",
        output: result.output,
        iterations,
        stopReason: result.stopReason,
      });
      return result;
    },
  };
}
