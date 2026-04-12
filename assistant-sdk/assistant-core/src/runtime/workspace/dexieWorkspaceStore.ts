import Dexie, { type Table } from "dexie";

import {
  WORKSPACE_HISTORY_LIMIT,
  type WorkspaceHeadRecord,
  type WorkspaceMeta,
  type WorkspaceSnapshotReason,
  type WorkspaceStore,
} from "./types";

const APP_KEY_LAST_SURFACE = "last_active_surface_id";

interface AppKvRow {
  key: string;
  value: string;
}

interface SurfaceActiveRow {
  surface_id: string;
  workspace_id: string;
}

interface WorkspaceDexieRow {
  workspace_id: string;
  surface_id: string;
  title?: string;
  created_at_ms: number;
  updated_at_ms: number;
  persistence_version: number;
  view_id: string;
  head_payload: Record<string, unknown>;
}

interface WorkspaceHistoryDexieRow {
  history_id: string;
  workspace_id: string;
  seq: number;
  reason: WorkspaceSnapshotReason;
  author?: string;
  session_id?: string;
  payload: Record<string, unknown>;
  created_at_ms: number;
}

class AssistantWorkspaceDexieDb extends Dexie {
  app_kv!: Table<AppKvRow, string>;
  surface_actives!: Table<SurfaceActiveRow, string>;
  workspaces!: Table<WorkspaceDexieRow, string>;
  workspace_history!: Table<WorkspaceHistoryDexieRow, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      app_kv: "&key",
      surface_actives: "&surface_id",
      workspaces: "&workspace_id, surface_id",
      workspace_history: "&history_id, workspace_id, seq, [workspace_id+seq]",
    });
  }
}

function nowMs() {
  return Date.now();
}

export class DexieWorkspaceStore implements WorkspaceStore {
  private readonly inner: AssistantWorkspaceDexieDb;
  private readonly historyLimit: number;

  constructor(databaseName: string, historyLimit: number = WORKSPACE_HISTORY_LIMIT) {
    this.inner = new AssistantWorkspaceDexieDb(databaseName);
    this.historyLimit = historyLimit;
  }

  async getLastActiveSurfaceId(): Promise<string | null> {
    const row = await this.inner.app_kv.get(APP_KEY_LAST_SURFACE);
    const v = row?.value?.trim();
    return v || null;
  }

  async setLastActiveSurfaceId(surfaceId: string | null): Promise<void> {
    if (!surfaceId?.trim()) {
      await this.inner.app_kv.delete(APP_KEY_LAST_SURFACE);
      return;
    }
    await this.inner.app_kv.put({ key: APP_KEY_LAST_SURFACE, value: surfaceId.trim() });
  }

  async getActiveWorkspaceId(surfaceId: string): Promise<string | null> {
    const row = await this.inner.surface_actives.get(surfaceId);
    return row?.workspace_id?.trim() || null;
  }

  async setActiveWorkspace(surfaceId: string, workspaceId: string): Promise<void> {
    await this.inner.surface_actives.put({
      surface_id: surfaceId,
      workspace_id: workspaceId,
    });
  }

  async listWorkspaces(surfaceId: string): Promise<WorkspaceMeta[]> {
    const rows = await this.inner.workspaces.where("surface_id").equals(surfaceId).toArray();
    return rows.map((r) => ({
      workspace_id: r.workspace_id,
      surface_id: r.surface_id,
      title: r.title,
      created_at_ms: r.created_at_ms,
      updated_at_ms: r.updated_at_ms,
    }));
  }

  async createWorkspaceWithHead(input: {
    workspace_id: string;
    surface_id: string;
    title?: string;
    persistence_version: number;
    view_id: string;
    head_payload: Record<string, unknown>;
  }): Promise<void> {
    const t = nowMs();
    await this.inner.workspaces.put({
      workspace_id: input.workspace_id,
      surface_id: input.surface_id,
      title: input.title,
      created_at_ms: t,
      updated_at_ms: t,
      persistence_version: input.persistence_version,
      view_id: input.view_id,
      head_payload: JSON.parse(JSON.stringify(input.head_payload)) as Record<string, unknown>,
    });
  }

  async getWorkspaceHead(workspaceId: string): Promise<WorkspaceHeadRecord | null> {
    const r = await this.inner.workspaces.get(workspaceId);
    if (!r) {
      return null;
    }
    return {
      workspace_id: r.workspace_id,
      surface_id: r.surface_id,
      title: r.title,
      created_at_ms: r.created_at_ms,
      updated_at_ms: r.updated_at_ms,
      persistence_version: r.persistence_version,
      view_id: r.view_id,
      head_payload: JSON.parse(JSON.stringify(r.head_payload)) as Record<string, unknown>,
    };
  }

  async updateHead(workspaceId: string, input: {
    persistence_version: number;
    view_id: string;
    head_payload: Record<string, unknown>;
  }): Promise<void> {
    const existing = await this.inner.workspaces.get(workspaceId);
    if (!existing) {
      return;
    }
    await this.inner.workspaces.put({
      ...existing,
      updated_at_ms: nowMs(),
      persistence_version: input.persistence_version,
      view_id: input.view_id,
      head_payload: JSON.parse(JSON.stringify(input.head_payload)) as Record<string, unknown>,
    });
  }

  async appendSnapshot(workspaceId: string, input: {
    reason: WorkspaceSnapshotReason;
    author?: string;
    session_id?: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const ws = await this.inner.workspaces.get(workspaceId);
    if (!ws) {
      return;
    }
    await this.inner.transaction("rw", this.inner.workspace_history, async () => {
      const prev = await this.inner.workspace_history
        .where("workspace_id")
        .equals(workspaceId)
        .toArray();
      const maxSeq = prev.reduce((m, row) => Math.max(m, row.seq), 0);
      await this.inner.workspace_history.add({
        history_id: crypto.randomUUID(),
        workspace_id: workspaceId,
        seq: maxSeq + 1,
        reason: input.reason,
        author: input.author,
        session_id: input.session_id,
        payload: JSON.parse(JSON.stringify(input.payload)) as Record<string, unknown>,
        created_at_ms: nowMs(),
      });
      await this.trimHistoryLocked(workspaceId);
    });
  }

  private async trimHistoryLocked(workspaceId: string): Promise<void> {
    const rows = await this.inner.workspace_history
      .where("workspace_id")
      .equals(workspaceId)
      .toArray();
    if (rows.length <= this.historyLimit) {
      return;
    }
    rows.sort((a, b) => a.seq - b.seq);
    const overflow = rows.length - this.historyLimit;
    const victims = rows.slice(0, overflow);
    await this.inner.workspace_history.bulkDelete(victims.map((v) => v.history_id));
  }

  async countHistorySnapshots(workspaceId: string): Promise<number> {
    return this.inner.workspace_history.where("workspace_id").equals(workspaceId).count();
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.inner.app_kv.clear(),
      this.inner.surface_actives.clear(),
      this.inner.workspaces.clear(),
      this.inner.workspace_history.clear(),
    ]);
  }
}

export function createDexieWorkspaceStore(
  scope: string,
  options?: { historyLimit?: number }
): WorkspaceStore {
  const safe = scope.trim() || "default";
  return new DexieWorkspaceStore(
    `dawnchat_assistant_workspace::${safe}`,
    options?.historyLimit ?? WORKSPACE_HISTORY_LIMIT
  );
}
