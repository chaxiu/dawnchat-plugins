import type { FlowWaitStateChange } from "../flowRuntime";
import type { SessionTaskProgress } from "../observation";

interface SessionLifecycleObservationStore {
  setTaskProgress: (nextProgress: SessionTaskProgress) => void;
  patchContinuation: (partialContinuation: {
    last_completed_step_index?: number;
    last_completed_step_id?: string;
    pending_wait?: FlowWaitStateChange["pendingWait"];
  }) => void;
}

export interface SessionLifecycleHooksDeps {
  observationStore: SessionLifecycleObservationStore;
}

export function createSessionLifecycleHooks(deps: SessionLifecycleHooksDeps) {
  return {
    onStepStarted: ({
      sessionId,
      stepIndex,
      totalSteps,
      actionType,
    }: {
      sessionId: string;
      stepId?: string;
      stepIndex?: number;
      totalSteps?: number;
      actionType: string;
      timeoutMs?: number;
    }) => {
      deps.observationStore.setTaskProgress({
        status: "running",
        current_task_id: sessionId,
        completed_steps: stepIndex,
        total_steps: totalSteps,
        summary: `Running ${actionType}`,
      });
      deps.observationStore.patchContinuation({
        pending_wait: null,
      });
    },
    onStepApplied: ({
      sessionId,
      stepId,
      stepIndex,
      totalSteps,
      actionType,
    }: {
      sessionId: string;
      stepId?: string;
      stepIndex?: number;
      totalSteps?: number;
      actionType: string;
      timeoutMs?: number;
    }) => {
      const completedSteps = typeof stepIndex === "number" ? stepIndex + 1 : undefined;
      deps.observationStore.setTaskProgress({
        status: completedSteps && totalSteps && completedSteps >= totalSteps ? "completed" : "running",
        current_task_id: sessionId,
        completed_steps: completedSteps,
        total_steps: totalSteps,
        summary: `${actionType} completed`,
      });
      deps.observationStore.patchContinuation({
        last_completed_step_index: stepIndex,
        last_completed_step_id: stepId,
        pending_wait: null,
      });
    },
    onStepFailed: ({
      sessionId,
      stepId,
      stepIndex,
      totalSteps,
      actionType,
      errorCode,
      message,
    }: {
      sessionId: string;
      stepId?: string;
      stepIndex?: number;
      totalSteps?: number;
      actionType: string;
      errorCode?: string;
      message?: string;
    }) => {
      deps.observationStore.setTaskProgress({
        status: "failed",
        current_task_id: sessionId,
        completed_steps: stepIndex,
        total_steps: totalSteps,
        summary: message || `${actionType} failed`,
      });
      deps.observationStore.patchContinuation({
        pending_wait: null,
      });
    },
    onStepCancelled: ({
      sessionId,
      stepId,
      stepIndex,
      totalSteps,
      reason,
    }: {
      sessionId: string;
      stepId?: string;
      stepIndex?: number;
      totalSteps?: number;
      reason?: string;
    }) => {
      deps.observationStore.setTaskProgress({
        status: "paused",
        current_task_id: sessionId,
        completed_steps: stepIndex,
        total_steps: totalSteps,
        summary: reason || "session step cancelled",
      });
      deps.observationStore.patchContinuation({
        pending_wait: null,
      });
    },
    onFlowWaitStateChanged: ({
      status,
      sessionId,
      stepIndex,
      totalSteps,
      pendingWait,
    }: FlowWaitStateChange) => {
      deps.observationStore.patchContinuation({
        pending_wait: pendingWait,
      });
      if (status === "waiting") {
        deps.observationStore.setTaskProgress({
          status: "paused",
          current_task_id: sessionId,
          completed_steps: stepIndex,
          total_steps: totalSteps,
          summary: `Waiting for ${pendingWait?.event_types.join(", ") || "event"}`,
        });
      }
    },
  };
}
