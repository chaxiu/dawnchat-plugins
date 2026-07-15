import {
  GENERAL_TASK_TEMPLATE_ID,
  type CreateTaskInput,
  type TaskDetail,
  type TaskStatus,
  type TaskStore,
  type TaskSummary,
  type UpdateTaskMetaPatch,
} from "@dawnchat/assistant-core";
import { TASK_LEDGER_HOST_INVOKE } from "@dawnchat/host-orchestration-sdk/assistant-client";
import { invokeDesktopHost } from "./hostInvoke";

function normalizeTaskStatus(status: unknown): TaskStatus {
  return status === "active" || status === "completed" ? status : "draft";
}

function toTaskSummary(raw: unknown): TaskSummary {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    task_id: String(data.task_id || ""),
    template_id: String(data.template_id || GENERAL_TASK_TEMPLATE_ID),
    title: String(data.title || ""),
    summary: typeof data.summary === "string" ? data.summary : undefined,
    status: normalizeTaskStatus(data.status),
    updated_at_ms: Number(data.updated_at_ms || 0),
    last_active_surface_id:
      typeof data.last_active_surface_id === "string" ? data.last_active_surface_id : undefined,
  };
}

function toTaskDetail(raw: unknown): TaskDetail {
  const summary = toTaskSummary(raw);
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const refsRaw = data.surface_workspace_refs;
  const surface_workspace_refs =
    refsRaw && typeof refsRaw === "object" && !Array.isArray(refsRaw)
      ? Object.fromEntries(
          Object.entries(refsRaw as Record<string, unknown>).map(([key, value]) => [
            key,
            String(value || ""),
          ])
        )
      : {};
  return {
    ...summary,
    created_at_ms: Number(data.created_at_ms || 0),
    surface_workspace_refs,
  };
}

async function callHost<T>(functionName: string, payload: Record<string, unknown> = {}): Promise<T> {
  const result = await invokeDesktopHost(functionName, payload);
  if (result.ok !== true) {
    throw new Error(String(result.message || `host invoke failed: ${functionName}`));
  }
  return result.data as T;
}

export function createDesktopHostTaskStore(): TaskStore {
  return {
    async listTasks(opts) {
      const rows = await callHost<unknown[]>(TASK_LEDGER_HOST_INVOKE.LIST_TASKS, {
        ...(typeof opts?.limit === "number" ? { limit: opts.limit } : {}),
      });
      return Array.isArray(rows) ? rows.map(toTaskSummary) : [];
    },

    async getTask(taskId) {
      if (!String(taskId || "").trim()) {
        return null;
      }
      const row = await callHost<unknown | null>(TASK_LEDGER_HOST_INVOKE.GET_TASK, {
        task_id: taskId,
      });
      return row ? toTaskDetail(row) : null;
    },

    async getCurrentTaskId() {
      return await callHost<string | null>(TASK_LEDGER_HOST_INVOKE.GET_CURRENT_TASK_ID);
    },

    async getCurrentTask() {
      const currentTaskId = await this.getCurrentTaskId();
      if (!currentTaskId) {
        return null;
      }
      return await this.getTask(currentTaskId);
    },

    async setCurrentTask(taskId) {
      await callHost<null>(TASK_LEDGER_HOST_INVOKE.SET_CURRENT_TASK, {
        task_id: taskId,
      });
    },

    async createTask(input: CreateTaskInput) {
      const row = await callHost<unknown>(TASK_LEDGER_HOST_INVOKE.CREATE_TASK, {
        task_id: input.task_id,
        template_id: input.template_id || GENERAL_TASK_TEMPLATE_ID,
        title: input.title,
        ...(typeof input.summary === "string" ? { summary: input.summary } : {}),
        ...(typeof input.status === "string" ? { status: input.status } : {}),
      });
      return toTaskDetail(row);
    },

    async updateTaskMeta(taskId: string, patch: UpdateTaskMetaPatch) {
      const row = await callHost<unknown | null>(TASK_LEDGER_HOST_INVOKE.UPDATE_TASK_META, {
        task_id: taskId,
        ...(typeof patch.title === "string" ? { title: patch.title } : {}),
        ...(typeof patch.summary === "string" ? { summary: patch.summary } : {}),
        ...(typeof patch.status === "string" ? { status: patch.status } : {}),
      });
      return row ? toTaskDetail(row) : null;
    },

    async setTaskActiveSurface(taskId: string, surfaceId: string) {
      const row = await callHost<unknown | null>(TASK_LEDGER_HOST_INVOKE.SET_TASK_ACTIVE_SURFACE, {
        task_id: taskId,
        surface_id: surfaceId,
      });
      return row ? toTaskDetail(row) : null;
    },

    async bindTaskWorkspace(taskId: string, surfaceId: string, workspaceId: string) {
      const row = await callHost<unknown | null>(TASK_LEDGER_HOST_INVOKE.BIND_TASK_WORKSPACE, {
        task_id: taskId,
        surface_id: surfaceId,
        workspace_id: workspaceId,
      });
      return row ? toTaskDetail(row) : null;
    },

    async clearAll() {
      throw new Error("clearAll is not supported for desktop host-backed task store");
    },
  };
}
