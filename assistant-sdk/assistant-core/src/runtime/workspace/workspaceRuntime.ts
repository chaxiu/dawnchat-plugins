import { watch, type WatchStopHandle } from "vue";

import type { SetActiveViewStateInput, ViewStateSnapshot } from "../view";
import { createManifestSnapshot } from "../view/runtime.shared";
import { getViewRegistration } from "../view/registry";
import type { ViewRegistration, ViewStateBinding } from "../view/manifest";
import type {
  WorkspaceCurrentContext,
  WorkspaceMeta,
  WorkspaceSnapshotSummary,
  WorkspaceStore,
} from "./types";

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

function toPositiveInteger(raw?: number): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return undefined;
  }
  return Math.trunc(raw);
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

  async function ensureWorkspaceForSurface(
    surfaceId: string,
    preferredHead?: {
      persistence_version: number;
      view_id: string;
      head_payload: Record<string, unknown>;
    }
  ): Promise<string | null> {
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
    const initial = preferredHead ?? buildInitialHead(registration);
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
    const stateBinding = cloneJsonValue(snapshot.current_state_binding);
    const activeAnchor = snapshot.active_anchor || "";
    const head_payload = persistence.serialize({ state_binding: stateBinding, activeAnchor });
    const head_record = {
      persistence_version: persistence.version,
      view_id: registration.view_id,
      head_payload: cloneJsonValue(head_payload) as Record<string, unknown>,
    };
    // 新建 workspace 时若先用 buildInitialHead（anchors[0]）再 updateHead，慢机器上读 head 可能卡在中间态；创建时直接写入当前快照。
    const wid = await ensureWorkspaceForSurface(surfaceId, head_record);
    if (!wid) {
      return;
    }
    try {
      await store.updateHead(wid, head_record);
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
      void flushHeadFromSnapshot(getViewStateSnapshot()).catch((e) => {
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

  const openWorkspace = async (surfaceId: string, workspaceId: string) => {
    const trimmedSurfaceId = surfaceId.trim();
    const trimmedWorkspaceId = workspaceId.trim();
    if (!trimmedSurfaceId || !trimmedWorkspaceId) {
      return;
    }
    try {
      const head = await store.getWorkspaceHead(trimmedWorkspaceId);
      if (!head) {
        return;
      }
      const resolvedSurfaceId = head.surface_id?.trim() || trimmedSurfaceId;
      await store.setActiveWorkspace(resolvedSurfaceId, trimmedWorkspaceId);
      await applyHeadRecord(head);
      await store.setLastActiveSurfaceId(resolvedSurfaceId);
      lastHydratedWorkspaceId = trimmedWorkspaceId;
    } catch (e) {
      logWorkspaceWarn("openWorkspace failed", {
        ws: `ws:${trimmedWorkspaceId}`,
        surface_id: trimmedSurfaceId,
        error: String(e),
      });
    }
  };

  const listWorkspaces = async (surfaceId: string): Promise<WorkspaceMeta[]> => {
    const trimmedSurfaceId = surfaceId.trim();
    if (!trimmedSurfaceId) {
      return [];
    }
    return store.listWorkspaces(trimmedSurfaceId);
  };

  const describeWorkspace = async (workspaceId: string) => {
    const trimmedWorkspaceId = workspaceId.trim();
    if (!trimmedWorkspaceId) {
      return null;
    }
    return store.getWorkspaceHead(trimmedWorkspaceId);
  };

  const getCurrentWorkspace = async (): Promise<WorkspaceCurrentContext | null> => {
    const snapshot = getViewStateSnapshot();
    const activeViewId = snapshot.active_view_id?.trim() || "";
    if (!activeViewId) {
      return null;
    }
    const registration = getViewRegistration(activeViewId);
    if (!registration?.persistence || registration.state_mode !== "stateful") {
      return null;
    }
    const workspaceId = await store.getActiveWorkspaceId(activeViewId);
    if (!workspaceId) {
      return null;
    }
    const head = await store.getWorkspaceHead(workspaceId);
    if (!head) {
      return null;
    }
    return {
      workspace_id: head.workspace_id,
      surface_id: head.surface_id,
      title: head.title,
      view_id: head.view_id,
    };
  };

  const createWorkspace = async (
    surfaceId: string,
    options?: { title?: string }
  ): Promise<WorkspaceMeta | null> => {
    const trimmedSurfaceId = surfaceId.trim();
    if (!trimmedSurfaceId) {
      return null;
    }
    const registration = getViewRegistration(trimmedSurfaceId);
    if (!registration?.persistence || registration.state_mode !== "stateful") {
      return null;
    }
    const workspaceId = crypto.randomUUID();
    const initial = buildInitialHead(registration);
    await store.createWorkspaceWithHead({
      workspace_id: workspaceId,
      surface_id: trimmedSurfaceId,
      title: options?.title?.trim() || registration.title,
      ...initial,
    });
    const head = await store.getWorkspaceHead(workspaceId);
    if (!head) {
      return null;
    }
    return {
      workspace_id: head.workspace_id,
      surface_id: head.surface_id,
      title: head.title,
      created_at_ms: head.created_at_ms,
      updated_at_ms: head.updated_at_ms,
    };
  };

  const renameWorkspace = async (
    workspaceId: string,
    title: string
  ): Promise<WorkspaceMeta | null> => {
    const trimmedWorkspaceId = workspaceId.trim();
    const nextTitle = title.trim();
    if (!trimmedWorkspaceId || !nextTitle) {
      return null;
    }
    return store.renameWorkspace(trimmedWorkspaceId, nextTitle);
  };

  const listWorkspaceHistory = async (
    workspaceId: string,
    options?: { limit?: number }
  ): Promise<WorkspaceSnapshotSummary[]> => {
    const trimmedWorkspaceId = workspaceId.trim();
    if (!trimmedWorkspaceId) {
      return [];
    }
    return store.listSnapshots(trimmedWorkspaceId, {
      limit: toPositiveInteger(options?.limit),
    });
  };

  const checkoutSnapshot = async (
    workspaceId: string,
    snapshotSeq: number
  ): Promise<boolean> => {
    const trimmedWorkspaceId = workspaceId.trim();
    if (!trimmedWorkspaceId || !Number.isFinite(snapshotSeq) || snapshotSeq <= 0) {
      return false;
    }
    try {
      const [snapshot, head] = await Promise.all([
        store.getSnapshotBySeq(trimmedWorkspaceId, Math.trunc(snapshotSeq)),
        store.getWorkspaceHead(trimmedWorkspaceId),
      ]);
      if (!snapshot || !head) {
        return false;
      }
      await store.updateHead(trimmedWorkspaceId, {
        persistence_version: head.persistence_version,
        view_id: head.view_id,
        head_payload: cloneJsonValue(snapshot.payload),
      });
      await store.setActiveWorkspace(head.surface_id, trimmedWorkspaceId);
      await applyHeadRecord({
        persistence_version: head.persistence_version,
        view_id: head.view_id,
        head_payload: cloneJsonValue(snapshot.payload),
      });
      await store.setLastActiveSurfaceId(head.surface_id);
      lastHydratedWorkspaceId = trimmedWorkspaceId;
      return true;
    } catch (e) {
      logWorkspaceWarn("checkoutSnapshot failed", {
        ws: `ws:${trimmedWorkspaceId}`,
        seq: snapshotSeq,
        error: String(e),
      });
      return false;
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
    openWorkspace,
    listWorkspaces,
    describeWorkspace,
    getCurrentWorkspace,
    createWorkspace,
    renameWorkspace,
    listWorkspaceHistory,
    checkoutSnapshot,
    getWorkspaceStore: () => store,
  };
}

export type WorkspacePersistenceRuntime = ReturnType<typeof createWorkspacePersistenceRuntime>;
