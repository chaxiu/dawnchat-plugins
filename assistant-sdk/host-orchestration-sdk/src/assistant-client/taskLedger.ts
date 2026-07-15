export const TASK_LEDGER_HOST_INVOKE = {
  LIST_TASKS: "dawnchat.host.task_ledger.list_tasks",
  GET_TASK: "dawnchat.host.task_ledger.get_task",
  GET_CURRENT_TASK_ID: "dawnchat.host.task_ledger.get_current_task_id",
  SET_CURRENT_TASK: "dawnchat.host.task_ledger.set_current_task",
  CREATE_TASK: "dawnchat.host.task_ledger.create_task",
  CREATE_CHECKPOINT: "dawnchat.host.task_ledger.create_checkpoint",
  ATTACH_EXECUTION_SESSION: "dawnchat.host.task_ledger.attach_execution_session",
  UPDATE_TASK_META: "dawnchat.host.task_ledger.update_task_meta",
  SET_TASK_ACTIVE_SURFACE: "dawnchat.host.task_ledger.set_task_active_surface",
  BIND_TASK_WORKSPACE: "dawnchat.host.task_ledger.bind_task_workspace",
} as const;

export type TaskLedgerHostInvokeName =
  (typeof TASK_LEDGER_HOST_INVOKE)[keyof typeof TASK_LEDGER_HOST_INVOKE];

export type TaskLedgerTaskStatus = "draft" | "active" | "completed";

export interface TaskLedgerScope {
  workspace_kind?: string;
  plugin_id?: string;
  project_id?: string;
  assistant_root_path?: string;
  db_file_path?: string;
}

export interface TaskLedgerTaskSummary {
  task_id: string;
  template_id: string;
  title: string;
  summary?: string;
  status: TaskLedgerTaskStatus;
  updated_at_ms: number;
  last_active_surface_id?: string;
}

export interface TaskLedgerTaskDetail extends TaskLedgerTaskSummary {
  created_at_ms: number;
  current_session_id?: string;
  active_checkpoint_id?: string;
  active_checkpoint?: TaskLedgerTaskCheckpointDetail;
  surface_workspace_refs: Record<string, string>;
}

export interface TaskLedgerTaskRecord extends TaskLedgerTaskDetail {
  source_session_id?: string;
  source_message_id?: string;
  current_session_id?: string;
  active_checkpoint_id?: string;
  metadata_json?: Record<string, unknown>;
  revision: number;
}

export interface TaskLedgerTaskSessionLinkRecord {
  link_id: string;
  task_id: string;
  session_id: string;
  relation: string;
  source_session_id?: string;
  source_message_id?: string;
  metadata_json?: Record<string, unknown>;
  created_at_ms: number;
}

export interface TaskLedgerTaskCheckpointRecord {
  checkpoint_id: string;
  task_id: string;
  session_id: string;
  trigger_kind: string;
  summary_text: string;
  payload_json?: Record<string, unknown>;
  created_at_ms: number;
}

export interface TaskLedgerTaskCheckpointDetail extends TaskLedgerTaskCheckpointRecord {}

export interface TaskLedgerBaseRequest {
  scope?: TaskLedgerScope;
}

export interface TaskLedgerListTasksRequest extends TaskLedgerBaseRequest {
  limit?: number;
}

export interface TaskLedgerGetTaskRequest extends TaskLedgerBaseRequest {
  task_id: string;
}

export interface TaskLedgerSetCurrentTaskRequest extends TaskLedgerBaseRequest {
  task_id: string | null;
}

export interface TaskLedgerCreateTaskRequest extends TaskLedgerBaseRequest {
  task_id: string;
  template_id: string;
  title: string;
  summary?: string;
  status?: TaskLedgerTaskStatus;
  source_session_id?: string;
  source_message_id?: string;
}

export interface TaskLedgerUpdateTaskMetaRequest extends TaskLedgerBaseRequest {
  task_id: string;
  title?: string;
  summary?: string;
  status?: TaskLedgerTaskStatus;
}

export interface TaskLedgerCreateCheckpointRequest extends TaskLedgerBaseRequest {
  task_id: string;
  session_id: string;
  trigger_kind: string;
  summary_text: string;
  payload_json?: Record<string, unknown>;
  mark_active?: boolean;
}

export interface TaskLedgerAttachExecutionSessionRequest extends TaskLedgerBaseRequest {
  task_id: string;
  active_session_id: string;
  source_session_id?: string;
  source_message_id?: string;
  mark_current_task?: boolean;
  next_status?: Extract<TaskLedgerTaskStatus, "active">;
}

export interface TaskLedgerSetTaskActiveSurfaceRequest extends TaskLedgerBaseRequest {
  task_id: string;
  surface_id: string;
}

export interface TaskLedgerBindTaskWorkspaceRequest extends TaskLedgerBaseRequest {
  task_id: string;
  surface_id: string;
  workspace_id: string;
}

export type TaskLedgerQuery =
  | TaskLedgerListTasksRequest
  | TaskLedgerGetTaskRequest
  | TaskLedgerSetCurrentTaskRequest;

export type TaskLedgerMutation =
  | TaskLedgerCreateTaskRequest
  | TaskLedgerCreateCheckpointRequest
  | TaskLedgerAttachExecutionSessionRequest
  | TaskLedgerUpdateTaskMetaRequest
  | TaskLedgerSetTaskActiveSurfaceRequest
  | TaskLedgerBindTaskWorkspaceRequest;

export type TaskLedgerResultEnvelope<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error_code: string;
      message: string;
    };
