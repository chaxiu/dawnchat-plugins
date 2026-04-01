import type { GuideStateSnapshot } from "./guideState";
import type { ViewResourceBinding } from "./viewManifest";
import type { ViewStateSnapshot } from "./viewState";

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

export interface WorkspaceCheckpointMeta {
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

export interface WorkspaceSnapshot {
  workspace_version: number;
  active_resource: ViewResourceBinding | null;
  active_view: string;
  active_anchor: string;
  task_progress: WorkspaceTaskProgress;
  artifacts: WorkspaceArtifact[];
  guide_state: GuideStateSnapshot;
  view_state: ViewStateSnapshot;
  last_checkpoint_meta: WorkspaceCheckpointMeta | null;
}
