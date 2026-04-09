import { dynamicTool, generateText, jsonSchema } from "ai";

import type {
  AgentLoopAssistantMessage,
  AgentLoopMessage,
  AgentLoopModelAdapter,
  AgentLoopModelTurnResult,
  AgentLoopToolCall,
  AgentLoopToolDefinition,
  AgentLoopTurnInput,
} from "./agent-loop";
import type { HostProtocolPayload } from "./protocol";

interface VercelAiToolCallRecord extends HostProtocolPayload {
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
}

interface VercelAiStepRecord extends HostProtocolPayload {
  toolCalls?: unknown;
}

interface VercelAiGenerateTextResult extends HostProtocolPayload {
  text?: unknown;
  finishReason?: unknown;
  toolCalls?: unknown;
  steps?: unknown;
}

type VercelAiGenerateTextLike = (
  input: HostProtocolPayload
) => Promise<VercelAiGenerateTextResult>;

export interface CreateVercelAiAgentLoopModelAdapterOptions {
  model: unknown;
  system?: string;
  toolChoice?: "auto" | "required" | "none";
  providerOptions?: HostProtocolPayload;
  headers?: Record<string, string>;
  generateTextImpl?: VercelAiGenerateTextLike;
}

function toRecord(raw: unknown): HostProtocolPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as HostProtocolPayload;
}

function toMessageText(content: string | HostProtocolPayload): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

function toToolSet(tools?: AgentLoopToolDefinition[]): HostProtocolPayload | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }
  const toolSet: HostProtocolPayload = {};
  for (const tool of tools) {
    const dynamicDefinition = {
      description: tool.description,
      inputSchema: jsonSchema(tool.inputSchema || {
        type: "object",
        additionalProperties: true,
      }),
    } as unknown as Parameters<typeof dynamicTool>[0];
    toolSet[tool.name] = dynamicTool(dynamicDefinition);
  }
  return toolSet;
}

function toVercelAiMessage(message: AgentLoopMessage): HostProtocolPayload {
  if (message.role === "tool") {
    return {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: message.toolCallId || "",
          toolName: message.name || "",
          output: message.content,
        },
      ],
    };
  }

  if (message.role === "assistant") {
    const parts: HostProtocolPayload[] = [];
    const text = toMessageText(message.content);
    if (text) {
      parts.push({
        type: "text",
        text,
      });
    }
    for (const toolCall of message.toolCalls || []) {
      parts.push({
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        input: toolCall.input,
      });
    }
    if (parts.length === 1 && parts[0]?.type === "text") {
      return {
        role: "assistant",
        content: parts[0].text,
      };
    }
    return {
      role: "assistant",
      content: parts,
    };
  }

  return {
    role: message.role,
    content: toMessageText(message.content),
  };
}

function extractToolCalls(result: VercelAiGenerateTextResult): AgentLoopToolCall[] {
  const directCalls = Array.isArray(result.toolCalls) ? result.toolCalls : [];
  const rawSteps = Array.isArray(result.steps) ? result.steps : [];
  const lastStep = rawSteps.length > 0 ? toRecord(rawSteps[rawSteps.length - 1]) as VercelAiStepRecord : null;
  const nestedCalls = Array.isArray(lastStep?.toolCalls) ? lastStep.toolCalls : [];
  const source = directCalls.length > 0 ? directCalls : nestedCalls;

  return source
    .map((rawCall, index) => {
      const call = toRecord(rawCall) as VercelAiToolCallRecord;
      const name = String(call.toolName || call.name || "").trim();
      if (!name) {
        return null;
      }
      return {
        id: String(call.toolCallId || call.id || `tool_call_${index + 1}`),
        name,
        input: toRecord(call.input),
      };
    })
    .filter((item): item is AgentLoopToolCall => item !== null);
}

function toAssistantMessage(
  input: AgentLoopTurnInput,
  result: VercelAiGenerateTextResult,
  toolCalls: AgentLoopToolCall[]
): AgentLoopAssistantMessage {
  const text = typeof result.text === "string" ? result.text : "";
  return {
    role: "assistant",
    content: text || {
      status: toolCalls.length > 0 ? "tool_calls_requested" : "completed",
    },
  };
}

export function createVercelAiAgentLoopModelAdapter(
  options: CreateVercelAiAgentLoopModelAdapterOptions
): AgentLoopModelAdapter {
  const runGenerateText = options.generateTextImpl
    || (generateText as unknown as VercelAiGenerateTextLike);

  return {
    async runTurn(input: AgentLoopTurnInput): Promise<AgentLoopModelTurnResult> {
      const result = await runGenerateText({
        model: options.model as HostProtocolPayload,
        system: options.system,
        messages: input.messages.map(toVercelAiMessage),
        tools: toToolSet(input.tools),
        toolChoice: options.toolChoice,
        providerOptions: options.providerOptions,
        headers: options.headers,
      });

      const toolCalls = extractToolCalls(result);
      return {
        assistantMessage: toAssistantMessage(input, result, toolCalls),
        toolCalls,
        stopReason: typeof result.finishReason === "string" ? result.finishReason : undefined,
      };
    },
  };
}

