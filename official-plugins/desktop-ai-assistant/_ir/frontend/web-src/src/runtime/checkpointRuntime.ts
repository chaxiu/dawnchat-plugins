import type { UiCapabilityHandler, UiCapabilityRegistration } from "./capabilities";
import type { CheckpointStorageAdapter } from "./checkpointStorage";
import { createLocalStorageCheckpointAdapter } from "./checkpointStorage";
import { ASSISTANT_RUNTIME_EVENT_TYPES, type AssistantRuntimeEventInput } from "./events";
import type {
  WorkspaceCheckpointRecord,
  WorkspaceCheckpointSummary,
  WorkspaceResumeRequest,
  WorkspaceResumeResult,
} from "./checkpointTypes";
import type { GuideStateSnapshot } from "./guideState";
import type { ViewStateSnapshot } from "./viewState";
import type {
  WorkspaceCheckpointMeta,
  WorkspaceContinuation,
  WorkspaceSnapshot,
  WorkspaceTaskProgress,
} from "./workspaceTypes";
import { WORKSPACE_SCHEMA_VERSION } from "./workspaceTypes";

export interface CheckpointRuntimeDeps {
  getWorkspaceSnapshot: () => WorkspaceSnapshot;
  getViewStateSnapshot: () => ViewStateSnapshot;
  restoreViewState: (snapshot: ViewStateSnapshot) => number;
  restoreGuideState: (snapshot: GuideStateSnapshot) => void;
  restoreTaskProgress: (snapshot: WorkspaceTaskProgress) => void;
  restoreContinuation: (snapshot: WorkspaceContinuation) => void;
  setLastCheckpointMeta: (summary: WorkspaceCheckpointMeta | null) => void;
  navigateToView: (viewId: string) => Promise<void> | void;
  storage?: CheckpointStorageAdapter;
  emitRuntimeEvent?: (input: AssistantRuntimeEventInput) => void;
}

interface CheckpointSaveInput {
  trigger: string;
  actionType?: string;
  sessionId?: string;
  stepId?: string;
}

interface CheckpointStatusInput {
  status: WorkspaceCheckpointRecord["status"];
  trigger: string;
  sessionId?: string;
  stepId?: string;
  snapshot?: WorkspaceSnapshot;
  reasonCode?: string;
  errorCode?: string;
  errorMessage?: string;
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneContinuation(continuation?: WorkspaceContinuation | null): WorkspaceContinuation {
  return {
    last_completed_step_index: continuation?.last_completed_step_index,
    last_completed_step_id: continuation?.last_completed_step_id,
    event_cursor_seq: continuation?.event_cursor_seq ?? 0,
    pending_wait: continuation?.pending_wait
      ? cloneJsonValue(continuation.pending_wait)
      : null,
  };
}

function toSummary(record: WorkspaceCheckpointRecord | null): WorkspaceCheckpointSummary | null {
  if (!record) {
    return null;
  }
  return {
    checkpoint_id: record.checkpoint_id,
    resume_token: record.resume_token,
    saved_at_ms: record.saved_at_ms,
    trigger: record.trigger,
    status: record.status,
    scene_view_id: record.scene_view_id,
    resource_id: record.resource_id,
    workspace_schema_version: record.workspace_schema_version ?? 0,
    source_action_type: record.source_action_type,
    session_id: record.session_id,
    step_id: record.step_id,
    reason_code: record.reason_code,
    error_code: record.error_code,
    error_message: record.error_message,
    continuation_hint: cloneContinuation(record.snapshot.continuation),
  };
}

function toCheckpointMeta(summary: WorkspaceCheckpointSummary | null): WorkspaceCheckpointMeta | null {
  if (!summary) {
    return null;
  }
  return {
    checkpoint_id: summary.checkpoint_id,
    resume_token: summary.resume_token,
    saved_at_ms: summary.saved_at_ms,
    trigger: summary.trigger,
    status: summary.status,
    scene_view_id: summary.scene_view_id,
    resource_id: summary.resource_id,
    workspace_schema_version: summary.workspace_schema_version,
    source_action_type: summary.source_action_type,
    session_id: summary.session_id,
    step_id: summary.step_id,
    reason_code: summary.reason_code,
    error_code: summary.error_code,
    error_message: summary.error_message,
  };
}

function buildResumeConflict(
  currentViewState: ViewStateSnapshot,
  record: WorkspaceCheckpointRecord
): string | null {
  if (record.workspace_schema_version !== WORKSPACE_SCHEMA_VERSION) {
    return "resume_conflict_schema_incompatible";
  }
  if (!currentViewState.active_view_id) {
    return null;
  }
  if (currentViewState.active_view_id !== record.snapshot.active_view) {
    return "resume_conflict_view_mismatch";
  }
  const currentResourceId = currentViewState.current_resource?.resource_id || "";
  const checkpointResourceId = record.snapshot.active_resource?.resource_id || "";
  if (currentResourceId !== checkpointResourceId) {
    return "resume_conflict_resource_mismatch";
  }
  return null;
}

function buildResumeConflictMessage(reasonCode: string): string {
  switch (reasonCode) {
    case "resume_conflict_schema_incompatible":
      return "Checkpoint schema is incompatible with the current workspace runtime";
    case "resume_conflict_view_mismatch":
      return "Current workspace view conflicts with the requested checkpoint resume";
    case "resume_conflict_resource_mismatch":
      return "Current workspace resource conflicts with the requested checkpoint resume";
    default:
      return "Current workspace state conflicts with the requested checkpoint resume";
  }
}

function buildCheckpointDescribeSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {},
  };
}

function buildResumeSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      resume_token: { type: "string" },
    },
    required: ["resume_token"],
  };
}

export function createCheckpointRuntime(deps: CheckpointRuntimeDeps) {
  const storage = deps.storage || createLocalStorageCheckpointAdapter();

  const syncCheckpointMeta = (record: WorkspaceCheckpointRecord | null) => {
    deps.setLastCheckpointMeta(toCheckpointMeta(toSummary(record)));
  };

  const getLatestCheckpoint = (): WorkspaceCheckpointRecord | null => {
    const record = storage.read();
    syncCheckpointMeta(record);
    return record;
  };

  const saveStableCheckpoint = (input: CheckpointSaveInput): WorkspaceCheckpointRecord | null => {
    const snapshot = deps.getWorkspaceSnapshot();
    if (!snapshot.active_view) {
      return null;
    }
    const nextRecord: WorkspaceCheckpointRecord = {
      checkpoint_id: createId("checkpoint"),
      resume_token: createId("resume"),
      saved_at_ms: Date.now(),
      trigger: input.trigger,
      status: "checkpointed",
      scene_view_id: snapshot.active_view,
      resource_id: snapshot.active_resource?.resource_id,
      workspace_schema_version: snapshot.workspace_schema_version,
      source_action_type: input.actionType,
      session_id: input.sessionId,
      step_id: input.stepId,
      snapshot: cloneJsonValue(snapshot),
    };
    storage.write(nextRecord);
    syncCheckpointMeta(nextRecord);
    deps.emitRuntimeEvent?.({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.CHECKPOINT_SAVED,
      source: "checkpoint",
      session_id: input.sessionId,
      step_id: input.stepId,
      payload: {
        checkpoint_id: nextRecord.checkpoint_id,
        status: nextRecord.status,
        trigger: nextRecord.trigger,
        workspace_schema_version: nextRecord.workspace_schema_version,
        source_action_type: nextRecord.source_action_type,
      },
    });
    return nextRecord;
  };

  const markCheckpointStatus = (input: CheckpointStatusInput): WorkspaceCheckpointRecord | null => {
    const currentRecord = storage.read();
    if (!currentRecord) {
      return null;
    }
    const latestSnapshot = cloneJsonValue(input.snapshot || deps.getWorkspaceSnapshot());
    const nextRecord: WorkspaceCheckpointRecord = {
      ...currentRecord,
      saved_at_ms: Date.now(),
      trigger: input.trigger,
      status: input.status,
      scene_view_id: latestSnapshot.active_view || currentRecord.scene_view_id,
      resource_id: latestSnapshot.active_resource?.resource_id || currentRecord.resource_id,
      workspace_schema_version: latestSnapshot.workspace_schema_version || currentRecord.workspace_schema_version,
      session_id: input.sessionId || currentRecord.session_id,
      step_id: input.stepId || currentRecord.step_id,
      snapshot: latestSnapshot,
      reason_code: input.reasonCode || currentRecord.reason_code,
      error_code: input.errorCode,
      error_message: input.errorMessage,
    };
    storage.write(nextRecord);
    syncCheckpointMeta(nextRecord);
    deps.emitRuntimeEvent?.({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.CHECKPOINT_STATUS_CHANGED,
      source: "checkpoint",
      session_id: input.sessionId || currentRecord.session_id,
      step_id: input.stepId || currentRecord.step_id,
      payload: {
        checkpoint_id: nextRecord.checkpoint_id,
        status: nextRecord.status,
        trigger: nextRecord.trigger,
        reason_code: nextRecord.reason_code,
        error_code: nextRecord.error_code,
        error_message: nextRecord.error_message,
      },
    });
    return nextRecord;
  };

  const describeLatestCheckpoint: UiCapabilityHandler = async () => {
    const record = getLatestCheckpoint();
    return {
      ok: true,
      data: {
        checkpoint_summary: toSummary(record),
        resume_available: Boolean(record),
        resume_token: record?.resume_token || "",
        continuation_hint: record ? cloneContinuation(record.snapshot.continuation) : null,
      },
    };
  };

  const resumeFromCheckpoint = async (
    request: WorkspaceResumeRequest
  ): Promise<{ ok: true; data: WorkspaceResumeResult } | { ok: false; error_code: string; message: string }> => {
    const record = getLatestCheckpoint();
    if (!record) {
      return {
        ok: false,
        error_code: "checkpoint_not_found",
        message: "No checkpoint is available to resume",
      };
    }
    if (record.resume_token !== request.resume_token) {
      return {
        ok: false,
        error_code: "invalid_resume_token",
        message: "resume_token does not match the latest checkpoint",
      };
    }
    if (!record.snapshot.active_view) {
      return {
        ok: false,
        error_code: "invalid_checkpoint_state",
        message: "Checkpoint does not contain an active view",
      };
    }
    const currentViewState = deps.getViewStateSnapshot();
    const resumeConflict = buildResumeConflict(currentViewState, record);
    if (resumeConflict) {
      return {
        ok: false,
        error_code: resumeConflict,
        message: buildResumeConflictMessage(resumeConflict),
      };
    }

    deps.restoreViewState(record.snapshot.view_state);
    await deps.navigateToView(record.snapshot.active_view);
    deps.restoreGuideState(record.snapshot.guide_state);
    deps.restoreTaskProgress(record.snapshot.task_progress);
    deps.restoreContinuation(cloneContinuation(record.snapshot.continuation));
    markCheckpointStatus({
      status: "resumed",
      trigger: "assistant.workspace.resume",
      reasonCode: "resume_applied",
    });
    deps.emitRuntimeEvent?.({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.CHECKPOINT_RESUMED,
      source: "checkpoint",
      payload: {
        checkpoint_id: record.checkpoint_id,
        restored_view_id: record.snapshot.active_view,
        restored_resource_id: record.snapshot.active_resource?.resource_id,
        restored_anchor: record.snapshot.active_anchor,
        continuation_pending: Boolean(record.snapshot.continuation.pending_wait),
      },
    });

    return {
      ok: true,
      data: {
        resumed: true,
        checkpoint_id: record.checkpoint_id,
        restored_view_id: record.snapshot.active_view,
        restored_resource_id: record.snapshot.active_resource?.resource_id,
        restored_anchor: record.snapshot.active_anchor,
        continuation_hint: cloneContinuation(record.snapshot.continuation),
      },
    };
  };

  const resumeHandler: UiCapabilityHandler = async (rawPayload) => {
    const payload = toRecord(rawPayload);
    const resumeToken = typeof payload.resume_token === "string" ? payload.resume_token.trim() : "";
    if (!resumeToken) {
      return {
        ok: false,
        error_code: "invalid_resume_token",
        message: "assistant.workspace.resume requires payload.resume_token",
      };
    }
    return resumeFromCheckpoint({ resume_token: resumeToken });
  };

  const registrations: UiCapabilityRegistration[] = [
    {
      definition: {
        name: "assistant.workspace.checkpoint.describe",
        description: "Describe the latest recoverable workspace checkpoint",
        input_schema: buildCheckpointDescribeSchema(),
      },
      handler: describeLatestCheckpoint,
    },
    {
      definition: {
        name: "assistant.workspace.resume",
        description: "Resume the latest workspace checkpoint with an explicit resume token",
        input_schema: buildResumeSchema(),
      },
      handler: resumeHandler,
    },
  ];

  return {
    registrations,
    getLatestCheckpoint,
    getCheckpointSummary: () => toSummary(getLatestCheckpoint()),
    saveStableCheckpoint,
    markCheckpointStatus,
    clearCheckpoint: () => {
      storage.clear();
      syncCheckpointMeta(null);
    },
  };
}
