import { router } from "../router";
import { registerCapabilities, unregisterCapabilities } from "./capabilities";
import { createCheckpointRuntime } from "./checkpointRuntime";
import { createEventPeekCapabilityRegistration } from "./eventInspectRuntime";
import { createAssistantEventBus } from "./events";
import { useGuideState } from "./guideState";
import { installRuntimeEventEmitter, uninstallRuntimeEventEmitter } from "./runtimeEventBridge";
import { createSessionStepCapabilityRegistrations } from "./sessionStepExecutor";
import { useSessionVisualState } from "./sessionVisualState";
import { createViewDescribeCapabilityRegistration } from "./viewRuntime";
import { getViewRegistration } from "./viewRegistry";
import { useViewState } from "./viewState";
import { createWorkspaceStore } from "./workspaceStore";

function createViewNavigator() {
  return async (viewId: string) => {
    const registration = getViewRegistration(viewId);
    if (!registration) {
      return;
    }
    await router.push(registration.manifest.route_path);
  };
}

export function installAssistantRuntimeCapabilities(): string[] {
  const eventBus = createAssistantEventBus();
  const emitRuntimeEvent = eventBus.emit;
  installRuntimeEventEmitter(emitRuntimeEvent);
  const {
    setCurrentCard,
    setActiveTip,
    setNarrationState,
    getGuideStateSnapshot,
    restoreGuideState,
  } = useGuideState();
  const {
    setActiveViewState,
    getViewStateSnapshot,
    restoreViewState,
  } = useViewState();
  const navigateToView = createViewNavigator();
  const { setFromActiveSessions } = useSessionVisualState();
  const workspaceStore = createWorkspaceStore({
    getGuideStateSnapshot,
    getViewStateSnapshot,
  });
  const checkpointRuntime = createCheckpointRuntime({
    getWorkspaceSnapshot: workspaceStore.getWorkspaceSnapshot,
    getViewStateSnapshot,
    restoreViewState,
    restoreGuideState,
    restoreTaskProgress: workspaceStore.setTaskProgress,
    restoreContinuation: workspaceStore.setContinuation,
    setLastCheckpointMeta: workspaceStore.setLastCheckpointMeta,
    navigateToView,
    emitRuntimeEvent,
  });
  const registrations = [
    ...createSessionStepCapabilityRegistrations({
      setCurrentCard,
      setActiveTip,
      setNarrationState,
      setActiveViewState,
      getViewStateSnapshot,
      getWorkspaceSnapshot: workspaceStore.getWorkspaceSnapshot,
      getCheckpointSummary: checkpointRuntime.getCheckpointSummary,
      navigateToView,
      eventBus,
      emitRuntimeEvent,
      onStepStarted: ({ sessionId, stepId, stepIndex, totalSteps, actionType }) => {
        workspaceStore.setTaskProgress({
          status: "running",
          current_task_id: sessionId,
          completed_steps: stepIndex,
          total_steps: totalSteps,
          summary: `Running ${actionType}`,
        });
        workspaceStore.patchContinuation({
          pending_wait: null,
        });
      },
      onStepApplied: ({ sessionId, stepId, stepIndex, totalSteps, actionType }) => {
        const completedSteps = typeof stepIndex === "number" ? stepIndex + 1 : undefined;
        workspaceStore.setTaskProgress({
          status: completedSteps && totalSteps && completedSteps >= totalSteps ? "completed" : "running",
          current_task_id: sessionId,
          completed_steps: completedSteps,
          total_steps: totalSteps,
          summary: `${actionType} completed`,
        });
        workspaceStore.patchContinuation({
          last_completed_step_index: stepIndex,
          last_completed_step_id: stepId,
          pending_wait: null,
        });
        checkpointRuntime.saveStableCheckpoint({
          trigger: actionType,
          actionType,
          sessionId,
          stepId,
        });
      },
      onStepFailed: ({ sessionId, stepId, stepIndex, totalSteps, actionType, errorCode, message }) => {
        workspaceStore.setTaskProgress({
          status: "failed",
          current_task_id: sessionId,
          completed_steps: stepIndex,
          total_steps: totalSteps,
          summary: message || `${actionType} failed`,
        });
        workspaceStore.patchContinuation({
          pending_wait: null,
        });
        checkpointRuntime.markCheckpointStatus({
          status: "failed",
          trigger: actionType,
          sessionId,
          stepId,
          reasonCode: errorCode || "step_failed",
          errorCode,
          errorMessage: message,
        });
      },
      onStepCancelled: ({ sessionId, stepId, stepIndex, totalSteps, reason }) => {
        workspaceStore.setTaskProgress({
          status: "paused",
          current_task_id: sessionId,
          completed_steps: stepIndex,
          total_steps: totalSteps,
          summary: reason || "session step cancelled",
        });
        workspaceStore.patchContinuation({
          pending_wait: null,
        });
        checkpointRuntime.markCheckpointStatus({
          status: "cancelled",
          trigger: "assistant.session_step_cancel",
          sessionId,
          stepId,
          reasonCode: reason || "session_cancelled",
          errorMessage: reason,
        });
      },
      onFlowWaitStateChanged: ({ status, sessionId, stepId, stepIndex, totalSteps, eventCursorSeq, pendingWait }) => {
        workspaceStore.patchContinuation({
          event_cursor_seq: eventCursorSeq,
          pending_wait: pendingWait,
        });
        if (status === "waiting") {
          workspaceStore.setTaskProgress({
            status: "paused",
            current_task_id: sessionId,
            completed_steps: stepIndex,
            total_steps: totalSteps,
            summary: `Waiting for ${pendingWait?.event_types.join(", ") || "event"}`,
          });
        }
        checkpointRuntime.saveStableCheckpoint({
          trigger: `flow.wait.${status}`,
          actionType: "flow.wait",
          sessionId,
          stepId,
        });
      },
      onActiveSessionsChanged: setFromActiveSessions,
    }),
    createViewDescribeCapabilityRegistration({
      setActiveViewState,
      getViewStateSnapshot,
      getGuideStateSnapshot,
      getWorkspaceSnapshot: workspaceStore.getWorkspaceSnapshot,
      getCheckpointSummary: checkpointRuntime.getCheckpointSummary,
      navigateToView,
    }),
    createEventPeekCapabilityRegistration({
      eventBus,
    }),
    ...checkpointRuntime.registrations,
  ];
  return registerCapabilities(registrations).registered;
}

export function uninstallAssistantRuntimeCapabilities(names: string[]) {
  useSessionVisualState().setSessionIdle();
  uninstallRuntimeEventEmitter();
  unregisterCapabilities(names);
}
