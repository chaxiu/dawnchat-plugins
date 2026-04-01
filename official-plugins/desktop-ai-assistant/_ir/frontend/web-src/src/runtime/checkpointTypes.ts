import type { WorkspaceSnapshot } from "./workspaceTypes";

export interface WorkspaceCheckpointRecord {
  checkpoint_id: string;
  resume_token: string;
  saved_at_ms: number;
  trigger: string;
  status: "checkpointed" | "cancelled" | "failed" | "resumed";
  scene_view_id: string;
  resource_id?: string;
  source_action_type?: string;
  session_id?: string;
  step_id?: string;
  error_code?: string;
  error_message?: string;
  snapshot: WorkspaceSnapshot;
}

export interface WorkspaceCheckpointSummary {
  checkpoint_id: string;
  resume_token: string;
  saved_at_ms: number;
  trigger: string;
  status: "checkpointed" | "cancelled" | "failed" | "resumed";
  scene_view_id: string;
  resource_id?: string;
  error_code?: string;
  error_message?: string;
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
}
