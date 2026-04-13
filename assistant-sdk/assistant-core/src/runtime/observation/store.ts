import { ref } from "vue";

import type { ViewStateSnapshot } from "../view/state";
import type {
  ActiveStateBindingContext,
  SessionContinuation,
  SessionPendingWait,
  SessionTaskProgress,
} from "./types";

export interface RuntimeObservationStoreDeps {
  getViewStateSnapshot: () => ViewStateSnapshot;
}

const DEFAULT_TASK_PROGRESS: SessionTaskProgress = {
  status: "idle",
};

const DEFAULT_CONTINUATION: SessionContinuation = {
  pending_wait: null,
};

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneTaskProgress(nextProgress: SessionTaskProgress): SessionTaskProgress {
  return {
    status: nextProgress.status,
    current_task_id: nextProgress.current_task_id,
    completed_steps: nextProgress.completed_steps,
    total_steps: nextProgress.total_steps,
    summary: nextProgress.summary,
  };
}

function cloneActiveStateBindingContext(
  nextContext: ActiveStateBindingContext | null
): ActiveStateBindingContext | null {
  if (!nextContext) {
    return null;
  }
  return {
    binding_type: nextContext.binding_type,
    binding_label: nextContext.binding_label,
    title: nextContext.title,
    view_id: nextContext.view_id,
    state_summary: cloneJsonValue(nextContext.state_summary),
  };
}

function clonePendingWait(nextPendingWait: SessionPendingWait | null): SessionPendingWait | null {
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
    waiting_since_ms: nextPendingWait.waiting_since_ms,
  };
}

function cloneContinuation(nextContinuation: SessionContinuation): SessionContinuation {
  return {
    last_completed_step_index: nextContinuation.last_completed_step_index,
    last_completed_step_id: nextContinuation.last_completed_step_id,
    pending_wait: clonePendingWait(nextContinuation.pending_wait),
  };
}

export function createRuntimeObservationStore(deps: RuntimeObservationStoreDeps) {
  const taskProgress = ref<SessionTaskProgress>({ ...DEFAULT_TASK_PROGRESS });
  const continuation = ref<SessionContinuation>(cloneContinuation(DEFAULT_CONTINUATION));

  const setTaskProgress = (nextProgress: SessionTaskProgress) => {
    taskProgress.value = cloneTaskProgress(nextProgress);
  };

  const setContinuation = (nextContinuation: SessionContinuation) => {
    continuation.value = cloneContinuation(nextContinuation);
  };

  const patchContinuation = (partialContinuation: Partial<SessionContinuation>) => {
    continuation.value = cloneContinuation({
      ...continuation.value,
      ...partialContinuation,
      pending_wait: partialContinuation.pending_wait !== undefined
        ? clonePendingWait(partialContinuation.pending_wait)
        : continuation.value.pending_wait,
    });
  };

  const getActiveStateBindingContextSnapshot = (): ActiveStateBindingContext | null => {
    const viewState = deps.getViewStateSnapshot();
    const current = viewState.current_state_binding ? cloneJsonValue(viewState.current_state_binding) : null;
    const activeContext = current && viewState.active_manifest
      ? {
          binding_type: current.binding_type,
          binding_label: current.binding_label,
          title: current.title,
          view_id: viewState.active_view_id,
          state_summary: cloneJsonValue(viewState.active_manifest.state_summary),
        }
      : null;
    return cloneActiveStateBindingContext(activeContext);
  };

  return {
    taskProgress,
    continuation,
    setTaskProgress,
    setContinuation,
    patchContinuation,
    getTaskProgressSnapshot: () => cloneTaskProgress(taskProgress.value),
    getContinuationSnapshot: () => cloneContinuation(continuation.value),
    getActiveStateBindingContextSnapshot,
  };
}
