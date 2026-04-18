import type { UiCapabilityRegistration } from "../capabilities";
import { openAssistantViewFromShell } from "../view";
import {
  GENERAL_TASK_TEMPLATE_ID,
  type TaskBindWorkspaceResult,
  type TaskCreateResult,
  type TaskDetail,
  type TaskOpenResult,
  type TaskOpenWorkspaceResult,
  TASK_MAIN_VIEW_ID,
  type TaskRenameResult,
  type TaskRuntime,
  type TaskSetActiveSurfaceResult,
  type TaskStore,
  type TaskSummary,
  type TaskTemplateSummary,
} from "./types";
import { setCurrentTaskState, setCurrentTaskId } from "./state";

const TASK_TEMPLATES: TaskTemplateSummary[] = [
  {
    template_id: GENERAL_TASK_TEMPLATE_ID,
    title: "通用任务",
    description: "从一个空白任务开始",
  },
];

class TaskRuntimeError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "TaskRuntimeError";
  }
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown): string | undefined {
  const trimmed = normalizeString(value);
  return trimmed || undefined;
}

function taskNotFound(taskId: string): TaskRuntimeError {
  return new TaskRuntimeError("task_not_found", `Task not found: ${taskId}`);
}

function toSuccess(data: Record<string, unknown>) {
  return {
    ok: true,
    data,
  };
}

function toFailure(error: unknown) {
  if (error instanceof TaskRuntimeError) {
    return {
      ok: false,
      error_code: error.errorCode,
      message: error.message,
    };
  }
  return {
    ok: false,
    error_code: "task_runtime_error",
    message: error instanceof Error ? error.message : String(error),
  };
}

function createTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `task_${crypto.randomUUID()}`;
  }
  return `task_${Date.now()}`;
}

async function ensureTask(store: TaskStore, taskId: string): Promise<TaskDetail> {
  const task = await store.getTask(taskId);
  if (!task) {
    throw taskNotFound(taskId);
  }
  return task;
}

export function createTaskRuntime(deps: {
  store: TaskStore;
  openWorkspace: (surfaceId: string, workspaceId: string) => Promise<void>;
}): TaskRuntime {
  const { store, openWorkspace } = deps;

  return {
    async listTasks(input?: { limit?: number }): Promise<TaskSummary[]> {
      return store.listTasks({ limit: input?.limit });
    },

    async getTask(taskId: string): Promise<TaskDetail | null> {
      return store.getTask(taskId);
    },

    async getCurrentTask(): Promise<TaskDetail | null> {
      const current = await store.getCurrentTask();
      setCurrentTaskState(current);
      return current;
    },

    async createTask(input): Promise<TaskDetail> {
      const templateId = normalizeString(input.template_id) || GENERAL_TASK_TEMPLATE_ID;
      const title = normalizeString(input.title);
      if (!title) {
        throw new TaskRuntimeError("invalid_task_payload", "title is required");
      }
      const task = await store.createTask({
        task_id: createTaskId(),
        template_id: templateId,
        title,
        summary: normalizeOptionalString(input.summary),
        status: "draft",
      });
      return task;
    },

    async openTask(taskId: string): Promise<TaskOpenResult> {
      const task = await ensureTask(store, taskId);
      await store.setCurrentTask(task.task_id);
      setCurrentTaskId(task.task_id);
      setCurrentTaskState(task);
      const result = await openAssistantViewFromShell(TASK_MAIN_VIEW_ID);
      if (!result.ok) {
        throw new TaskRuntimeError(result.error_code || "task_open_failed", result.message || "Failed to open task view");
      }
      return {
        task_id: task.task_id,
        opened_view_id: TASK_MAIN_VIEW_ID,
        status: "opened",
      };
    },

    async renameTask(taskId: string, title: string): Promise<TaskRenameResult> {
      const nextTitle = normalizeString(title);
      if (!nextTitle) {
        throw new TaskRuntimeError("invalid_task_payload", "title is required");
      }
      const task = await store.updateTaskMeta(taskId, { title: nextTitle });
      if (!task) {
        throw taskNotFound(taskId);
      }
      const currentTaskId = await store.getCurrentTaskId();
      if (currentTaskId === taskId) {
        setCurrentTaskState(task);
      }
      return {
        task_id: task.task_id,
        title: task.title,
        status: "updated",
      };
    },

    async setTaskActiveSurface(taskId: string, surfaceId: string): Promise<TaskSetActiveSurfaceResult> {
      const nextSurfaceId = normalizeString(surfaceId);
      if (!nextSurfaceId) {
        throw new TaskRuntimeError("invalid_task_payload", "surface_id is required");
      }
      const task = await store.setTaskActiveSurface(taskId, nextSurfaceId);
      if (!task) {
        throw taskNotFound(taskId);
      }
      const currentTaskId = await store.getCurrentTaskId();
      if (currentTaskId === taskId) {
        setCurrentTaskState(task);
      }
      return {
        task_id: task.task_id,
        last_active_surface_id: nextSurfaceId,
        status: "updated",
      };
    },

    async bindTaskWorkspace(
      taskId: string,
      surfaceId: string,
      workspaceId: string
    ): Promise<TaskBindWorkspaceResult> {
      const nextSurfaceId = normalizeString(surfaceId);
      const nextWorkspaceId = normalizeString(workspaceId);
      if (!nextSurfaceId || !nextWorkspaceId) {
        throw new TaskRuntimeError("invalid_task_payload", "surface_id and workspace_id are required");
      }
      const task = await store.bindTaskWorkspace(taskId, nextSurfaceId, nextWorkspaceId);
      if (!task) {
        throw taskNotFound(taskId);
      }
      const currentTaskId = await store.getCurrentTaskId();
      if (currentTaskId === taskId) {
        setCurrentTaskState(task);
      }
      return {
        task_id: task.task_id,
        surface_id: nextSurfaceId,
        workspace_id: nextWorkspaceId,
        status: "bound",
      };
    },

    async listTaskTemplates(): Promise<TaskTemplateSummary[]> {
      return TASK_TEMPLATES.map((template) => ({ ...template }));
    },

    async openWorkspaceForTask(
      surfaceId: string,
      workspaceId: string
    ): Promise<TaskOpenWorkspaceResult> {
      const nextSurfaceId = normalizeString(surfaceId);
      const nextWorkspaceId = normalizeString(workspaceId);
      if (!nextSurfaceId || !nextWorkspaceId) {
        throw new TaskRuntimeError("invalid_task_payload", "surface_id and workspace_id are required");
      }
      await openWorkspace(nextSurfaceId, nextWorkspaceId);
      const currentTaskId = await store.getCurrentTaskId();
      if (currentTaskId) {
        const task = await store.setTaskActiveSurface(currentTaskId, nextSurfaceId);
        if (task) {
          setCurrentTaskState(task);
        }
      }
      return {
        surface_id: nextSurfaceId,
        workspace_id: nextWorkspaceId,
        status: "opened",
      };
    },
  };
}

function buildTaskSummarySchema() {
  return {
    type: "object",
    properties: {
      task_id: { type: "string", minLength: 1 },
      template_id: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1 },
      summary: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "completed"] },
      updated_at_ms: { type: "number", minimum: 0 },
      last_active_surface_id: { type: "string" },
    },
    required: ["task_id", "template_id", "title", "status", "updated_at_ms"],
  };
}

function buildTaskDetailSchema() {
  return {
    type: "object",
    properties: {
      task_id: { type: "string", minLength: 1 },
      template_id: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1 },
      summary: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "completed"] },
      created_at_ms: { type: "number", minimum: 0 },
      updated_at_ms: { type: "number", minimum: 0 },
      last_active_surface_id: { type: "string" },
      surface_workspace_refs: {
        type: "object",
        additionalProperties: { type: "string", minLength: 1 },
      },
    },
    required: [
      "task_id",
      "template_id",
      "title",
      "status",
      "created_at_ms",
      "updated_at_ms",
      "surface_workspace_refs",
    ],
  };
}

function buildTaskTemplateSchema() {
  return {
    type: "object",
    properties: {
      template_id: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1 },
      description: { type: "string", minLength: 1 },
    },
    required: ["template_id", "title", "description"],
  };
}

export function createTaskCapabilityRegistrations(taskRuntime: TaskRuntime): UiCapabilityRegistration[] {
  return [
    {
      definition: {
        name: "assistant.task.list",
        description: "List recent tasks for the current assistant scope.",
        input_schema: {
          type: "object",
          properties: {
            limit: { type: "number", minimum: 1, maximum: 100 },
          },
        },
      },
      handler: async (payload) => {
        try {
          const tasks = await taskRuntime.listTasks({ limit: Number(payload.limit) || undefined });
          return toSuccess({
            tasks,
          });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.task.describe",
        description: "Describe one task by id.",
        input_schema: {
          type: "object",
          properties: {
            task_id: { type: "string", minLength: 1 },
          },
          required: ["task_id"],
        },
      },
      handler: async (payload) => {
        try {
          const task = await taskRuntime.getTask(normalizeString(payload.task_id));
          if (!task) {
            throw taskNotFound(normalizeString(payload.task_id));
          }
          return toSuccess({ task });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.task.get_current",
        description: "Get the current active task for this assistant scope.",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      handler: async () => {
        try {
          const task = await taskRuntime.getCurrentTask();
          return toSuccess({ task });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.task.create",
        description: "Create a new task.",
        input_schema: {
          type: "object",
          properties: {
            template_id: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
            summary: { type: "string" },
          },
          required: ["template_id", "title"],
        },
      },
      handler: async (payload) => {
        try {
          const task = await taskRuntime.createTask({
            template_id: normalizeString(payload.template_id),
            title: normalizeString(payload.title),
            summary: normalizeOptionalString(payload.summary),
          });
          return toSuccess({ task } satisfies TaskCreateResult);
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.task.open",
        description: "Open one task and navigate to task.main.",
        input_schema: {
          type: "object",
          properties: {
            task_id: { type: "string", minLength: 1 },
          },
          required: ["task_id"],
        },
      },
      handler: async (payload) => {
        try {
          const result = await taskRuntime.openTask(normalizeString(payload.task_id));
          return toSuccess(result as unknown as Record<string, unknown>);
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.task.rename",
        description: "Rename one task.",
        input_schema: {
          type: "object",
          properties: {
            task_id: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
          },
          required: ["task_id", "title"],
        },
      },
      handler: async (payload) => {
        try {
          const result = await taskRuntime.renameTask(
            normalizeString(payload.task_id),
            normalizeString(payload.title)
          );
          return toSuccess(result as unknown as Record<string, unknown>);
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.task.set_active_surface",
        description: "Set the last active surface for one task.",
        input_schema: {
          type: "object",
          properties: {
            task_id: { type: "string", minLength: 1 },
            surface_id: { type: "string", minLength: 1 },
          },
          required: ["task_id", "surface_id"],
        },
      },
      handler: async (payload) => {
        try {
          const result = await taskRuntime.setTaskActiveSurface(
            normalizeString(payload.task_id),
            normalizeString(payload.surface_id)
          );
          return toSuccess(result as unknown as Record<string, unknown>);
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.task.bind_workspace",
        description: "Bind one surface workspace to one task.",
        input_schema: {
          type: "object",
          properties: {
            task_id: { type: "string", minLength: 1 },
            surface_id: { type: "string", minLength: 1 },
            workspace_id: { type: "string", minLength: 1 },
          },
          required: ["task_id", "surface_id", "workspace_id"],
        },
      },
      handler: async (payload) => {
        try {
          const result = await taskRuntime.bindTaskWorkspace(
            normalizeString(payload.task_id),
            normalizeString(payload.surface_id),
            normalizeString(payload.workspace_id)
          );
          return toSuccess(result as unknown as Record<string, unknown>);
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.task_template.list",
        description: "List built-in task templates.",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      handler: async () => {
        try {
          const templates = await taskRuntime.listTaskTemplates();
          return toSuccess({ templates });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
  ];
}

export function getDefaultTaskTemplateSummaries(): TaskTemplateSummary[] {
  return TASK_TEMPLATES.map((template) => ({ ...template }));
}

export function getTaskSummarySchema() {
  return buildTaskSummarySchema();
}

export function getTaskDetailSchema() {
  return buildTaskDetailSchema();
}

export function getTaskTemplateSummarySchema() {
  return buildTaskTemplateSchema();
}
