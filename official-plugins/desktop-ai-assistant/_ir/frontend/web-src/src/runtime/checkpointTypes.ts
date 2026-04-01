import type {
  WorkspaceCheckpointStatus,
  WorkspaceContinuation,
  WorkspaceSnapshot,
} from "./workspaceTypes";

export interface WorkspaceCheckpointRecord {
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
  snapshot: WorkspaceSnapshot;
}

export interface WorkspaceCheckpointSummary {
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
  continuation_hint: WorkspaceContinuation;
}

export interface WorkspaceResumeRequest {
  resume_token: string;
}

export interface WorkspaceResumeResult {
  resumed: boolean;
  checkpoint_id: string;
  restored_view_id: string;
  restored_resource_id?: string;
  restored_anchor?: string;
  continuation_hint: WorkspaceContinuation;
}
