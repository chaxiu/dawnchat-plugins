export interface SessionTaskProgress {
  status: "idle" | "running" | "paused" | "completed" | "failed";
  current_task_id?: string;
  completed_steps?: number;
  total_steps?: number;
  summary?: string;
}

export interface ActiveResourceContext {
  resource_type: string;
  resource_id?: string;
  title?: string;
  view_id: string;
  state_summary: Record<string, unknown>;
}

export interface SessionPendingWait {
  action_type: "flow.wait";
  session_id: string;
  step_id?: string;
  step_index?: number;
  total_steps?: number;
  event_types: string[];
  match?: Record<string, unknown>;
  timeout_ms?: number;
  event_cursor_seq: number;
  waiting_since_ms: number;
}

export interface SessionContinuation {
  last_completed_step_index?: number;
  last_completed_step_id?: string;
  event_cursor_seq: number;
  pending_wait: SessionPendingWait | null;
}
