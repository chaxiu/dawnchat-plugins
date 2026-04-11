import type { UiCapabilityRegistration } from "@dawnchat/assistant-core";

import type { MobileAssistantIdentity } from "../assistantIdentity";

interface RuntimeHandles {
  persistenceRuntime?: {
    start: () => void;
    hydrate: () => Promise<void>;
    flushActiveView: () => Promise<void>;
    dispose: () => void;
  } | null;
  capabilityRegistrations?: UiCapabilityRegistration[];
  identity?: MobileAssistantIdentity | null;
}

const runtimeHandles: RuntimeHandles = {
  persistenceRuntime: null,
  capabilityRegistrations: [],
  identity: null,
};

export function setPersistenceRuntimeHandle(handle: RuntimeHandles["persistenceRuntime"]) {
  runtimeHandles.persistenceRuntime = handle || null;
}

export function getPersistenceRuntimeHandle() {
  return runtimeHandles.persistenceRuntime;
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
