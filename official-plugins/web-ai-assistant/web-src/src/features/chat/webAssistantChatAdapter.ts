import type {
  ChatMessageListLabels,
  ChatTimelineItem,
  ChatToolDisplayMeta,
  ChatWaitingReason,
} from "@dawnchat/assistant-chat-ui";
import type { AgentLoopMessage } from "@dawnchat/host-orchestration-sdk/agent-loop";

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

function oneLinePreview(content: unknown, maxLength = 80): string {
  const text = stringifyContent(content).replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getAssistantContentText(message: AgentLoopMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (
    message.content &&
    typeof message.content === "object" &&
    "status" in message.content &&
    (message.content as { status?: string }).status === "tool_calls_requested"
  ) {
    return "";
  }
  return stringifyContent(message.content);
}

function createPendingToolDisplay(toolName: string, input: unknown): Partial<ChatToolDisplayMeta> {
  const argsText = stringifyContent(input);
  return {
    kind: "other",
    renderMode: "collapsible",
    toolName,
    argsText,
    argsPreview: argsText.replace(/\s+/g, " ").trim(),
    fullInputText: argsText,
    hasInput: Boolean(argsText),
    hasDetails: Boolean(argsText),
    title: toolName,
    summary: toolName,
    detailsText: argsText,
    fullOutputText: "",
    fullErrorText: "",
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

function createResultToolDisplay(toolName: string, content: unknown): Partial<ChatToolDisplayMeta> {
  const detailsText = stringifyContent(content);
  const preview = oneLinePreview(content);
  return {
    kind: "other",
    renderMode: "collapsible",
    toolName,
    argsText: "",
    argsPreview: "",
    fullInputText: "",
    hasInput: false,
    hasDetails: Boolean(detailsText),
    title: preview ? `${toolName} · ${preview}` : toolName,
    summary: preview || toolName,
    detailsText,
    fullOutputText: detailsText,
    fullErrorText: detailsText,
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

export function toWebAssistantTimelineItems(
  transcript: AgentLoopMessage[],
  options: { isRunning: boolean }
): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];

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
          items.push({
            id: `assistant-tool-${index}-${toolIndex}`,
            kind: "part",
            role: "assistant",
            item: {
              id: `assistant-tool-item-${index}-${toolIndex}`,
              type: "tool",
              tool: toolCall.name,
              status: "pending",
              text: toolCall.name,
              toolDisplay: createPendingToolDisplay(toolCall.name, toolCall.input),
              isStreaming: options.isRunning,
            },
          });
        });
      }
      return;
    }

    if (message.role === "tool") {
      const toolName = message.name || "tool";
      const toolContent = message.content;
      const isError =
        typeof toolContent === "object" &&
        toolContent !== null &&
        "ok" in toolContent &&
        (toolContent as { ok?: boolean }).ok === false;
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
          toolDisplay: createResultToolDisplay(toolName, toolContent),
          isStreaming: false,
        },
      });
      return;
    }
  });

  return items;
}

export function getWebAssistantLabels(): Partial<ChatMessageListLabels> {
  return {
    userLabel: "You",
    assistantLabel: "Assistant",
    emptyText: "No messages yet.",
    streamingText: "Running...",
    planSwitchLabel: "Switch to Build",
    planQuickSwitchTip: "Once planning is complete, switch to Build to execute.",
    waitingGeneratingText: "Assistant is responding...",
    waitingPermissionText: "Waiting for permission to continue...",
    waitingQuestionText: "Waiting for your answer to continue...",
    waitingStalledText: "Connected, waiting for the run result...",
  };
}

export function getWebAssistantWaitingReason(input: {
  isRunning: boolean;
  transcript: AgentLoopMessage[];
}): ChatWaitingReason {
  if (!input.isRunning) {
    return "";
  }
  return "generating";
}
