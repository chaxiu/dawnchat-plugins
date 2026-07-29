import type {
  ChatRenderItem,
  ChatTimelineItem,
  ChatToolDisplayMeta,
} from "../types";

export interface AgentLoopLikeToolCall {
  id: string;
  name: string;
  input?: unknown;
}

export interface AgentLoopLikeMessagePart {
  id: string;
  type: string;
  text?: string;
  tool?: string;
  callID?: string;
  callId?: string;
  status?: string;
  state?: Record<string, unknown>;
  reason?: string;
  [key: string]: unknown;
}

export interface AgentLoopLikeAssistantMessage {
  role: "assistant";
  content: unknown;
  toolCalls?: AgentLoopLikeToolCall[];
  name?: string;
  parts?: AgentLoopLikeMessagePart[];
}

export interface AgentLoopLikeToolMessage {
  role: "tool";
  content: unknown;
  name?: string;
  toolCallId?: string;
  parts?: AgentLoopLikeMessagePart[];
}

export interface AgentLoopLikeUserOrSystemMessage {
  role: "user" | "system";
  content: unknown;
  name?: string;
  parts?: AgentLoopLikeMessagePart[];
}

export type AgentLoopLikeMessage =
  | AgentLoopLikeAssistantMessage
  | AgentLoopLikeToolMessage
  | AgentLoopLikeUserOrSystemMessage;

export interface AgentLoopTranscriptToTimelineItemsOptions {
  isRunning: boolean;
  getToolDescription?: (toolName: string) => string;
}

export interface AgentLoopTranscriptProjection {
  timelineItems: ChatTimelineItem[];
  activeReasoningItemId: string;
}

interface ToolDisplayBuildOptions {
  toolName: string;
  input?: unknown;
  result?: unknown;
  status: "pending" | "completed" | "error";
  getToolDescription?: (toolName: string) => string;
}

function stringifyContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function extractDisplayTitle(content: unknown): string {
  const record = toRecord(content);
  const display = toRecord(record.display);
  const directDisplayTitle = String(display.title || "").trim();
  if (directDisplayTitle) {
    return directDisplayTitle;
  }

  const directTitle = String(record.title || "").trim();
  if (directTitle) {
    return directTitle;
  }

  const data = toRecord(record.data);
  const nestedDisplay = toRecord(data.display);
  const nestedTitle = String(nestedDisplay.title || "").trim();
  if (nestedTitle) {
    return nestedTitle;
  }

  return "";
}

function buildToolTitle(
  toolName: string,
  result: unknown,
  getToolDescription?: (toolName: string) => string
): string {
  return (
    extractDisplayTitle(result)
    || String(getToolDescription?.(toolName) || "").trim()
    || toolName
  );
}

function buildToolDisplay({
  toolName,
  input,
  result,
  status,
  getToolDescription,
}: ToolDisplayBuildOptions): Partial<ChatToolDisplayMeta> {
  const rawInputText = input === undefined ? "" : stringifyContent(input).trim();
  const detailsText = result === undefined ? "" : stringifyContent(result).trim();
  const title = buildToolTitle(toolName, result, getToolDescription);
  const isError =
    status === "error"
    || (
      result !== undefined
      && typeof result === "object"
      && result !== null
      && "ok" in result
      && (result as { ok?: boolean }).ok === false
    );

  return {
    kind: "other",
    renderMode: "collapsible",
    toolName,
    argsText: "",
    argsPreview: "",
    openPath: "",
    fullInputText: rawInputText,
    fullOutputText: detailsText,
    fullErrorText: isError ? detailsText : "",
    hasInput: Boolean(rawInputText),
    hasOutput: Boolean(detailsText),
    hasError: isError,
    hasDetails: Boolean(detailsText),
    title,
    summary: title,
    detailBody: detailsText,
    detailsText,
    diffStat: "",
    command: "",
    outputTail: "",
    patchPreview: "",
    languageHint: "json",
    codeLines: [],
    previewLineCount: 4,
    hiddenLineCount: 0,
  };
}

function getAssistantContentText(message: AgentLoopLikeMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (
    message.content
    && typeof message.content === "object"
    && "status" in message.content
    && (message.content as { status?: string }).status === "tool_calls_requested"
  ) {
    return "";
  }
  return stringifyContent(message.content);
}

function normalizePartType(part: AgentLoopLikeMessagePart): string {
  const rawType = String(part.type || "").trim().toLowerCase();
  if (!rawType) return "unknown";
  if (rawType === "step-start" || rawType === "step-finish") return "step";
  return rawType;
}

function getPartCallId(part: AgentLoopLikeMessagePart): string {
  return String(part.callID || part.callId || "").trim();
}

function getPartStatus(part: AgentLoopLikeMessagePart, fallback: "pending" | "completed" | "error"): "pending" | "completed" | "error" {
  const state = toRecord(part.state);
  const rawStatus = String(state.status || part.status || "").trim().toLowerCase();
  if (rawStatus === "completed" || rawStatus === "success" || rawStatus === "done") return "completed";
  if (rawStatus === "error" || rawStatus === "failed" || rawStatus === "rejected") return "error";
  if (rawStatus === "running" || rawStatus === "pending" || rawStatus === "streaming") return "pending";
  return fallback;
}

function findLastAssistantIndex(transcript: AgentLoopLikeMessage[]): number {
  for (let i = transcript.length - 1; i >= 0; i -= 1) {
    if (transcript[i]?.role === "assistant") {
      return i;
    }
  }
  return -1;
}

function partSupersedesReasoning(type: string): boolean {
  return type === "text" || type === "tool";
}

/**
 * Streaming flags drive ChatMessageList reasoning expand/collapse:
 * - historical turns: never streaming
 * - live reasoning: streaming only until later text/tool appears
 * - live text: streaming only for the latest text part in the turn
 */
function isAssistantPartStreaming(opts: {
  role: "user" | "assistant";
  type: string;
  partIndex: number;
  parts: AgentLoopLikeMessagePart[];
  isRunning: boolean;
  isCurrentAssistantTurn: boolean;
}): boolean {
  if (!opts.isRunning || opts.role !== "assistant" || !opts.isCurrentAssistantTurn) {
    return false;
  }
  if (opts.type === "reasoning") {
    for (let i = opts.partIndex + 1; i < opts.parts.length; i += 1) {
      const later = opts.parts[i];
      if (!later) continue;
      if (partSupersedesReasoning(normalizePartType(later))) {
        return false;
      }
    }
    return true;
  }
  if (opts.type === "text") {
    for (let i = opts.partIndex + 1; i < opts.parts.length; i += 1) {
      const later = opts.parts[i];
      if (!later) continue;
      if (normalizePartType(later) === "text") {
        return false;
      }
    }
    return true;
  }
  return false;
}

function createToolRenderItem(
  part: AgentLoopLikeMessagePart,
  options: AgentLoopTranscriptToTimelineItemsOptions,
  fallbackStatus: "pending" | "completed" | "error",
  isCurrentAssistantTurn: boolean
): ChatRenderItem {
  const state = toRecord(part.state);
  const status = getPartStatus(part, fallbackStatus);
  const toolName = String(part.tool || "tool");
  const input = state.input ?? part.input;
  const error = state.error ?? part.error;
  const output = state.output ?? part.output;
  const result = error !== undefined ? { ok: false, error } : output !== undefined ? { ok: true, output } : undefined;

  return {
    id: String(part.id || `${toolName}-${getPartCallId(part) || "tool"}`),
    type: "tool",
    tool: toolName,
    status,
    text: toolName,
    callID: getPartCallId(part),
    toolDisplay: buildToolDisplay({
      toolName,
      input,
      result,
      status,
      getToolDescription: options.getToolDescription,
    }),
    raw: part,
    isStreaming: options.isRunning && isCurrentAssistantTurn && status === "pending",
  };
}

function appendPartTimelineItems(
  items: ChatTimelineItem[],
  toolItemByCallId: Map<string, ChatRenderItem>,
  role: "user" | "assistant",
  parts: AgentLoopLikeMessagePart[],
  options: AgentLoopTranscriptToTimelineItemsOptions,
  index: number,
  isCurrentAssistantTurn: boolean
) {
  parts.forEach((part, partIndex) => {
    const id = String(part.id || `${role}-part-${index}-${partIndex}`);
    const type = normalizePartType(part);
    if (type === "tool") {
      const toolItem = createToolRenderItem(
        part,
        options,
        role === "assistant" ? "pending" : "completed",
        isCurrentAssistantTurn
      );
      const callId = getPartCallId(part);
      if (callId) {
        toolItemByCallId.set(callId, toolItem);
      }
      items.push({
        id: `${role}-tool-${index}-${partIndex}`,
        kind: "part",
        role,
        item: toolItem,
      });
      return;
    }

    const itemType = type === "text" || type === "reasoning" || type === "step" ? type : "unknown";
    items.push({
      id: `${role}-${itemType}-${index}-${partIndex}`,
      kind: "part",
      role,
      item: {
        id,
        type: itemType,
        text: String(part.text || ""),
        reason: String(part.reason || ""),
        callID: getPartCallId(part),
        raw: part,
        isStreaming: isAssistantPartStreaming({
          role,
          type: itemType,
          partIndex,
          parts,
          isRunning: options.isRunning,
          isCurrentAssistantTurn,
        }),
      },
    });
  });
}

function mergeToolMessagePart(
  items: ChatTimelineItem[],
  toolItemByCallId: Map<string, ChatRenderItem>,
  part: AgentLoopLikeMessagePart,
  options: AgentLoopTranscriptToTimelineItemsOptions,
  index: number,
  partIndex: number
) {
  const toolItem = createToolRenderItem(part, options, "completed", true);
  const callId = getPartCallId(part);
  const matchedToolItem = callId ? toolItemByCallId.get(callId) : null;
  if (matchedToolItem) {
    matchedToolItem.status = toolItem.status;
    matchedToolItem.isStreaming = false;
    matchedToolItem.toolDisplay = toolItem.toolDisplay;
    matchedToolItem.raw = part;
    return;
  }

  items.push({
    id: `tool-part-${index}-${partIndex}`,
    kind: "part",
    role: "assistant",
    item: toolItem,
  });
}

export function projectAgentLoopTranscript(
  transcript: AgentLoopLikeMessage[],
  options: AgentLoopTranscriptToTimelineItemsOptions
): AgentLoopTranscriptProjection {
  const items: ChatTimelineItem[] = [];
  const toolItemByCallId = new Map<string, ChatRenderItem>();
  const lastAssistantIndex = findLastAssistantIndex(transcript);

  transcript.forEach((message, index) => {
    const parts = Array.isArray(message.parts) ? message.parts.filter((part): part is AgentLoopLikeMessagePart => Boolean(part)) : [];
    const isCurrentAssistantTurn = options.isRunning && index === lastAssistantIndex;

    if (message.role === "user") {
      if (parts.length > 0) {
        appendPartTimelineItems(items, toolItemByCallId, "user", parts, options, index, false);
        return;
      }
      items.push({
        id: `user-${index}`,
        kind: "part",
        role: "user",
        item: {
          id: `user-text-${index}`,
          type: "text",
          text: typeof message.content === "string" ? message.content : stringifyContent(message.content),
          isStreaming: false,
        },
      });
      return;
    }

    if (message.role === "assistant") {
      if (parts.length > 0) {
        appendPartTimelineItems(
          items,
          toolItemByCallId,
          "assistant",
          parts,
          options,
          index,
          isCurrentAssistantTurn
        );
        return;
      }
      const assistantText = getAssistantContentText(message);
      if (assistantText) {
        items.push({
          id: `assistant-${index}`,
          kind: "part",
          role: "assistant",
          item: {
            id: `assistant-text-${index}`,
            type: "text",
            text: assistantText,
            isStreaming: isCurrentAssistantTurn,
          },
        });
      }

      if (Array.isArray(message.toolCalls)) {
        message.toolCalls.forEach((toolCall, toolIndex) => {
          const item: ChatRenderItem = {
            id: `assistant-tool-item-${index}-${toolIndex}`,
            type: "tool",
            tool: toolCall.name,
            status: "pending",
            text: toolCall.name,
            callID: toolCall.id,
            toolDisplay: buildToolDisplay({
              toolName: toolCall.name,
              input: toolCall.input,
              status: "pending",
              getToolDescription: options.getToolDescription,
            }),
            isStreaming: isCurrentAssistantTurn,
          };
          toolItemByCallId.set(toolCall.id, item);
          items.push({
            id: `assistant-tool-${index}-${toolIndex}`,
            kind: "part",
            role: "assistant",
            item,
          });
        });
      }
      return;
    }

    if (message.role === "tool") {
      if (parts.length > 0) {
        parts.forEach((part, partIndex) => {
          if (normalizePartType(part) !== "tool") return;
          mergeToolMessagePart(items, toolItemByCallId, part, options, index, partIndex);
        });
        return;
      }
      const toolName = message.name || "tool";
      const toolContent = message.content;
      const isError = Boolean(
        typeof toolContent === "object"
        && toolContent !== null
        && "ok" in toolContent
        && (toolContent as { ok?: boolean }).ok === false
      );
      const matchedToolItem = message.toolCallId ? toolItemByCallId.get(message.toolCallId) : null;

      if (matchedToolItem) {
        const matchedInput =
          matchedToolItem.toolDisplay?.fullInputText
          || matchedToolItem.toolDisplay?.argsText
          || "";
        matchedToolItem.status = isError ? "error" : "completed";
        matchedToolItem.isStreaming = false;
        matchedToolItem.toolDisplay = buildToolDisplay({
          toolName,
          input: matchedInput,
          result: toolContent,
          status: isError ? "error" : "completed",
          getToolDescription: options.getToolDescription,
        });
        return;
      }

      items.push({
        id: `tool-${index}`,
        kind: "part",
        role: "assistant",
        item: {
          id: `tool-item-${index}`,
          type: "tool",
          tool: toolName,
          status: isError ? "error" : "completed",
          text: toolName,
          toolDisplay: buildToolDisplay({
            toolName,
            result: toolContent,
            status: isError ? "error" : "completed",
            getToolDescription: options.getToolDescription,
          }),
          isStreaming: false,
        },
      });
    }
  });

  let activeReasoningItemId = "";
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const timeline = items[i];
    if (timeline.kind !== "part") continue;
    if (timeline.item.type === "reasoning" && timeline.item.isStreaming) {
      activeReasoningItemId = timeline.item.id;
      break;
    }
  }

  return {
    timelineItems: items,
    activeReasoningItemId,
  };
}

export function agentLoopTranscriptToTimelineItems(
  transcript: AgentLoopLikeMessage[],
  options: AgentLoopTranscriptToTimelineItemsOptions
): ChatTimelineItem[] {
  return projectAgentLoopTranscript(transcript, options).timelineItems;
}
