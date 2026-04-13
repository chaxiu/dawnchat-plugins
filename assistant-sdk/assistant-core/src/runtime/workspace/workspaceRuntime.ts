import { watch, type WatchStopHandle } from "vue";

import type { SetActiveViewStateInput, ViewStateSnapshot } from "../view";
import {
  createManifestSnapshot,
  getViewRegistration,
  type ViewRegistration,
  type ViewStateBinding,
} from "../view";
import type { WorkspaceStore } from "./types";

export interface WorkspacePersistenceRuntimeOptions {
  store: WorkspaceStore;
  getViewStateSnapshot: () => ViewStateSnapshot;
  setActiveViewState: (state: SetActiveViewStateInput) => number;
  navigateToView: (viewId: string) => Promise<void> | void;
  /** When true, append `session_completed` snapshot on last step success */
  snapshotOnSessionEnd?: boolean;
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function logWorkspaceWarn(message: string, data: Record<string, unknown>) {
  try {
    console.warn(`[assistant-workspace] ${message}`, data);
  } catch {
    // ignore
  }
}

function buildInitialHead(registration: ViewRegistration): {
  persistence_version: number;
  view_id: string;
  head_payload: Record<string, unknown>;
} {
  const persistence = registration.persistence!;
  const stateBinding = cloneJsonValue(registration.default_state_binding);
  const activeAnchor = registration.anchors[0]?.id || "";
  const head_payload = persistence.serialize({
    state_binding: stateBinding,
    activeAnchor,
  });
  return {
    persistence_version: persistence.version,
    view_id: registration.view_id,
    head_payload: cloneJsonValue(head_payload) as Record<string, unknown>,
  };
}

function isPersistableStateful(
  snapshot: ViewStateSnapshot
): snapshot is ViewStateSnapshot & {
  active_manifest: NonNullable<ViewStateSnapshot["active_manifest"]>;
  current_state_binding: NonNullable<ViewStateSnapshot["current_state_binding"]>;
} {
  return Boolean(
    snapshot.active_view_id
    && snapshot.active_manifest
    && snapshot.current_state_binding
    && snapshot.active_manifest.state_mode === "stateful"
  );
}

export function createWorkspacePersistenceRuntime(options: WorkspacePersistenceRuntimeOptions) {
  const {
    store,
    getViewStateSnapshot,
    setActiveViewState,
    navigateToView,
    snapshotOnSessionEnd = false,
  } = options;

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let watchStopHandle: WatchStopHandle | null = null;
  let disposed = false;
  let lastHydratedWorkspaceId = "";

  const clearSaveTimer = () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };

  async function ensureWorkspaceForSurface(surfaceId: string): Promise<string | null> {
    const registration = getViewRegistration(surfaceId);
    if (!registration?.persistence || registration.state_mode !== "stateful") {
      return null;
    }
    let wid = await store.getActiveWorkspaceId(surfaceId);
    if (wid) {
      const head = await store.getWorkspaceHead(wid);
      if (head) {
        return wid;
      }
    }
    const initial = buildInitialHead(registration);
    wid = crypto.randomUUID();
    try {
      await store.createWorkspaceWithHead({
        workspace_id: wid,
        surface_id: surfaceId,
        ...initial,
      });
      await store.setActiveWorkspace(surfaceId, wid);
    } catch (e) {
      logWorkspaceWarn("createWorkspaceWithHead failed", {
        ws: `ws:${wid}`,
        surface_id: surfaceId,
        error: String(e),
      });
      return null;
    }
    return wid;
  }

  async function applyHeadRecord(head: {
    persistence_version: number;
    view_id: string;
    head_payload: Record<string, unknown>;
  }) {
    const registration = getViewRegistration(head.view_id);
    const persistence = registration?.persistence;
    if (!registration || !persistence || registration.state_mode !== "stateful") {
      return;
    }

    const migratedPayload = head.persistence_version !== persistence.version && persistence.migrate
      ? persistence.migrate(cloneJsonValue(head.head_payload), head.persistence_version)
      : cloneJsonValue(head.head_payload);

    const deserialized = persistence.deserialize(toRecord(migratedPayload));
    const openResult = registration.open
      ? await registration.open({
          view_id: registration.view_id,
          state_binding: deserialized.state_binding,
          initial_anchor: deserialized.activeAnchor,
        })
      : {
          state_binding: deserialized.state_binding,
          activeAnchor: deserialized.activeAnchor,
        };

    if ("ok" in openResult && openResult.ok === false) {
      return;
    }

    const stateBinding = cloneJsonValue(
      "state_binding" in openResult && openResult.state_binding
        ? openResult.state_binding
        : deserialized.state_binding
    ) as ViewStateBinding;
    const activeAnchor = openResult.activeAnchor
      || deserialized.activeAnchor
      || registration.anchors[0]?.id
      || "";
    const manifest = createManifestSnapshot(registration, stateBinding, activeAnchor);
    setActiveViewState({
      viewId: registration.view_id,
      activeAnchor,
      state_binding: stateBinding,
      manifest,
    });
    await navigateToView(registration.view_id);
  }

  const hydrate = async () => {
    if (disposed) {
      return;
    }
    try {
      const surfaceId = (await store.getLastActiveSurfaceId())?.trim() || "";
      if (!surfaceId) {
        // 冷启动不要猜测「第一个 stateful 视图」并 navigateToView（常见为 board.main），
        // 否则欢迎页/宿主默认路由会被覆盖；由应用路由与首次 view.open 决定初始 scene。
        return;
      }

      const wid = await ensureWorkspaceForSurface(surfaceId);
      if (!wid) {
        const registration = getViewRegistration(surfaceId);
        if (!registration?.persistence || registration.state_mode !== "stateful") {
          await store.setLastActiveSurfaceId(null);
        }
        return;
      }
      const head = await store.getWorkspaceHead(wid);
      if (!head) {
        return;
      }
      await applyHeadRecord(head);
      lastHydratedWorkspaceId = wid;
    } catch (e) {
      logWorkspaceWarn("hydrate failed", { error: String(e) });
    }
  };

  const flushHeadFromSnapshot = async (snapshot: ViewStateSnapshot) => {
    if (!isPersistableStateful(snapshot)) {
      return;
    }
    const surfaceId = snapshot.active_view_id;
    const registration = getViewRegistration(surfaceId);
    const persistence = registration?.persistence;
    if (!registration || !persistence) {
      return;
    }
    const wid = await ensureWorkspaceForSurface(surfaceId);
    if (!wid) {
      return;
    }
    const stateBinding = cloneJsonValue(snapshot.current_state_binding);
    const activeAnchor = snapshot.active_anchor || "";
    const head_payload = persistence.serialize({ state_binding: stateBinding, activeAnchor });
    try {
      await store.updateHead(wid, {
        persistence_version: persistence.version,
        view_id: registration.view_id,
        head_payload: cloneJsonValue(head_payload) as Record<string, unknown>,
      });
      await store.setLastActiveSurfaceId(surfaceId);
    } catch (e) {
      logWorkspaceWarn("updateHead failed", {
        ws: `ws:${wid}`,
        surface_id: surfaceId,
        error: String(e),
      });
    }
  };

  const flushActiveView = async () => {
    clearSaveTimer();
    await flushHeadFromSnapshot(getViewStateSnapshot());
  };

  const scheduleHeadPersist = (snapshot: ViewStateSnapshot) => {
    clearSaveTimer();
    if (disposed || !isPersistableStateful(snapshot)) {
      return;
    }
    const registration = getViewRegistration(snapshot.active_view_id);
    const debounceMs = registration?.persistence?.debounce_ms ?? 250;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void flushHeadFromSnapshot(snapshot).catch((e) => {
        logWorkspaceWarn("debounced head flush failed", { error: String(e) });
      });
    }, debounceMs);
  };

  const handleSessionStepApplied = async (payload: {
    sessionId: string;
    stepId?: string;
    stepIndex?: number;
    totalSteps?: number;
    actionType: string;
    timeoutMs?: number;
  }) => {
    if (!snapshotOnSessionEnd) {
      return;
    }
    const { stepIndex, totalSteps } = payload;
    if (typeof stepIndex !== "number" || typeof totalSteps !== "number") {
      return;
    }
    if (stepIndex + 1 < totalSteps) {
      return;
    }
    const snapshot = getViewStateSnapshot();
    if (!isPersistableStateful(snapshot)) {
      return;
    }
    const surfaceId = snapshot.active_view_id;
    const registration = getViewRegistration(surfaceId);
    const persistence = registration?.persistence;
    if (!registration || !persistence) {
      return;
    }
    const wid = await ensureWorkspaceForSurface(surfaceId);
    if (!wid) {
      return;
    }
    const stateBinding = cloneJsonValue(snapshot.current_state_binding);
    const activeAnchor = snapshot.active_anchor || "";
    const chainPayload = persistence.serialize({ state_binding: stateBinding, activeAnchor });
    try {
      await store.appendSnapshot(wid, {
        reason: "session_completed",
        author: "system",
        session_id: payload.sessionId,
        payload: cloneJsonValue(chainPayload) as Record<string, unknown>,
      });
    } catch (e) {
      logWorkspaceWarn("appendSnapshot session_completed failed", {
        ws: `ws:${wid}`,
        error: String(e),
      });
    }
  };

  const checkpointFromCurrentView = async () => {
    const snapshot = getViewStateSnapshot();
    if (!isPersistableStateful(snapshot)) {
      return;
    }
    const surfaceId = snapshot.active_view_id;
    const registration = getViewRegistration(surfaceId);
    const persistence = registration?.persistence;
    if (!registration || !persistence) {
      return;
    }
    const wid = await ensureWorkspaceForSurface(surfaceId);
    if (!wid) {
      return;
    }
    const stateBinding = cloneJsonValue(snapshot.current_state_binding);
    const activeAnchor = snapshot.active_anchor || "";
    const chainPayload = persistence.serialize({ state_binding: stateBinding, activeAnchor });
    try {
      await store.appendSnapshot(wid, {
        reason: "manual_checkpoint",
        author: "user",
        payload: cloneJsonValue(chainPayload) as Record<string, unknown>,
      });
    } catch (e) {
      logWorkspaceWarn("appendSnapshot manual_checkpoint failed", {
        ws: `ws:${wid}`,
        error: String(e),
      });
    }
  };

  const handleVisibilityChange = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      void flushActiveView();
    }
  };

  const handlePageHide = () => {
    void flushActiveView();
  };

  const start = () => {
    if (watchStopHandle) {
      return;
    }
    watchStopHandle = watch(
      () => getViewStateSnapshot().view_state_version,
      () => {
        scheduleHeadPersist(getViewStateSnapshot());
      }
    );
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", handlePageHide);
    }
  };

  const dispose = () => {
    disposed = true;
    clearSaveTimer();
    watchStopHandle?.();
    watchStopHandle = null;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", handlePageHide);
    }
  };

  return {
    start,
    hydrate,
    flushActiveView,
    dispose,
    clear: () => store.clearAll(),
    getLastHydratedWorkspaceId: () => lastHydratedWorkspaceId,
    handleSessionStepApplied,
    checkpointFromCurrentView,
    getWorkspaceStore: () => store,
  };
}

export type WorkspacePersistenceRuntime = ReturnType<typeof createWorkspacePersistenceRuntime>;
