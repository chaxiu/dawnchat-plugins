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

export interface WorkspaceStore {
  getLastActiveSurfaceId(): Promise<string | null>;
  setLastActiveSurfaceId(surfaceId: string | null): Promise<void>;

  getActiveWorkspaceId(surfaceId: string): Promise<string | null>;
  setActiveWorkspace(surfaceId: string, workspaceId: string): Promise<void>;

  listWorkspaces(surfaceId: string): Promise<WorkspaceMeta[]>;

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

  /** Test / reset only */
  clearAll(): Promise<void>;
}
