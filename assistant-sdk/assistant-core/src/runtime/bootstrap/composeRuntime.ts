import { ASSISTANT_RUNTIME_EVENT_TYPES, createAssistantEventBus } from "../events";
import { useGuideState } from "../guide/state";
import { createSessionLifecycleHooks } from "../session/lifecycleHooks";
import { createSessionStepCapabilityRegistrations } from "../session/stepExecutor";
import { useSessionVisualState } from "../session/visualState";
import { getAssistantPersistenceScope } from "../persistence/scope";
import {
  createDexieWorkspaceStore,
  createWorkspaceCheckpointCapabilityRegistration,
  createWorkspacePersistenceRuntime,
  type WorkspaceStore,
} from "../workspace";
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
  /**
   * IndexedDB scope suffix for workspace storage (same key semantics as legacy persistence scope).
   * Used only when {@link workspaceStore} is omitted (default Dexie implementation).
   */
  persistenceScope?: string;
  /** Overrides persistenceScope when both are set */
  workspaceScope?: string;
  /**
   * Optional workspace persistence backend. When omitted, core uses {@link createDexieWorkspaceStore}
   * with the resolved scope (Tauri/Capacitor WebView IndexedDB is the typical default).
   */
  workspaceStore?: WorkspaceStore;
  /** When true, append session_completed snapshot on last session step (requires total_steps) */
  workspaceSnapshotOnSessionEnd?: boolean;
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
  const scope = (options?.workspaceScope || options?.persistenceScope || "").trim()
    || getAssistantPersistenceScope();
  const workspaceStore = options?.workspaceStore ?? createDexieWorkspaceStore(scope);
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
  const snapshotOnSessionEnd = Boolean(options?.workspaceSnapshotOnSessionEnd);
  const workspaceRuntime = createWorkspacePersistenceRuntime({
    store: workspaceStore,
    getViewStateSnapshot,
    setActiveViewState,
    navigateToView,
    snapshotOnSessionEnd,
  });
  const sessionLifecycleHooks = createSessionLifecycleHooks({
    observationStore,
  });
  const { onStepApplied: lifecycleOnStepApplied, ...restLifecycleHooks } = sessionLifecycleHooks;
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
      ...restLifecycleHooks,
      onStepApplied: async (payload) => {
        await lifecycleOnStepApplied(payload);
        await workspaceRuntime.handleSessionStepApplied(payload);
      },
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
    createWorkspaceCheckpointCapabilityRegistration(workspaceRuntime),
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

  const persistenceRuntime = {
    start: workspaceRuntime.start,
    hydrate: workspaceRuntime.hydrate,
    flushActiveView: workspaceRuntime.flushActiveView,
    dispose: workspaceRuntime.dispose,
    clear: workspaceRuntime.clear,
    getLastHydratedStorageKey: () => workspaceRuntime.getLastHydratedWorkspaceId(),
  };

  return {
    registrations,
    emitRuntimeEvent,
    persistenceRuntime,
    workspaceRuntime,
  };
}

// Backward-compatible alias. Prefer `composeAssistantCoreRuntime`.
export function composeAssistantRuntimeRegistrations(
  options?: ComposeAssistantCoreRuntimeOptions
) {
  return composeAssistantCoreRuntime(options);
}
