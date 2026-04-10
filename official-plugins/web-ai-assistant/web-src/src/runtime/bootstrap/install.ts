import { registerCapabilities } from "../capabilities";
import { installRuntimeEventEmitter } from "../runtimeEventBridge";

import { composeWebAssistantRuntime } from "./composeWebAssistantRuntime";
import {
  setPersistenceRuntimeHandle,
  setRuntimeCapabilityRegistrations,
  setWebAssistantIdentityHandle,
} from "./runtimeHandles";

export function installAssistantRuntimeCapabilities(): string[] {
  const {
    registrations,
    emitRuntimeEvent,
    persistenceRuntime,
    identity,
  } = composeWebAssistantRuntime();
  installRuntimeEventEmitter(emitRuntimeEvent);
  setPersistenceRuntimeHandle(persistenceRuntime);
  setRuntimeCapabilityRegistrations(registrations);
  setWebAssistantIdentityHandle(identity);
  persistenceRuntime.start();
  void persistenceRuntime.hydrate();
  return registerCapabilities(registrations).registered;
}
