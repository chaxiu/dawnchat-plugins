import type { GuideStateSnapshot } from "./guideState";
import type { ViewResourceBinding } from "./viewManifest";
import type { ViewStateSnapshot } from "./viewState";

export const WORKSPACE_SCHEMA_VERSION = 2;

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
  data?: Record<string, unknown>;
}

export type WorkspaceCheckpointStatus =
  | "checkpointed"
  | "cancelled"
  | "failed"
  | "resumed";

export interface WorkspaceCheckpointMeta {
  checkpoint_id: string;
  resume_token: string;
  saved_at_ms: number;
  trigger: string;
  status: WorkspaceCheckpointStatus;
  scene_view_id: string;
  resource_id?: string;
  workspace_schema_version: number;
  source_action_type?: string;
  session_id?: string;
  step_id?: string;
  reason_code?: string;
  error_code?: string;
  error_message?: string;
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

export interface WorkspaceSnapshot {
  workspace_schema_version: number;
  workspace_version: number;
  active_resource: ViewResourceBinding | null;
  active_view: string;
  active_anchor: string;
  task_progress: WorkspaceTaskProgress;
  artifacts: WorkspaceArtifact[];
  guide_state: GuideStateSnapshot;
  view_state: ViewStateSnapshot;
  continuation: WorkspaceContinuation;
  last_checkpoint_meta: WorkspaceCheckpointMeta | null;
}
