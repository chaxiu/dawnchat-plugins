import type { FlowWaitStateChange } from "../flowRuntime";
import type { WorkspaceTaskProgress } from "../workspace";

interface SessionLifecycleWorkspaceStore {
  setTaskProgress: (nextProgress: WorkspaceTaskProgress) => void;
  patchContinuation: (partialContinuation: {
    last_completed_step_index?: number;
    last_completed_step_id?: string;
    event_cursor_seq?: number;
    pending_wait?: FlowWaitStateChange["pendingWait"];
  }) => void;
}

export interface SessionLifecycleHooksDeps {
  workspaceStore: SessionLifecycleWorkspaceStore;
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
      deps.workspaceStore.setTaskProgress({
        status: "running",
        current_task_id: sessionId,
        completed_steps: stepIndex,
        total_steps: totalSteps,
        summary: `Running ${actionType}`,
      });
      deps.workspaceStore.patchContinuation({
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
      deps.workspaceStore.setTaskProgress({
        status: completedSteps && totalSteps && completedSteps >= totalSteps ? "completed" : "running",
        current_task_id: sessionId,
        completed_steps: completedSteps,
        total_steps: totalSteps,
        summary: `${actionType} completed`,
      });
      deps.workspaceStore.patchContinuation({
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
      deps.workspaceStore.setTaskProgress({
        status: "failed",
        current_task_id: sessionId,
        completed_steps: stepIndex,
        total_steps: totalSteps,
        summary: message || `${actionType} failed`,
      });
      deps.workspaceStore.patchContinuation({
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
      deps.workspaceStore.setTaskProgress({
        status: "paused",
        current_task_id: sessionId,
        completed_steps: stepIndex,
        total_steps: totalSteps,
        summary: reason || "session step cancelled",
      });
      deps.workspaceStore.patchContinuation({
        pending_wait: null,
      });
    },
    onFlowWaitStateChanged: ({
      status,
      sessionId,
      stepId,
      stepIndex,
      totalSteps,
      eventCursorSeq,
      pendingWait,
    }: FlowWaitStateChange) => {
      deps.workspaceStore.patchContinuation({
        event_cursor_seq: eventCursorSeq,
        pending_wait: pendingWait,
      });
      if (status === "waiting") {
        deps.workspaceStore.setTaskProgress({
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
