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

export interface AgentLoopLikeAssistantMessage {
  role: "assistant";
  content: unknown;
  toolCalls?: AgentLoopLikeToolCall[];
  name?: string;
}

export interface AgentLoopLikeToolMessage {
  role: "tool";
  content: unknown;
  name?: string;
  toolCallId?: string;
}

export interface AgentLoopLikeUserOrSystemMessage {
  role: "user" | "system";
  content: unknown;
  name?: string;
}

export type AgentLoopLikeMessage =
  | AgentLoopLikeAssistantMessage
  | AgentLoopLikeToolMessage
  | AgentLoopLikeUserOrSystemMessage;

export interface AgentLoopTranscriptToTimelineItemsOptions {
  isRunning: boolean;
  getToolDescription?: (toolName: string) => string;
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

export function agentLoopTranscriptToTimelineItems(
  transcript: AgentLoopLikeMessage[],
  options: AgentLoopTranscriptToTimelineItemsOptions
): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];
  const toolItemByCallId = new Map<string, ChatRenderItem>();

  transcript.forEach((message, index) => {
    if (message.role === "user") {
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
            isStreaming: options.isRunning && index === transcript.length - 1,
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
            isStreaming: options.isRunning,
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

  return items;
}
