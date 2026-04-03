import { router } from "../../router";
import { createEventPeekCapabilityRegistration } from "../eventInspectRuntime";
import { createAssistantEventBus } from "../events";
import { useGuideState } from "../guide/state";
import { createSessionLifecycleHooks } from "../session/lifecycleHooks";
import { createSessionStepCapabilityRegistrations } from "../session/stepExecutor";
import { useSessionVisualState } from "../session/visualState";
import {
  createViewDescribeCapabilityRegistration,
  getViewRegistration,
  useViewState,
} from "../view";
import { createRuntimeObservationStore } from "../observation";

function createViewNavigator() {
  return async (viewId: string) => {
    const registration = getViewRegistration(viewId);
    if (!registration) {
      return;
    }
    await router.push(registration.manifest.route_path);
  };
}

export function composeAssistantRuntimeRegistrations() {
  const eventBus = createAssistantEventBus();
  const emitRuntimeEvent = eventBus.emit;
  const {
    setCurrentCard,
    setActiveTip,
    setNarrationState,
    getGuideStateSnapshot,
  } = useGuideState();
  const {
    setActiveViewState,
    getViewStateSnapshot,
  } = useViewState();
  const navigateToView = createViewNavigator();
  const { setFromActiveSessions } = useSessionVisualState();
  const observationStore = createRuntimeObservationStore({
    getViewStateSnapshot,
  });
  const sessionLifecycleHooks = createSessionLifecycleHooks({
    observationStore,
  });
  const registrations = [
    ...createSessionStepCapabilityRegistrations({
      setCurrentCard,
      setActiveTip,
      setNarrationState,
      setActiveViewState,
      getViewStateSnapshot,
      setTaskProgress: observationStore.setTaskProgress,
      navigateToView,
      eventBus,
      emitRuntimeEvent,
      ...sessionLifecycleHooks,
      onActiveSessionsChanged: setFromActiveSessions,
    }),
    createViewDescribeCapabilityRegistration({
      setActiveViewState,
      getViewStateSnapshot,
      getGuideStateSnapshot,
      getTaskProgressSnapshot: observationStore.getTaskProgressSnapshot,
      getActiveResourceContextSnapshot: observationStore.getActiveResourceContextSnapshot,
      getContinuationSnapshot: observationStore.getContinuationSnapshot,
      navigateToView,
    }),
    createEventPeekCapabilityRegistration({
      eventBus,
    }),
  ];

  return {
    registrations,
    emitRuntimeEvent,
  };
}
