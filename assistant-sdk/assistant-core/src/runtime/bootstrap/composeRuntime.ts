import { ASSISTANT_RUNTIME_EVENT_TYPES, createAssistantEventBus } from "../events";
import { useGuideState } from "../guide/state";
import { createSessionLifecycleHooks } from "../session/lifecycleHooks";
import { createSessionStepCapabilityRegistrations } from "../session/stepExecutor";
import { useSessionVisualState } from "../session/visualState";
import {
  createDefaultBrowserViewPersistenceAdapter,
  createNoopViewPersistenceAdapter,
  createViewPersistenceRuntime,
  type ViewPersistenceAdapter,
} from "../persistence";
import { installAssistantRuntimeEnvironment, type AssistantRuntimeEnvironment } from "../environment";
import {
  createRuntimeBootstrapCapabilityRegistration,
  createViewContractCapabilityRegistration,
  createViewDescribeCapabilityRegistration,
  createViewListCapabilityRegistration,
  createViewOpenCapabilityRegistration,
  getViewRegistration,
  useViewState,
} from "../view";
import { createRuntimeObservationStore } from "../observation";
import { getAssistantRouteNavigator } from "../hostAdapter";
import { postAssistantRuntimeEventToHost } from "../runtimeEventBridge";

export interface ComposeAssistantCoreRuntimeOptions {
  environment?: AssistantRuntimeEnvironment;
  persistenceAdapter?: ViewPersistenceAdapter | null;
  persistenceScope?: string;
}

function createViewRouteNavigatorByViewId() {
  return async (viewId: string) => {
    const registration = getViewRegistration(viewId);
    if (!registration) {
      return;
    }
    const navigateToRoute = getAssistantRouteNavigator();
    if (navigateToRoute) {
      await navigateToRoute(registration.route.full_path);
    }
  };
}

export function composeAssistantCoreRuntime(options?: ComposeAssistantCoreRuntimeOptions) {
  if (options?.environment) {
    installAssistantRuntimeEnvironment(options.environment);
  }
  const eventBus = createAssistantEventBus();
  const emitRuntimeEvent = (input: Parameters<typeof eventBus.emit>[0]) => {
    const event = eventBus.emit(input);
    postAssistantRuntimeEventToHost(event);
    return event;
  };
  const persistenceAdapter = options?.persistenceAdapter === undefined
    ? createDefaultBrowserViewPersistenceAdapter(options?.persistenceScope)
    : options.persistenceAdapter || createNoopViewPersistenceAdapter();
  const {
    setCurrentCard,
    scheduleDismissCurrentCard,
    scheduleResetNarrationState,
    setActiveTip,
    setNarrationState,
    getGuideStateSnapshot,
    setCardDismissObserver,
  } = useGuideState();
  const {
    setActiveViewState,
    getViewStateSnapshot,
  } = useViewState();
  const navigateToView = createViewRouteNavigatorByViewId();
  const { setFromActiveSessions } = useSessionVisualState();
  const observationStore = createRuntimeObservationStore({
    getViewStateSnapshot,
  });
  const persistenceRuntime = createViewPersistenceRuntime({
    getViewStateSnapshot,
    setActiveViewState,
    navigateToView,
    adapter: persistenceAdapter,
  });
  const sessionLifecycleHooks = createSessionLifecycleHooks({
    observationStore,
  });
  const registrations = [
    ...createSessionStepCapabilityRegistrations({
      setCurrentCard,
      scheduleDismissCurrentCard,
      scheduleResetNarrationState,
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
    createViewOpenCapabilityRegistration({
      setActiveViewState,
      getViewStateSnapshot,
      getGuideStateSnapshot,
      getTaskProgressSnapshot: observationStore.getTaskProgressSnapshot,
      getActiveResourceContextSnapshot: observationStore.getActiveResourceContextSnapshot,
      getContinuationSnapshot: observationStore.getContinuationSnapshot,
      navigateToView,
      emitRuntimeEvent,
    }),
    createRuntimeBootstrapCapabilityRegistration({
      setActiveViewState,
      getViewStateSnapshot,
      getGuideStateSnapshot,
      getTaskProgressSnapshot: observationStore.getTaskProgressSnapshot,
      getActiveResourceContextSnapshot: observationStore.getActiveResourceContextSnapshot,
      getContinuationSnapshot: observationStore.getContinuationSnapshot,
      navigateToView,
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
    createViewContractCapabilityRegistration({
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

// Backward-compatible alias. Prefer `composeAssistantCoreRuntime`.
export function composeAssistantRuntimeRegistrations(
  options?: ComposeAssistantCoreRuntimeOptions
) {
  return composeAssistantCoreRuntime(options);
}
