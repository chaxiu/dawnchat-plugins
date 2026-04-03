import { watch, type WatchStopHandle } from "vue";

import type { SetActiveViewStateInput, ViewStateSnapshot } from "../view";
import {
  createManifestSnapshot,
  getViewRegistration,
  type ViewRegistration,
  type ViewResourceBinding,
} from "../view";
import type { PersistedViewStateRecord, ViewPersistenceAdapter } from "./types";

interface CapturedPersistableViewState {
  registration: ViewRegistration;
  resource: ViewResourceBinding;
  activeAnchor: string;
  record: PersistedViewStateRecord;
}

export interface ViewPersistenceRuntimeDeps {
  getViewStateSnapshot: () => ViewStateSnapshot;
  setActiveViewState: (state: SetActiveViewStateInput) => number;
  navigateToView: (viewId: string) => Promise<void> | void;
  adapter: ViewPersistenceAdapter;
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

function isPersistableState(
  snapshot: ViewStateSnapshot
): snapshot is ViewStateSnapshot & {
  active_manifest: NonNullable<ViewStateSnapshot["active_manifest"]>;
  current_resource: NonNullable<ViewStateSnapshot["current_resource"]>;
} {
  return Boolean(
    snapshot.active_view_id
    && snapshot.active_manifest
    && snapshot.current_resource
    && snapshot.active_manifest.state_mode === "stateful"
  );
}

function capturePersistableViewState(
  snapshot: ViewStateSnapshot
): CapturedPersistableViewState | null {
  if (!isPersistableState(snapshot)) {
    return null;
  }
  const registration = getViewRegistration(snapshot.active_view_id);
  const persistence = registration?.persistence;
  if (!registration || !persistence) {
    return null;
  }
  const resource = cloneJsonValue(snapshot.current_resource);
  const activeAnchor = snapshot.active_anchor || "";
  const resourceKey = persistence.getResourceKey(resource);
  const payload = persistence.serialize({
    resource,
    activeAnchor,
  });
  const record: PersistedViewStateRecord = {
    storage_key: `${snapshot.active_view_id}::${resourceKey}`,
    view_id: snapshot.active_view_id,
    resource_key: resourceKey,
    version: persistence.version,
    updated_at_ms: Date.now(),
    payload: cloneJsonValue(payload),
  };
  return {
    registration,
    resource,
    activeAnchor,
    record,
  };
}

export function createViewPersistenceRuntime(deps: ViewPersistenceRuntimeDeps) {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let watchStopHandle: WatchStopHandle | null = null;
  let disposed = false;
  let lastHydratedStorageKey = "";

  const clearSaveTimer = () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };

  const persistSnapshot = async (snapshot: ViewStateSnapshot) => {
    const captured = capturePersistableViewState(snapshot);
    if (!captured) {
      return;
    }
    try {
      await deps.adapter.put(captured.record);
    } catch {
      // Persistence must degrade gracefully when storage is unavailable.
    }
  };

  const flushActiveView = async () => {
    clearSaveTimer();
    const snapshot = deps.getViewStateSnapshot();
    await persistSnapshot(snapshot);
  };

  const schedulePersist = (snapshot: ViewStateSnapshot) => {
    const captured = capturePersistableViewState(snapshot);
    clearSaveTimer();
    if (!captured || disposed) {
      return;
    }
    const debounceMs = captured.registration.persistence?.debounce_ms ?? 250;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void deps.adapter.put(captured.record).catch(() => {
        // Persistence must degrade gracefully when storage is unavailable.
      });
    }, debounceMs);
  };

  const hydrate = async () => {
    let persisted: PersistedViewStateRecord | null = null;
    try {
      persisted = await deps.adapter.getLatest();
    } catch {
      return;
    }
    if (!persisted || disposed) {
      return;
    }
    const registration = getViewRegistration(persisted.view_id);
    const persistence = registration?.persistence;
    if (!registration || !persistence || registration.state_mode !== "stateful") {
      return;
    }

    const migratedPayload = persisted.version !== persistence.version && persistence.migrate
      ? persistence.migrate(cloneJsonValue(persisted.payload), persisted.version)
      : cloneJsonValue(persisted.payload);

    const deserialized = persistence.deserialize(toRecord(migratedPayload));
    const openResult = registration.open
      ? await registration.open({
          view_id: registration.view_id,
          resource: deserialized.resource,
          initial_anchor: deserialized.activeAnchor,
        })
      : {
          resource: deserialized.resource,
          activeAnchor: deserialized.activeAnchor,
        };

    if ("ok" in openResult && openResult.ok === false) {
      return;
    }

    const resource = cloneJsonValue(openResult.resource || deserialized.resource);
    const activeAnchor = openResult.activeAnchor
      || deserialized.activeAnchor
      || registration.anchors[0]?.id
      || "";
    const manifest = createManifestSnapshot(registration, resource, activeAnchor);
    deps.setActiveViewState({
      viewId: registration.view_id,
      activeAnchor,
      resource,
      manifest,
    });
    lastHydratedStorageKey = persisted.storage_key;
    await deps.navigateToView(registration.view_id);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
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
      () => deps.getViewStateSnapshot().view_state_version,
      () => {
        schedulePersist(deps.getViewStateSnapshot());
      }
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
  };

  const dispose = () => {
    disposed = true;
    clearSaveTimer();
    watchStopHandle?.();
    watchStopHandle = null;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handlePageHide);
  };

  return {
    start,
    hydrate,
    flushActiveView,
    clear: () => deps.adapter.clear(),
    dispose,
    getLastHydratedStorageKey: () => lastHydratedStorageKey,
  };
}
