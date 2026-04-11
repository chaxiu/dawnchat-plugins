import { registerCapabilities } from "../capabilities";
import { installRuntimeEventEmitter } from "../runtimeEventBridge";

import { composeMobileAssistantRuntime } from "./composeMobileAssistantRuntime";
import {
  setPersistenceRuntimeHandle,
  setRuntimeCapabilityRegistrations,
  setMobileAssistantIdentityHandle,
} from "./runtimeHandles";

export function installAssistantRuntimeCapabilities(): string[] {
  const {
    registrations,
    emitRuntimeEvent,
    persistenceRuntime,
    identity,
  } = composeMobileAssistantRuntime();
  installRuntimeEventEmitter(emitRuntimeEvent);
  setPersistenceRuntimeHandle(persistenceRuntime);
  setRuntimeCapabilityRegistrations(registrations);
  setMobileAssistantIdentityHandle(identity);
  persistenceRuntime.start();
  void persistenceRuntime.hydrate();
  return registerCapabilities(registrations).registered;
}
