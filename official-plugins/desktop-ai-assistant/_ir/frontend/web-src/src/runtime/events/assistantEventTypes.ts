export const ASSISTANT_RUNTIME_EVENT_TYPES = {
  SESSION_STEP_STARTED: "assistant.session.step.started",
  SESSION_STEP_COMPLETED: "assistant.session.step.completed",
  SESSION_STEP_FAILED: "assistant.session.step.failed",
  SESSION_STEP_CANCELLED: "assistant.session.step.cancelled",
  VIEW_STATE_APPLIED: "assistant.view.state.applied",
  VIEW_FORM_SUBMITTED: "assistant.view.form.submitted",
  GUIDE_NARRATE_PLAYING: "assistant.guide.narrate.playing",
  GUIDE_NARRATE_COMPLETED: "assistant.guide.narrate.completed",
  GUIDE_NARRATE_CANCELLED: "assistant.guide.narrate.cancelled",
  GUIDE_NARRATE_FAILED: "assistant.guide.narrate.failed",
  GUIDE_QUIZ_SUBMITTED: "assistant.guide.quiz.submitted",
  GUIDE_CONFIRM_RESPONDED: "assistant.guide.confirm.responded",
  CHECKPOINT_SAVED: "assistant.checkpoint.saved",
  CHECKPOINT_STATUS_CHANGED: "assistant.checkpoint.status",
  CHECKPOINT_RESUMED: "assistant.checkpoint.resumed",
} as const;

export type AssistantRuntimeEventType =
  (typeof ASSISTANT_RUNTIME_EVENT_TYPES)[keyof typeof ASSISTANT_RUNTIME_EVENT_TYPES];

export type AssistantRuntimeEventSource =
  | "session"
  | "flow"
  | "guide"
  | "view"
  | "workspace"
  | "checkpoint";

export interface AssistantRuntimeEventEnvelope {
  event_id: string;
  seq: number;
  type: AssistantRuntimeEventType;
  ts_ms: number;
  source: AssistantRuntimeEventSource;
  session_id?: string;
  step_id?: string;
  payload: Record<string, unknown>;
}

export interface AssistantRuntimeEventInput {
  type: AssistantRuntimeEventType;
  source: AssistantRuntimeEventSource;
  session_id?: string;
  step_id?: string;
  payload?: Record<string, unknown>;
}

export interface AssistantRuntimeEventMatchOptions {
  event_types?: AssistantRuntimeEventType[];
  session_id?: string;
  step_id?: string;
  payload_match?: Record<string, unknown>;
}

export interface AssistantRuntimeEventQueryOptions extends AssistantRuntimeEventMatchOptions {
  since_seq?: number;
  limit?: number;
}
