import { registerCapabilities } from "../capabilities";
import { installRuntimeEventEmitter } from "../runtimeEventBridge";

import { composeDesktopAssistantRuntime } from "./composeRuntime";
import { setPersistenceRuntimeHandle } from "./runtimeHandles";

export function installAssistantRuntimeCapabilities(): string[] {
  const { registrations, emitRuntimeEvent, persistenceRuntime } = composeDesktopAssistantRuntime();
  // The event bus is the authoritative runtime stream.
  // UI cards can emit into the same stream through the bridge outside step execution.
  installRuntimeEventEmitter(emitRuntimeEvent);
  setPersistenceRuntimeHandle(persistenceRuntime);
  persistenceRuntime.start();
  void persistenceRuntime.hydrate();
  return registerCapabilities(registrations).registered;
}
