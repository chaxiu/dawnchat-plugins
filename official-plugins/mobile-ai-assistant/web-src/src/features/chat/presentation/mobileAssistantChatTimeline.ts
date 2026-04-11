/**
 * Bridge from agent-loop transcript messages to @dawnchat/assistant-chat-ui timeline items.
 * Presentation-only: does not manage session state or orchestration.
 */
import type {
  AgentLoopTranscriptToTimelineItemsOptions,
  ChatMessageListLabels,
  ChatTimelineItem,
  ChatWaitingReason,
} from "@dawnchat/assistant-chat-ui";
import {
  agentLoopTranscriptToTimelineItems,
  DEFAULT_CHAT_MESSAGE_LIST_LABELS,
} from "@dawnchat/assistant-chat-ui";
import type { AgentLoopMessage } from "@dawnchat/host-orchestration-sdk/agent-loop";

import { listMobileAssistantToolDefinitions } from "../../../runtime/tools/mobileAssistantHostToolDefinitions";

const TOOL_DESCRIPTION_BY_NAME = new Map(
  listMobileAssistantToolDefinitions().map((definition) => [
    definition.name,
    String(definition.description || "").trim(),
  ])
);

function getToolDescription(toolName: string): string {
  return TOOL_DESCRIPTION_BY_NAME.get(toolName) || "";
}

export function toMobileAssistantTimelineItems(
  transcript: AgentLoopMessage[],
  options: { isRunning: boolean }
): ChatTimelineItem[] {
  const adapterOptions: AgentLoopTranscriptToTimelineItemsOptions = {
    isRunning: options.isRunning,
    getToolDescription,
  };
  return agentLoopTranscriptToTimelineItems(transcript, adapterOptions);
}

export function getMobileAssistantLabels(): ChatMessageListLabels {
  return {
    ...DEFAULT_CHAT_MESSAGE_LIST_LABELS,
    userLabel: "You",
    assistantLabel: "Assistant",
    emptyText: "No messages yet.",
    streamingText: "Running...",
    errorLabel: "Error",
    errorDetailToggle: "View error details",
    toolInputAriaLabel: "View tool input",
    toolInputTitle: "Tool Input",
    toolNameLabel: "Tool",
    planSwitchLabel: "Switch to Build",
    planQuickSwitchTip: "Once planning is complete, switch to Build to execute.",
    waitingGeneratingText: "Assistant is responding...",
    waitingPermissionText: "Waiting for permission to continue...",
    waitingQuestionText: "Waiting for your answer to continue...",
    waitingStalledText: "Connected, waiting for the run result...",
  };
}

export function getMobileAssistantWaitingReason(input: {
  isRunning: boolean;
  transcript: AgentLoopMessage[];
}): ChatWaitingReason {
  if (!input.isRunning) {
    return "";
  }
  return "generating";
}
