import Dexie, { type Table } from "dexie";
import {
  type CreateTaskInput,
  type TaskDetail,
  GENERAL_TASK_TEMPLATE_ID,
  type TaskRecord,
  type TaskStatus,
  type TaskStore,
  type TaskSummary,
  type UpdateTaskMetaPatch,
} from "./types";

interface TaskKvRecord {
  key: string;
  value: string | null;
}

class DexieTaskDatabase extends Dexie {
  tasks!: Table<TaskRecord, string>;
  app_kv!: Table<TaskKvRecord, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      tasks: "task_id, updated_at_ms, template_id, status",
      app_kv: "key",
    });
  }
}

function toTaskSummary(record: TaskRecord): TaskSummary {
  return {
    task_id: record.task_id,
    template_id: record.template_id,
    title: record.title,
    summary: record.summary,
    status: record.status,
    updated_at_ms: record.updated_at_ms,
    last_active_surface_id: record.last_active_surface_id,
  };
}

function cloneTaskDetail(record: TaskRecord): TaskDetail {
  return {
    task_id: record.task_id,
    template_id: record.template_id,
    title: record.title,
    summary: record.summary,
    status: record.status,
    created_at_ms: record.created_at_ms,
    updated_at_ms: record.updated_at_ms,
    last_active_surface_id: record.last_active_surface_id,
    surface_workspace_refs: { ...record.surface_workspace_refs },
  };
}

function normalizeTaskStatus(status: TaskStatus | undefined): TaskStatus {
  return status || "draft";
}

export function createDexieTaskStore(scope = "default"): TaskStore {
  const db = new DexieTaskDatabase(`dawnchat_assistant_task::${scope}`);

  async function updateTaskRecord(
    taskId: string,
    updater: (existing: TaskRecord) => TaskRecord
  ): Promise<TaskDetail | null> {
    const existing = await db.tasks.get(taskId);
    if (!existing) {
      return null;
    }
    const next = updater(existing);
    await db.tasks.put(next);
    return cloneTaskDetail(next);
  }

  return {
    async listTasks(opts) {
      const limit = Math.max(1, Math.min(100, Number(opts?.limit) || 20));
      const rows = await db.tasks.orderBy("updated_at_ms").reverse().limit(limit).toArray();
      return rows.map(toTaskSummary);
    },

    async getTask(taskId) {
      const row = await db.tasks.get(taskId);
      return row ? cloneTaskDetail(row) : null;
    },

    async getCurrentTaskId() {
      const row = await db.app_kv.get("current_task_id");
      return typeof row?.value === "string" && row.value.trim() ? row.value.trim() : null;
    },

    async getCurrentTask() {
      const currentTaskId = await this.getCurrentTaskId();
      if (!currentTaskId) {
        return null;
      }
      return this.getTask(currentTaskId);
    },

    async setCurrentTask(taskId) {
      await db.app_kv.put({
        key: "current_task_id",
        value: taskId || null,
      });
    },

    async createTask(input: CreateTaskInput) {
      const now = Date.now();
      const record: TaskRecord = {
        task_id: input.task_id,
        template_id: input.template_id || GENERAL_TASK_TEMPLATE_ID,
        title: input.title,
        summary: input.summary,
        status: normalizeTaskStatus(input.status),
        created_at_ms: now,
        updated_at_ms: now,
        surface_workspace_refs: {},
      };
      await db.tasks.put(record);
      return cloneTaskDetail(record);
    },

    async updateTaskMeta(taskId: string, patch: UpdateTaskMetaPatch) {
      return updateTaskRecord(taskId, (existing) => ({
        ...existing,
        title: typeof patch.title === "string" ? patch.title : existing.title,
        summary: typeof patch.summary === "string" ? patch.summary : existing.summary,
        status: patch.status || existing.status,
        updated_at_ms: Date.now(),
      }));
    },

    async setTaskActiveSurface(taskId: string, surfaceId: string) {
      return updateTaskRecord(taskId, (existing) => ({
        ...existing,
        last_active_surface_id: surfaceId,
        updated_at_ms: Date.now(),
      }));
    },

    async bindTaskWorkspace(taskId: string, surfaceId: string, workspaceId: string) {
      return updateTaskRecord(taskId, (existing) => ({
        ...existing,
        surface_workspace_refs: {
          ...existing.surface_workspace_refs,
          [surfaceId]: workspaceId,
        },
        updated_at_ms: Date.now(),
      }));
    },

    async clearAll() {
      await db.transaction("rw", db.tasks, db.app_kv, async () => {
        await db.tasks.clear();
        await db.app_kv.clear();
      });
    },
  };
}
