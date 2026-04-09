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
}

export interface AgentLoopAssistantMessage {
  role: "assistant";
  content: string | HostProtocolPayload;
  toolCalls?: AgentLoopToolCall[];
  name?: string;
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
}

export interface AgentLoopTurnResult {
  transcript: AgentLoopMessage[];
  output: HostProtocolResult;
  iterations: number;
  stopReason: string;
}

export interface AgentLoopModelAdapter {
  runTurn(input: AgentLoopTurnInput): Promise<AgentLoopModelTurnResult>;
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
        const turn = await options.model.runTurn({
          messages: transcript,
          tools: input.tools,
          maxIterations: limit,
        });
        const assistantMessage = toAssistantMessageWithToolCalls(turn.assistantMessage, turn.toolCalls);
        transcript.push(assistantMessage);

        if (!turn.toolCalls || turn.toolCalls.length === 0) {
          return {
            transcript,
            output: turn.output || {
              ok: true,
              content: assistantMessage.content,
            },
            iterations,
            stopReason: turn.stopReason || "assistant_response",
          };
        }

        if (!options.toolRouter) {
          return {
            transcript,
            output: createHostProtocolError(
              "agent_loop_tool_router_missing",
              "tool router is required when model returns tool calls"
            ),
            iterations,
            stopReason: "tool_router_missing",
          };
        }

        for (const call of turn.toolCalls) {
          const request: HostToolInvokeRequest = {
            functionName: call.name,
            payload: call.input,
          };
          const result = await options.toolRouter.invoke(request);
          transcript.push(toToolResultMessage(call, result));
        }
      }

      return {
        transcript,
        output: createHostProtocolError(
          "agent_loop_iteration_limit",
          `agent loop exceeded max iterations (${limit})`
        ),
        iterations,
        stopReason: "max_iterations",
      };
    },
  };
}
