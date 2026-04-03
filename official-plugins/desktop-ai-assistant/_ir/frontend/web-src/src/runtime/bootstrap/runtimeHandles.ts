interface RuntimeHandles {
  persistenceRuntime?: {
    start: () => void;
    hydrate: () => Promise<void>;
    flushActiveView: () => Promise<void>;
    dispose: () => void;
  } | null;
}

const runtimeHandles: RuntimeHandles = {
  persistenceRuntime: null,
};

export function setPersistenceRuntimeHandle(handle: RuntimeHandles["persistenceRuntime"]) {
  runtimeHandles.persistenceRuntime = handle || null;
}

export function getPersistenceRuntimeHandle() {
  return runtimeHandles.persistenceRuntime;
}
