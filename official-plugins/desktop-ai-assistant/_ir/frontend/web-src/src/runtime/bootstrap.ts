import { router } from "../router";
import { registerCapabilities, unregisterCapabilities } from "./capabilities";
import { createCheckpointRuntime } from "./checkpointRuntime";
import { useGuideState } from "./guideState";
import { createSessionStepCapabilityRegistrations } from "./sessionStepExecutor";
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
  const workspaceStore = createWorkspaceStore({
    getGuideStateSnapshot,
    getViewStateSnapshot,
  });
  const checkpointRuntime = createCheckpointRuntime({
    getWorkspaceSnapshot: workspaceStore.getWorkspaceSnapshot,
    getViewStateSnapshot,
    restoreViewState,
    restoreGuideState,
    setLastCheckpointMeta: workspaceStore.setLastCheckpointMeta,
    navigateToView,
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
      onStepApplied: ({ sessionId, stepId, actionType }) => {
        checkpointRuntime.saveStableCheckpoint({
          trigger: actionType,
          actionType,
          sessionId,
          stepId,
        });
      },
      onStepFailed: ({ sessionId, stepId, actionType, errorCode, message }) => {
        checkpointRuntime.markCheckpointStatus({
          status: "failed",
          trigger: actionType,
          sessionId,
          stepId,
          errorCode,
          errorMessage: message,
        });
      },
      onStepCancelled: ({ sessionId, stepId, reason }) => {
        checkpointRuntime.markCheckpointStatus({
          status: "cancelled",
          trigger: "assistant.session_step_cancel",
          sessionId,
          stepId,
          errorMessage: reason,
        });
      },
    }),
    createViewDescribeCapabilityRegistration({
      setActiveViewState,
      getViewStateSnapshot,
      getGuideStateSnapshot,
      getWorkspaceSnapshot: workspaceStore.getWorkspaceSnapshot,
      getCheckpointSummary: checkpointRuntime.getCheckpointSummary,
      navigateToView,
    }),
    ...checkpointRuntime.registrations,
  ];
  return registerCapabilities(registrations).registered;
}

export function uninstallAssistantRuntimeCapabilities(names: string[]) {
  unregisterCapabilities(names);
}
