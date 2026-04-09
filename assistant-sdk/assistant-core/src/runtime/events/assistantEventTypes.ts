export const ASSISTANT_RUNTIME_EVENT_TYPES = {
  SESSION_STEP_STARTED: "assistant.session.step.started",
  SESSION_STEP_COMPLETED: "assistant.session.step.completed",
  SESSION_STEP_FAILED: "assistant.session.step.failed",
  SESSION_STEP_CANCELLED: "assistant.session.step.cancelled",
  VIEW_STATE_APPLIED: "assistant.view.state.applied",
  VIEW_FORM_SUBMITTED: "assistant.view.form.submitted",
  BOARD_NODE_SELECTED: "assistant.board.node_selected",
  MUSIC_NOTE_STARTED: "assistant.music.note_started",
  MUSIC_NOTE_ENDED: "assistant.music.note_ended",
  MUSIC_SEQUENCE_STOPPED: "assistant.music.sequence_stopped",
  MUSIC_KEY_PRESSED: "assistant.music.key_pressed",
  MUSIC_LESSON_NOTE_MATCHED: "assistant.music.lesson_note_matched",
  PLANE_ANIMATION_COMPLETED: "assistant.plane.animation_completed",
  TICTACTOE_CELL_SELECTED: "assistant.game.tictactoe.cell_selected",
  TICTACTOE_ROUND_FINISHED: "assistant.game.tictactoe.round_finished",
  GUIDE_NARRATE_PLAYING: "assistant.guide.narrate.playing",
  GUIDE_NARRATE_COMPLETED: "assistant.guide.narrate.completed",
  GUIDE_NARRATE_CANCELLED: "assistant.guide.narrate.cancelled",
  GUIDE_NARRATE_FAILED: "assistant.guide.narrate.failed",
  GUIDE_CARD_DISMISSED: "assistant.guide.card.dismissed",
  GUIDE_QUIZ_SUBMITTED: "assistant.guide.quiz.submitted",
  GUIDE_CONFIRM_RESPONDED: "assistant.guide.confirm.responded",
  SESSION_TASK_PROGRESS_UPDATED: "assistant.session.task_progress.updated",
} as const;

export type AssistantRuntimeEventType =
  (typeof ASSISTANT_RUNTIME_EVENT_TYPES)[keyof typeof ASSISTANT_RUNTIME_EVENT_TYPES];

export type AssistantRuntimeEventSource =
  | "session"
  | "flow"
  | "guide"
  | "view";

export interface AssistantRuntimeEventEnvelope {
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

