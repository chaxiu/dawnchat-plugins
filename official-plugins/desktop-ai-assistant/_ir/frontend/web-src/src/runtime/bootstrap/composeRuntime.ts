import { router } from "../../router";
import { ASSISTANT_RUNTIME_EVENT_TYPES, createAssistantEventBus } from "../events";
import { useGuideState } from "../guide/state";
import { createSessionLifecycleHooks } from "../session/lifecycleHooks";
import { createSessionStepCapabilityRegistrations } from "../session/stepExecutor";
import { useSessionVisualState } from "../session/visualState";
import { createViewPersistenceRuntime, DexieViewPersistenceAdapter } from "../persistence";
import { postAssistantRuntimeEventToHost } from "../runtimeEventBridge";
import {
  createViewDescribeCapabilityRegistration,
  createViewListCapabilityRegistration,
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
    await router.push(registration.route.full_path);
  };
}

export function composeAssistantRuntimeRegistrations() {
  const eventBus = createAssistantEventBus();
  const emitRuntimeEvent = (input: Parameters<typeof eventBus.emit>[0]) => {
    const event = eventBus.emit(input);
    postAssistantRuntimeEventToHost(event);
    return event;
  };
  const {
    setCurrentCard,
    scheduleDismissCurrentCard,
    setActiveTip,
    setNarrationState,
    getGuideStateSnapshot,
    setCardDismissObserver,
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
  const persistenceRuntime = createViewPersistenceRuntime({
    getViewStateSnapshot,
    setActiveViewState,
    navigateToView,
    adapter: new DexieViewPersistenceAdapter(),
  });
  const sessionLifecycleHooks = createSessionLifecycleHooks({
    observationStore,
  });
  const registrations = [
    ...createSessionStepCapabilityRegistrations({
      setCurrentCard,
      scheduleDismissCurrentCard,
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
    createViewListCapabilityRegistration({
      setActiveViewState,
      getViewStateSnapshot,
      getGuideStateSnapshot,
      getTaskProgressSnapshot: observationStore.getTaskProgressSnapshot,
      getActiveResourceContextSnapshot: observationStore.getActiveResourceContextSnapshot,
      getContinuationSnapshot: observationStore.getContinuationSnapshot,
      navigateToView,
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
  ];

  setCardDismissObserver(({ reason, card }) => {
    emitRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_CARD_DISMISSED,
      source: "guide",
      session_id: typeof card.data.session_id === "string" ? card.data.session_id : undefined,
      step_id: typeof card.data.step_id === "string" ? card.data.step_id : undefined,
      payload: {
        reason,
        card_type: card.card_type,
        title: card.title || "",
      },
    });
  });

  return {
    registrations,
    emitRuntimeEvent,
    persistenceRuntime,
  };
}
