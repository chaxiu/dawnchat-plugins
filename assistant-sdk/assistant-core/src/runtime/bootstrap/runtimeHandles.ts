import type { TaskRuntime } from "../task";

interface RuntimeHandles {
  persistenceRuntime?: {
    start: () => void;
    hydrate: () => Promise<void>;
    flushActiveView: () => Promise<void>;
    dispose: () => void;
  } | null;
  taskRuntime?: TaskRuntime | null;
}

declare global {
  interface Window {
    __DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__?: RuntimeHandles;
  }
}

const runtimeHandles: RuntimeHandles = {
  persistenceRuntime: null,
  taskRuntime: null,
};

function getSharedRuntimeHandles(): RuntimeHandles | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!window.__DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__) {
    window.__DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__ = {
      persistenceRuntime: null,
      taskRuntime: null,
    };
  }
  return window.__DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__;
}

export function setPersistenceRuntimeHandle(handle: RuntimeHandles["persistenceRuntime"]) {
  runtimeHandles.persistenceRuntime = handle || null;
  const shared = getSharedRuntimeHandles();
  if (shared) {
    shared.persistenceRuntime = handle || null;
  }
}

export function getPersistenceRuntimeHandle() {
  return runtimeHandles.persistenceRuntime || getSharedRuntimeHandles()?.persistenceRuntime || null;
}

export function setTaskRuntimeHandle(handle: RuntimeHandles["taskRuntime"]) {
  runtimeHandles.taskRuntime = handle || null;
  const shared = getSharedRuntimeHandles();
  if (shared) {
    shared.taskRuntime = handle || null;
  }
}

export function getTaskRuntimeHandle() {
  return runtimeHandles.taskRuntime || getSharedRuntimeHandles()?.taskRuntime || null;
}
