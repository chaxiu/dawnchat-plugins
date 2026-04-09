import { registerCapabilities } from "../capabilities";
import { installRuntimeEventEmitter } from "../runtimeEventBridge";

import { composeWebAssistantRuntime } from "./composeWebAssistantRuntime";
import { setPersistenceRuntimeHandle } from "./runtimeHandles";

export function installAssistantRuntimeCapabilities(): string[] {
  const { registrations, emitRuntimeEvent, persistenceRuntime } = composeWebAssistantRuntime();
  installRuntimeEventEmitter(emitRuntimeEvent);
  setPersistenceRuntimeHandle(persistenceRuntime);
  persistenceRuntime.start();
  void persistenceRuntime.hydrate();
  return registerCapabilities(registrations).registered;
}
