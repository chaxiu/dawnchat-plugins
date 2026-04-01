import { ref } from "vue";

import type { GuideStateSnapshot } from "./guideState";
import type { ViewStateSnapshot } from "./viewState";
import type {
  WorkspaceArtifact,
  WorkspaceCheckpointMeta,
  WorkspaceContinuation,
  WorkspacePendingWait,
  WorkspaceSnapshot,
  WorkspaceTaskProgress,
} from "./workspaceTypes";
import { WORKSPACE_SCHEMA_VERSION as WORKSPACE_SCHEMA_VERSION_VALUE } from "./workspaceTypes";

export interface WorkspaceStoreDeps {
  getGuideStateSnapshot: () => GuideStateSnapshot;
  getViewStateSnapshot: () => ViewStateSnapshot;
}

const DEFAULT_TASK_PROGRESS: WorkspaceTaskProgress = {
  status: "idle",
};

const DEFAULT_CONTINUATION: WorkspaceContinuation = {
  event_cursor_seq: 0,
  pending_wait: null,
};

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneTaskProgress(nextProgress: WorkspaceTaskProgress): WorkspaceTaskProgress {
  return {
    status: nextProgress.status,
    current_task_id: nextProgress.current_task_id,
    completed_steps: nextProgress.completed_steps,
    total_steps: nextProgress.total_steps,
    summary: nextProgress.summary,
  };
}

function cloneArtifacts(nextArtifacts: WorkspaceArtifact[]): WorkspaceArtifact[] {
  return nextArtifacts.map((artifact) => ({
    id: artifact.id,
    kind: artifact.kind,
    title: artifact.title,
    data: artifact.data ? cloneJsonValue(artifact.data) : undefined,
  }));
}

function cloneCheckpointMeta(meta: WorkspaceCheckpointMeta | null): WorkspaceCheckpointMeta | null {
  if (!meta) {
    return null;
  }
  return {
    checkpoint_id: meta.checkpoint_id,
    resume_token: meta.resume_token,
    saved_at_ms: meta.saved_at_ms,
    trigger: meta.trigger,
    status: meta.status,
    scene_view_id: meta.scene_view_id,
    resource_id: meta.resource_id,
    workspace_schema_version: meta.workspace_schema_version,
    source_action_type: meta.source_action_type,
    session_id: meta.session_id,
    step_id: meta.step_id,
    reason_code: meta.reason_code,
    error_code: meta.error_code,
    error_message: meta.error_message,
  };
}

function clonePendingWait(nextPendingWait: WorkspacePendingWait | null): WorkspacePendingWait | null {
  if (!nextPendingWait) {
    return null;
  }
  return {
    action_type: nextPendingWait.action_type,
    session_id: nextPendingWait.session_id,
    step_id: nextPendingWait.step_id,
    step_index: nextPendingWait.step_index,
    total_steps: nextPendingWait.total_steps,
    event_types: [...nextPendingWait.event_types],
    match: nextPendingWait.match ? cloneJsonValue(nextPendingWait.match) : undefined,
    timeout_ms: nextPendingWait.timeout_ms,
    event_cursor_seq: nextPendingWait.event_cursor_seq,
    waiting_since_ms: nextPendingWait.waiting_since_ms,
  };
}

function cloneContinuation(nextContinuation: WorkspaceContinuation): WorkspaceContinuation {
  return {
    last_completed_step_index: nextContinuation.last_completed_step_index,
    last_completed_step_id: nextContinuation.last_completed_step_id,
    event_cursor_seq: nextContinuation.event_cursor_seq,
    pending_wait: clonePendingWait(nextContinuation.pending_wait),
  };
}

export function createWorkspaceStore(deps: WorkspaceStoreDeps) {
  const taskProgress = ref<WorkspaceTaskProgress>({ ...DEFAULT_TASK_PROGRESS });
  const artifacts = ref<WorkspaceArtifact[]>([]);
  const lastCheckpointMeta = ref<WorkspaceCheckpointMeta | null>(null);
  const continuation = ref<WorkspaceContinuation>(cloneContinuation(DEFAULT_CONTINUATION));
  const workspaceMetaVersion = ref(0);

  const setTaskProgress = (nextProgress: WorkspaceTaskProgress) => {
    taskProgress.value = cloneTaskProgress(nextProgress);
    workspaceMetaVersion.value += 1;
  };

  const setArtifacts = (nextArtifacts: WorkspaceArtifact[]) => {
    artifacts.value = cloneArtifacts(nextArtifacts);
    workspaceMetaVersion.value += 1;
  };

  const setLastCheckpointMeta = (nextMeta: WorkspaceCheckpointMeta | null) => {
    lastCheckpointMeta.value = cloneCheckpointMeta(nextMeta);
    workspaceMetaVersion.value += 1;
  };

  const setContinuation = (nextContinuation: WorkspaceContinuation) => {
    continuation.value = cloneContinuation(nextContinuation);
    workspaceMetaVersion.value += 1;
  };

  const patchContinuation = (partialContinuation: Partial<WorkspaceContinuation>) => {
    continuation.value = cloneContinuation({
      ...continuation.value,
      ...partialContinuation,
      pending_wait: partialContinuation.pending_wait !== undefined
        ? clonePendingWait(partialContinuation.pending_wait)
        : continuation.value.pending_wait,
    });
    workspaceMetaVersion.value += 1;
  };

  const getWorkspaceSnapshot = (): WorkspaceSnapshot => {
    const viewState = deps.getViewStateSnapshot();
    const guideState = deps.getGuideStateSnapshot();
    return {
      workspace_schema_version: WORKSPACE_SCHEMA_VERSION_VALUE,
      workspace_version: viewState.view_state_version + guideState.guide_state_version + workspaceMetaVersion.value,
      active_resource: viewState.current_resource ? cloneJsonValue(viewState.current_resource) : null,
      active_view: viewState.active_view_id,
      active_anchor: viewState.active_anchor,
      task_progress: cloneTaskProgress(taskProgress.value),
      artifacts: cloneArtifacts(artifacts.value),
      guide_state: cloneJsonValue(guideState),
      view_state: cloneJsonValue(viewState),
      continuation: cloneContinuation(continuation.value),
      last_checkpoint_meta: cloneCheckpointMeta(lastCheckpointMeta.value),
    };
  };

  return {
    taskProgress,
    artifacts,
    lastCheckpointMeta,
    continuation,
    setTaskProgress,
    setArtifacts,
    setLastCheckpointMeta,
    setContinuation,
    patchContinuation,
    getWorkspaceSnapshot,
  };
}
