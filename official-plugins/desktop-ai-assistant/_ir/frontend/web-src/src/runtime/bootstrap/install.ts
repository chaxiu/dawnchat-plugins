import { registerCapabilities } from "../capabilities";
import { installRuntimeEventEmitter } from "../runtimeEventBridge";

import { composeAssistantRuntimeRegistrations } from "./composeRuntime";

export function installAssistantRuntimeCapabilities(): string[] {
  const { registrations, emitRuntimeEvent } = composeAssistantRuntimeRegistrations();
  // The event bus is the authoritative runtime stream.
  // UI cards can emit into the same stream through the bridge outside step execution.
  installRuntimeEventEmitter(emitRuntimeEvent);
  return registerCapabilities(registrations).registered;
}
