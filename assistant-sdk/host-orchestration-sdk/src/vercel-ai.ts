import { dynamicTool, generateText, jsonSchema, streamText } from "ai";

import type {
  AgentLoopAssistantMessage,
  AgentLoopMessage,
  AgentLoopModelAdapter,
  AgentLoopStreamEventHandler,
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
  thought_signature?: unknown;
  thoughtSignature?: unknown;
}

interface VercelAiStepRecord extends HostProtocolPayload {
  toolCalls?: unknown;
}

interface VercelAiGenerateTextResult extends HostProtocolPayload {
  text?: unknown;
  finishReason?: unknown;
  toolCalls?: unknown;
  steps?: unknown;
  response?: unknown;
}

type VercelAiGenerateTextLike = (
  input: HostProtocolPayload
) => Promise<VercelAiGenerateTextResult>;

interface VercelAiStreamTextResult extends HostProtocolPayload {
  fullStream?: unknown;
  text?: unknown;
  finishReason?: unknown;
  toolCalls?: unknown;
  steps?: unknown;
  response?: unknown;
}

type VercelAiStreamTextLike = (
  input: HostProtocolPayload
) => VercelAiStreamTextResult;

export interface CreateVercelAiAgentLoopModelAdapterOptions {
  model: unknown;
  system?: string;
  toolChoice?: "auto" | "required" | "none";
  providerOptions?: HostProtocolPayload;
  headers?: Record<string, string>;
  generateTextImpl?: VercelAiGenerateTextLike;
  streamTextImpl?: VercelAiStreamTextLike;
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

function extractThoughtSignature(raw: unknown, depth = 0): string | undefined {
  if (depth > 5 || raw === null || raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "object") {
    return undefined;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const nested = extractThoughtSignature(item, depth + 1);
      if (nested) {
        return nested;
      }
    }
    return undefined;
  }

  const record = raw as HostProtocolPayload;
  if (typeof record.thought_signature === "string") {
    return record.thought_signature;
  }
  if (typeof record.thoughtSignature === "string") {
    return record.thoughtSignature;
  }

  for (const value of Object.values(record)) {
    const nested = extractThoughtSignature(value, depth + 1);
    if (nested) {
      return nested;
    }
  }
  return undefined;
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
          output: {
            type: "json",
            value: message.content,
          },
        },
      ],
    };
  }

  if (message.role === "assistant") {
    if (message.raw_model_message && typeof message.raw_model_message === "object") {
      return message.raw_model_message;
    }
    const parts: HostProtocolPayload[] = [];
    const text = toMessageText(message.content);
    if (text) {
      parts.push({
        type: "text",
        text,
      });
    }
    for (const toolCall of message.toolCalls || []) {
      const thoughtSignature = toolCall.thought_signature;
      parts.push({
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        input: toolCall.input,
        ...(thoughtSignature
          ? {
              thought_signature: thoughtSignature,
              thoughtSignature,
            }
          : {}),
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

function getLastAssistantModelMessage(result: VercelAiGenerateTextResult): HostProtocolPayload | undefined {
  const response = toRecord(result.response);
  const rawMessages = Array.isArray(response.messages) ? response.messages : [];
  for (let i = rawMessages.length - 1; i >= 0; i -= 1) {
    const message = toRecord(rawMessages[i]);
    if (message.role === "assistant") {
      return message;
    }
  }
  return undefined;
}

function deriveAssistantText(
  fallbackText: unknown,
  rawAssistantMessage: HostProtocolPayload | undefined
): string {
  if (typeof fallbackText === "string" && fallbackText.trim()) {
    return fallbackText;
  }
  if (!rawAssistantMessage) {
    return "";
  }
  const rawContent = rawAssistantMessage.content;
  if (typeof rawContent === "string") {
    return rawContent;
  }
  if (Array.isArray(rawContent)) {
    for (const partRaw of rawContent) {
      const part = toRecord(partRaw);
      if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
        return part.text;
      }
    }
  }
  return "";
}

function toAsyncIterable(
  raw: unknown
): AsyncIterable<HostProtocolPayload> | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const candidate = raw as {
    [Symbol.asyncIterator]?: () => AsyncIterator<HostProtocolPayload>;
  };
  if (typeof candidate[Symbol.asyncIterator] !== "function") {
    return undefined;
  }
  return candidate as AsyncIterable<HostProtocolPayload>;
}

async function resolveMaybePromise<T>(value: unknown): Promise<T | undefined> {
  if (value === undefined) {
    return undefined;
  }
  return await Promise.resolve(value as T);
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
      const thoughtSignature = extractThoughtSignature(call);
      const toolCall: AgentLoopToolCall = {
        id: String(call.toolCallId || call.id || `tool_call_${index + 1}`),
        name,
        input: toRecord(call.input),
      };
      if (thoughtSignature) {
        toolCall.thought_signature = thoughtSignature;
      }
      return toolCall;
    })
    .filter((item): item is AgentLoopToolCall => item !== null);
}

function toAssistantMessage(
  input: AgentLoopTurnInput,
  result: VercelAiGenerateTextResult,
  toolCalls: AgentLoopToolCall[]
): AgentLoopAssistantMessage {
  const rawAssistantMessage = getLastAssistantModelMessage(result);
  const text = deriveAssistantText(result.text, rawAssistantMessage);
  return {
    role: "assistant",
    content: text || {
      status: toolCalls.length > 0 ? "tool_calls_requested" : "completed",
    },
    ...(rawAssistantMessage ? { raw_model_message: rawAssistantMessage } : {}),
  };
}

export function createVercelAiAgentLoopModelAdapter(
  options: CreateVercelAiAgentLoopModelAdapterOptions
): AgentLoopModelAdapter {
  const runGenerateText = options.generateTextImpl
    || (generateText as unknown as VercelAiGenerateTextLike);
  const runStreamText = options.streamTextImpl
    || (streamText as unknown as VercelAiStreamTextLike);

  async function runStreamingTurn(
    input: AgentLoopTurnInput,
    onEvent: AgentLoopStreamEventHandler
  ): Promise<AgentLoopModelTurnResult> {
    const streamResult = runStreamText({
      model: options.model as HostProtocolPayload,
      system: options.system,
      messages: input.messages.map(toVercelAiMessage),
      tools: toToolSet(input.tools),
      toolChoice: options.toolChoice,
      providerOptions: options.providerOptions,
      headers: options.headers,
    });
    const fullStream = toAsyncIterable(streamResult.fullStream);
    if (!fullStream) {
      return await createVercelAiAgentLoopModelAdapter({
        ...options,
        streamTextImpl: undefined,
      }).runTurn(input);
    }

    const pendingAssistantMessage: AgentLoopAssistantMessage = {
      role: "assistant",
      content: "",
    };
    let textSnapshot = "";
    let didStart = false;

    const ensureStarted = async () => {
      if (didStart) {
        return;
      }
      didStart = true;
      await onEvent({
        type: "assistant_text_started",
        message: {
          ...pendingAssistantMessage,
          ...(Array.isArray(pendingAssistantMessage.toolCalls)
            ? { toolCalls: [...pendingAssistantMessage.toolCalls] }
            : {}),
        },
      });
    };

    for await (const chunk of fullStream) {
      const part = toRecord(chunk);
      const type = String(part.type || "");
      if (type === "text-delta") {
        const delta = String(part.textDelta || part.delta || part.text || "");
        if (!delta) {
          continue;
        }
        await ensureStarted();
        textSnapshot += delta;
        pendingAssistantMessage.content = textSnapshot;
        await onEvent({
          type: "assistant_text_delta",
          delta,
          snapshot: textSnapshot,
          message: {
            ...pendingAssistantMessage,
            content: textSnapshot,
            ...(Array.isArray(pendingAssistantMessage.toolCalls)
              ? { toolCalls: [...pendingAssistantMessage.toolCalls] }
              : {}),
          },
        });
        continue;
      }

      if (type === "tool-call") {
        await ensureStarted();
        const [streamedCall] = extractToolCalls({
          toolCalls: [part],
        } as VercelAiGenerateTextResult);
        if (!streamedCall) {
          continue;
        }
        pendingAssistantMessage.toolCalls = [
          ...(pendingAssistantMessage.toolCalls || []),
          streamedCall,
        ];
        if (!textSnapshot) {
          pendingAssistantMessage.content = {
            status: "tool_calls_requested",
          };
        }
        await onEvent({
          type: "tool_call_started",
          call: streamedCall,
          message: {
            ...pendingAssistantMessage,
            ...(Array.isArray(pendingAssistantMessage.toolCalls)
              ? { toolCalls: [...pendingAssistantMessage.toolCalls] }
              : {}),
          },
        });
      }
    }

    const normalizedResult: VercelAiGenerateTextResult = {
      text: await resolveMaybePromise<string>(streamResult.text),
      finishReason: await resolveMaybePromise<string>(streamResult.finishReason),
      toolCalls: await resolveMaybePromise<unknown[]>(streamResult.toolCalls),
      steps: await resolveMaybePromise<unknown[]>(streamResult.steps),
      response: await resolveMaybePromise<unknown>(streamResult.response),
    };

    const toolCalls = extractToolCalls(normalizedResult);
    return {
      assistantMessage: toAssistantMessage(input, normalizedResult, toolCalls),
      toolCalls,
      stopReason:
        typeof normalizedResult.finishReason === "string"
          ? normalizedResult.finishReason
          : undefined,
    };
  }

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
    runTurnStream: runStreamingTurn,
  };
}

