export interface WorkspaceTaskProgress {
  status: "idle" | "running" | "paused" | "completed" | "failed";
  current_task_id?: string;
  completed_steps?: number;
  total_steps?: number;
  summary?: string;
}

export interface WorkspaceArtifact {
  id: string;
  kind: string;
  title?: string;
  resource_type?: string;
  resource_id?: string;
  view_id?: string;
  created_at_ms?: number;
  updated_at_ms?: number;
  data?: Record<string, unknown>;
}

export interface WorkspaceResourceSlice {
  // Phase 10 boundary: this is a single "active resource" summary,
  // not a multi-resource aggregation map.
  resource_type: string;
  resource_id?: string;
  title?: string;
  view_id: string;
  state_summary: Record<string, unknown>;
  artifact_ids: string[];
  artifact_count: number;
}

export interface WorkspacePendingWait {
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

export interface WorkspaceContinuation {
  last_completed_step_index?: number;
  last_completed_step_id?: string;
  event_cursor_seq: number;
  pending_wait: WorkspacePendingWait | null;
}
