export const WORKSPACE_HISTORY_LIMIT = 5000;

export type WorkspaceSnapshotReason = "manual_checkpoint" | "session_completed";

export interface WorkspaceMeta {
  workspace_id: string;
  surface_id: string;
  title?: string;
  created_at_ms: number;
  updated_at_ms: number;
}

export interface WorkspaceHeadRecord extends WorkspaceMeta {
  persistence_version: number;
  view_id: string;
  head_payload: Record<string, unknown>;
}

export interface WorkspaceSnapshotSummary {
  workspace_id: string;
  seq: number;
  reason: WorkspaceSnapshotReason;
  author?: string;
  session_id?: string;
  created_at_ms: number;
}

export interface WorkspaceCurrentContext {
  workspace_id: string;
  surface_id: string;
  title?: string;
  view_id: string;
}

export interface WorkspaceStore {
  getLastActiveSurfaceId(): Promise<string | null>;
  setLastActiveSurfaceId(surfaceId: string | null): Promise<void>;

  getActiveWorkspaceId(surfaceId: string): Promise<string | null>;
  setActiveWorkspace(surfaceId: string, workspaceId: string): Promise<void>;

  listWorkspaces(surfaceId: string): Promise<WorkspaceMeta[]>;

  renameWorkspace(workspaceId: string, title: string): Promise<WorkspaceMeta | null>;

  createWorkspaceWithHead(input: {
    workspace_id: string;
    surface_id: string;
    title?: string;
    persistence_version: number;
    view_id: string;
    head_payload: Record<string, unknown>;
  }): Promise<void>;

  getWorkspaceHead(workspaceId: string): Promise<WorkspaceHeadRecord | null>;

  updateHead(workspaceId: string, input: {
    persistence_version: number;
    view_id: string;
    head_payload: Record<string, unknown>;
  }): Promise<void>;

  appendSnapshot(workspaceId: string, input: {
    reason: WorkspaceSnapshotReason;
    author?: string;
    session_id?: string;
    payload: Record<string, unknown>;
  }): Promise<void>;

  countHistorySnapshots(workspaceId: string): Promise<number>;

  listSnapshots(
    workspaceId: string,
    options?: { limit?: number }
  ): Promise<WorkspaceSnapshotSummary[]>;

  getSnapshotBySeq(
    workspaceId: string,
    seq: number
  ): Promise<(WorkspaceSnapshotSummary & { payload: Record<string, unknown> }) | null>;

  /** Test / reset only */
  clearAll(): Promise<void>;
}
