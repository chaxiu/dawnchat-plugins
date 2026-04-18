import type { TaskRuntime, UiCapabilityRegistration } from "@dawnchat/assistant-core";

import type { MobileAssistantIdentity } from "../assistantIdentity";

interface RuntimeHandles {
  persistenceRuntime?: {
    start: () => void;
    hydrate: () => Promise<void>;
    flushActiveView: () => Promise<void>;
    dispose: () => void;
  } | null;
  taskRuntime?: TaskRuntime | null;
  capabilityRegistrations?: UiCapabilityRegistration[];
  identity?: MobileAssistantIdentity | null;
}

declare global {
  interface Window {
    __DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__?: {
      persistenceRuntime?: RuntimeHandles["persistenceRuntime"];
      taskRuntime?: RuntimeHandles["taskRuntime"];
    };
  }
}

const runtimeHandles: RuntimeHandles = {
  persistenceRuntime: null,
  taskRuntime: null,
  capabilityRegistrations: [],
  identity: null,
};

function getSharedRuntimeHandles() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!window.__DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__) {
    window.__DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__ = {};
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
  return runtimeHandles.persistenceRuntime;
}

export function setTaskRuntimeHandle(handle: RuntimeHandles["taskRuntime"]) {
  runtimeHandles.taskRuntime = handle || null;
  const shared = getSharedRuntimeHandles();
  if (shared) {
    shared.taskRuntime = handle || null;
  }
}

export function getTaskRuntimeHandle() {
  return runtimeHandles.taskRuntime;
}

export function setRuntimeCapabilityRegistrations(registrations: UiCapabilityRegistration[]) {
  runtimeHandles.capabilityRegistrations = [...registrations];
}

export function getRuntimeCapabilityRegistrations() {
  return runtimeHandles.capabilityRegistrations || [];
}

export function setMobileAssistantIdentityHandle(identity: MobileAssistantIdentity | null) {
  runtimeHandles.identity = identity;
}

export function getMobileAssistantIdentityHandle() {
  return runtimeHandles.identity || null;
}
