export type ChatRenderItemType = "text" | "tool" | "reasoning" | "step" | "unknown";

export interface ChatToolDisplayMeta {
  kind: "read" | "write" | "search" | "bash" | "other";
  renderMode: "inline" | "collapsible";
  toolName: string;
  argsText: string;
  argsPreview: string;
  fullInputText: string;
  fullOutputText: string;
  fullErrorText: string;
  hasInput: boolean;
  hasOutput: boolean;
  hasError: boolean;
  hasDetails: boolean;
  title: string;
  summary: string;
  detailBody: string;
  detailsText: string;
  command: string;
  outputTail: string;
  diffStat: string;
  patchPreview: string;
  languageHint: string;
  codeLines: string[];
  previewLineCount: number;
  hiddenLineCount: number;
}

export interface ChatRenderItem {
  id: string;
  type: ChatRenderItemType;
  text?: string;
  tool?: string;
  status?: string;
  reason?: string;
  messageID?: string;
  callID?: string;
  toolDisplay?: Partial<ChatToolDisplayMeta>;
  raw?: unknown;
  isStreaming: boolean;
}

export interface ChatPermissionCard {
  id: string;
  tool: string;
  detail: string;
  status: "pending" | "approved" | "rejected";
}

export interface ChatQuestionOption {
  label: string;
  description: string;
}

export interface ChatQuestionInfo {
  question: string;
  header: string;
  options: ChatQuestionOption[];
  multiple?: boolean;
  custom?: boolean;
}

export interface ChatQuestionCard {
  id: string;
  questions: ChatQuestionInfo[];
}

export interface ChatTodoItem {
  id: string;
  content: string;
  status: string;
}

export interface ChatTimelinePart {
  id: string;
  kind: "part";
  role: string;
  item: ChatRenderItem;
}

export interface ChatTimelinePermission {
  id: string;
  kind: "permission";
  permission: ChatPermissionCard;
}

export interface ChatTimelineQuestion {
  id: string;
  kind: "question";
  question: ChatQuestionCard;
}

export interface ChatTimelineTodo {
  id: string;
  kind: "todo";
  todos: ChatTodoItem[];
}

export interface ChatTaskInfo {
  id: string;
  title: string;
  status?: "pending" | "running" | "completed" | "failed" | string;
  summary?: string;
  agentLabel?: string;
}

export interface ChatTimelineTask {
  id: string;
  kind: "task";
  task: ChatTaskInfo;
}

export interface ChatFileEditFile {
  path: string;
  displayName: string;
  unifiedDiff: string;
  additions: number;
  deletions: number;
  previewMode: "diff" | "content";
  contentPreview?: string;
}

export interface ChatFileEditInfo {
  id: string;
  callId: string | null;
  tool: "edit" | "write" | "apply_patch";
  status: string;
  files: ChatFileEditFile[];
}

export interface ChatTimelineFileEdit {
  id: string;
  kind: "file-edit";
  fileEdit: ChatFileEditInfo;
}

export type ChatTimelineItem =
  | ChatTimelinePart
  | ChatTimelinePermission
  | ChatTimelineQuestion
  | ChatTimelineTodo
  | ChatTimelineTask
  | ChatTimelineFileEdit;

export type ChatWaitingReason =
  | ""
  | "generating"
  | "waiting_permission"
  | "waiting_question"
  | "stalled";

export interface ChatMessageListLabels {
  userLabel: string;
  assistantLabel: string;
  emptyText: string;
  streamingText: string;
  errorLabel: string;
  errorDetailToggle: string;
  toolInputAriaLabel: string;
  toolInputTitle: string;
  toolNameLabel: string;
  planSwitchLabel: string;
  planQuickSwitchTip: string;
  permissionRequiredLabel: string;
  allowOnceLabel: string;
  alwaysAllowLabel: string;
  rejectLabel: string;
  questionRequiredLabel: string;
  questionLabel: string;
  customAnswerLabel: string;
  submitLabel: string;
  todoTitle: string;
  todoCollapseLabel: string;
  todoExpandLabel: string;
  taskOpenHintLabel: string;
  fileEditExpandLabel: string;
  fileEditCollapseLabel: string;
  waitingGeneratingText: string;
  waitingPermissionText: string;
  waitingQuestionText: string;
  waitingStalledText: string;
}

export const DEFAULT_CHAT_MESSAGE_LIST_LABELS: ChatMessageListLabels = {
  userLabel: "You",
  assistantLabel: "Assistant",
  emptyText: "No messages yet.",
  streamingText: "Generating",
  errorLabel: "Error",
  errorDetailToggle: "View error details",
  toolInputAriaLabel: "View tool input",
  toolInputTitle: "Tool Input",
  toolNameLabel: "Tool",
  planSwitchLabel: "Switch to Build",
  planQuickSwitchTip: "Once planning is complete, switch to Build to execute.",
  permissionRequiredLabel: "Permission required",
  allowOnceLabel: "Allow once",
  alwaysAllowLabel: "Always allow",
  rejectLabel: "Reject",
  questionRequiredLabel: "Input required",
  questionLabel: "Question",
  customAnswerLabel: "Custom answer",
  submitLabel: "Submit",
  todoTitle: "Todo",
  todoCollapseLabel: "Collapse",
  todoExpandLabel: "Expand",
  taskOpenHintLabel: "View details",
  fileEditExpandLabel: "Expand",
  fileEditCollapseLabel: "Collapse",
  waitingGeneratingText: "Thinking...",
  waitingPermissionText: "Waiting for permission to continue",
  waitingQuestionText: "Waiting for your answer to continue",
  waitingStalledText: "Connected, waiting for the run result...",
};
