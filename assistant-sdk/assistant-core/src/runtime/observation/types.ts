export interface SessionTaskProgress {
  status: "idle" | "running" | "paused" | "completed" | "failed";
  current_task_id?: string;
  completed_steps?: number;
  total_steps?: number;
  summary?: string;
}

export interface ActiveStateBindingContext {
  binding_type: string;
  binding_label?: string;
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
  waiting_since_ms: number;
}

export interface SessionContinuation {
  last_completed_step_index?: number;
  last_completed_step_id?: string;
  pending_wait: SessionPendingWait | null;
}
