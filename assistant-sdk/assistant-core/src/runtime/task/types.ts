export const TASK_MAIN_VIEW_ID = "task.main";
export const GENERAL_TASK_TEMPLATE_ID = "general.task";

export type TaskStatus = "draft" | "active" | "completed";

export interface TaskSummary {
  task_id: string;
  template_id: string;
  title: string;
  summary?: string;
  status: TaskStatus;
  updated_at_ms: number;
  last_active_surface_id?: string;
}

export interface TaskDetail extends TaskSummary {
  created_at_ms: number;
  surface_workspace_refs: Record<string, string>;
}

export interface TaskTemplateSummary {
  template_id: string;
  title: string;
  description: string;
}

export interface TaskRecord extends TaskDetail {}

export interface CreateTaskInput {
  task_id: string;
  template_id: string;
  title: string;
  summary?: string;
  status?: TaskStatus;
}

export interface UpdateTaskMetaPatch {
  title?: string;
  summary?: string;
  status?: TaskStatus;
}

export interface TaskStore {
  listTasks(opts?: { limit?: number }): Promise<TaskSummary[]>;
  getTask(taskId: string): Promise<TaskDetail | null>;
  getCurrentTaskId(): Promise<string | null>;
  getCurrentTask(): Promise<TaskDetail | null>;
  setCurrentTask(taskId: string | null): Promise<void>;
  createTask(input: CreateTaskInput): Promise<TaskDetail>;
  updateTaskMeta(taskId: string, patch: UpdateTaskMetaPatch): Promise<TaskDetail | null>;
  setTaskActiveSurface(taskId: string, surfaceId: string): Promise<TaskDetail | null>;
  bindTaskWorkspace(taskId: string, surfaceId: string, workspaceId: string): Promise<TaskDetail | null>;
  clearAll(): Promise<void>;
}

export interface TaskCreateResult {
  task: TaskDetail;
}

export interface TaskOpenResult {
  task_id: string;
  opened_view_id: string;
  status: "opened";
}

export interface TaskRenameResult {
  task_id: string;
  title: string;
  status: "updated";
}

export interface TaskSetActiveSurfaceResult {
  task_id: string;
  last_active_surface_id: string;
  status: "updated";
}

export interface TaskBindWorkspaceResult {
  task_id: string;
  surface_id: string;
  workspace_id: string;
  status: "bound";
}

export interface TaskOpenWorkspaceResult {
  surface_id: string;
  workspace_id: string;
  status: "opened";
}

export interface TaskRuntime {
  listTasks(input?: { limit?: number }): Promise<TaskSummary[]>;
  getTask(taskId: string): Promise<TaskDetail | null>;
  getCurrentTask(): Promise<TaskDetail | null>;
  createTask(input: {
    template_id: string;
    title: string;
    summary?: string;
  }): Promise<TaskDetail>;
  openTask(taskId: string): Promise<TaskOpenResult>;
  renameTask(taskId: string, title: string): Promise<TaskRenameResult>;
  setTaskActiveSurface(taskId: string, surfaceId: string): Promise<TaskSetActiveSurfaceResult>;
  bindTaskWorkspace(
    taskId: string,
    surfaceId: string,
    workspaceId: string
  ): Promise<TaskBindWorkspaceResult>;
  listTaskTemplates(): Promise<TaskTemplateSummary[]>;
  openWorkspaceForTask(
    surfaceId: string,
    workspaceId: string
  ): Promise<TaskOpenWorkspaceResult>;
}
