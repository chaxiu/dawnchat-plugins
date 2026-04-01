import type { UiCapabilityHandler, UiCapabilityRegistration } from "./capabilities";
import type { CheckpointStorageAdapter } from "./checkpointStorage";
import { createLocalStorageCheckpointAdapter } from "./checkpointStorage";
import type {
  WorkspaceCheckpointRecord,
  WorkspaceCheckpointSummary,
  WorkspaceResumeRequest,
  WorkspaceResumeResult,
} from "./checkpointTypes";
import type { GuideStateSnapshot } from "./guideState";
import type { ViewStateSnapshot } from "./viewState";
import type { WorkspaceSnapshot } from "./workspaceTypes";

export interface CheckpointRuntimeDeps {
  getWorkspaceSnapshot: () => WorkspaceSnapshot;
  getViewStateSnapshot: () => ViewStateSnapshot;
  restoreViewState: (snapshot: ViewStateSnapshot) => number;
  restoreGuideState: (snapshot: GuideStateSnapshot) => void;
  setLastCheckpointMeta: (summary: WorkspaceCheckpointSummary | null) => void;
  navigateToView: (viewId: string) => Promise<void> | void;
  storage?: CheckpointStorageAdapter;
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
    error_code: record.error_code,
    error_message: record.error_message,
  };
}

function buildResumeConflict(currentViewState: ViewStateSnapshot, record: WorkspaceCheckpointRecord): boolean {
  if (!currentViewState.active_view_id) {
    return false;
  }
  if (currentViewState.active_view_id !== record.snapshot.active_view) {
    return true;
  }
  const currentResourceId = currentViewState.current_resource?.resource_id || "";
  const checkpointResourceId = record.snapshot.active_resource?.resource_id || "";
  return currentResourceId !== checkpointResourceId;
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
    deps.setLastCheckpointMeta(toSummary(record));
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
      source_action_type: input.actionType,
      session_id: input.sessionId,
      step_id: input.stepId,
      snapshot: cloneJsonValue(snapshot),
    };
    storage.write(nextRecord);
    syncCheckpointMeta(nextRecord);
    return nextRecord;
  };

  const markCheckpointStatus = (input: CheckpointStatusInput): WorkspaceCheckpointRecord | null => {
    const currentRecord = storage.read();
    if (!currentRecord) {
      return null;
    }
    const nextRecord: WorkspaceCheckpointRecord = {
      ...currentRecord,
      saved_at_ms: Date.now(),
      trigger: input.trigger,
      status: input.status,
      session_id: input.sessionId || currentRecord.session_id,
      step_id: input.stepId || currentRecord.step_id,
      error_code: input.errorCode,
      error_message: input.errorMessage,
    };
    storage.write(nextRecord);
    syncCheckpointMeta(nextRecord);
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
    if (buildResumeConflict(currentViewState, record)) {
      return {
        ok: false,
        error_code: "resume_conflict",
        message: "Current workspace state conflicts with the requested checkpoint resume",
      };
    }

    deps.restoreViewState(record.snapshot.view_state);
    await deps.navigateToView(record.snapshot.active_view);
    deps.restoreGuideState(record.snapshot.guide_state);
    markCheckpointStatus({
      status: "resumed",
      trigger: "assistant.workspace.resume",
    });

    return {
      ok: true,
      data: {
        resumed: true,
        checkpoint_id: record.checkpoint_id,
        restored_view_id: record.snapshot.active_view,
        restored_resource_id: record.snapshot.active_resource?.resource_id,
        restored_anchor: record.snapshot.active_anchor,
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
