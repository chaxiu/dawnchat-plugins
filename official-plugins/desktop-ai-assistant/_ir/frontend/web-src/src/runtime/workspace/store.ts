import { ref } from "vue";

import type { ViewStateSnapshot } from "../view/state";
import type {
  WorkspaceArtifact,
  WorkspaceContinuation,
  WorkspacePendingWait,
  WorkspaceResourceSlice,
  WorkspaceTaskProgress,
} from "./types";

export interface WorkspaceStoreDeps {
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
    resource_type: artifact.resource_type,
    resource_id: artifact.resource_id,
    view_id: artifact.view_id,
    created_at_ms: artifact.created_at_ms,
    updated_at_ms: artifact.updated_at_ms,
    data: artifact.data ? cloneJsonValue(artifact.data) : undefined,
  }));
}

function buildResourceMatchKey(resourceType?: string, resourceId?: string): string {
  return `${resourceType || ""}::${resourceId || ""}`;
}

function cloneResourceSlice(nextSlice: WorkspaceResourceSlice | null): WorkspaceResourceSlice | null {
  if (!nextSlice) {
    return null;
  }
  return {
    resource_type: nextSlice.resource_type,
    resource_id: nextSlice.resource_id,
    title: nextSlice.title,
    view_id: nextSlice.view_id,
    state_summary: cloneJsonValue(nextSlice.state_summary),
    artifact_ids: [...nextSlice.artifact_ids],
    artifact_count: nextSlice.artifact_count,
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
  const continuation = ref<WorkspaceContinuation>(cloneContinuation(DEFAULT_CONTINUATION));

  const setTaskProgress = (nextProgress: WorkspaceTaskProgress) => {
    taskProgress.value = cloneTaskProgress(nextProgress);
  };

  const setArtifacts = (nextArtifacts: WorkspaceArtifact[]) => {
    const viewState = deps.getViewStateSnapshot();
    const now = Date.now();
    artifacts.value = cloneArtifacts(nextArtifacts).map((artifact) => ({
      ...artifact,
      resource_type: artifact.resource_type || viewState.current_resource?.resource_type,
      resource_id: artifact.resource_id || viewState.current_resource?.resource_id,
      view_id: artifact.view_id || viewState.active_view_id || undefined,
      created_at_ms: artifact.created_at_ms || now,
      updated_at_ms: artifact.updated_at_ms || now,
    }));
  };

  const upsertArtifact = (nextArtifact: WorkspaceArtifact): WorkspaceArtifact => {
    const viewState = deps.getViewStateSnapshot();
    const existingArtifact = artifacts.value.find((artifact) => artifact.id === nextArtifact.id);
    const now = Date.now();
    const normalizedArtifact: WorkspaceArtifact = {
      ...nextArtifact,
      resource_type: nextArtifact.resource_type || existingArtifact?.resource_type || viewState.current_resource?.resource_type,
      resource_id: nextArtifact.resource_id || existingArtifact?.resource_id || viewState.current_resource?.resource_id,
      view_id: nextArtifact.view_id || existingArtifact?.view_id || viewState.active_view_id || undefined,
      created_at_ms: nextArtifact.created_at_ms || existingArtifact?.created_at_ms || now,
      updated_at_ms: now,
      data: nextArtifact.data ? cloneJsonValue(nextArtifact.data) : undefined,
    };
    const nextArtifacts = cloneArtifacts(artifacts.value);
    const existingIndex = nextArtifacts.findIndex((artifact) => artifact.id === normalizedArtifact.id);
    if (existingIndex >= 0) {
      nextArtifacts[existingIndex] = normalizedArtifact;
    } else {
      nextArtifacts.push(normalizedArtifact);
    }
    artifacts.value = nextArtifacts;
    return cloneArtifacts([normalizedArtifact])[0];
  };

  const removeArtifact = (artifactId: string): boolean => {
    const nextArtifacts = artifacts.value.filter((artifact) => artifact.id !== artifactId);
    if (nextArtifacts.length === artifacts.value.length) {
      return false;
    }
    artifacts.value = cloneArtifacts(nextArtifacts);
    return true;
  };

  const setContinuation = (nextContinuation: WorkspaceContinuation) => {
    continuation.value = cloneContinuation(nextContinuation);
  };

  const patchContinuation = (partialContinuation: Partial<WorkspaceContinuation>) => {
    continuation.value = cloneContinuation({
      ...continuation.value,
      ...partialContinuation,
      pending_wait: partialContinuation.pending_wait !== undefined
        ? clonePendingWait(partialContinuation.pending_wait)
        : continuation.value.pending_wait,
    });
  };

  const getActiveResourceSliceSnapshot = (): WorkspaceResourceSlice | null => {
    const viewState = deps.getViewStateSnapshot();
    const currentResource = viewState.current_resource ? cloneJsonValue(viewState.current_resource) : null;
    const currentResourceArtifacts = currentResource
      ? artifacts.value.filter((artifact) => {
          return buildResourceMatchKey(artifact.resource_type, artifact.resource_id)
            === buildResourceMatchKey(currentResource.resource_type, currentResource.resource_id);
        })
      : [];
    // Phase 10 boundary: active_resource_slice is intentionally limited to the
    // currently active resource context instead of any cross-resource aggregation.
    const activeResourceSlice = currentResource && viewState.active_manifest
      ? {
          resource_type: currentResource.resource_type,
          resource_id: currentResource.resource_id,
          title: currentResource.title,
          view_id: viewState.active_view_id,
          state_summary: cloneJsonValue(viewState.active_manifest.state_summary),
          artifact_ids: currentResourceArtifacts.map((artifact) => artifact.id),
          artifact_count: currentResourceArtifacts.length,
        }
      : null;
    return cloneResourceSlice(activeResourceSlice);
  };

  return {
    taskProgress,
    artifacts,
    continuation,
    setTaskProgress,
    setArtifacts,
    upsertArtifact,
    removeArtifact,
    setContinuation,
    patchContinuation,
    getTaskProgressSnapshot: () => cloneTaskProgress(taskProgress.value),
    getContinuationSnapshot: () => cloneContinuation(continuation.value),
    getActiveResourceSliceSnapshot,
  };
}
