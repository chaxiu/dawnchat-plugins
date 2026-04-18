import { registerCapabilities } from "../capabilities";
import { installRuntimeEventEmitter } from "../runtimeEventBridge";

import { composeWebAssistantRuntime } from "./composeWebAssistantRuntime";
import {
  setPersistenceRuntimeHandle,
  setTaskRuntimeHandle,
  setRuntimeCapabilityRegistrations,
  setWebAssistantIdentityHandle,
} from "./runtimeHandles";

export function installAssistantRuntimeCapabilities(): string[] {
  const runtime = composeWebAssistantRuntime() as ReturnType<typeof composeWebAssistantRuntime> & {
    taskRuntime: unknown;
  };
  const {
    registrations,
    emitRuntimeEvent,
    persistenceRuntime,
    taskRuntime,
    identity,
  } = runtime;
  installRuntimeEventEmitter(emitRuntimeEvent);
  setPersistenceRuntimeHandle(persistenceRuntime);
  setTaskRuntimeHandle(taskRuntime);
  setRuntimeCapabilityRegistrations(registrations);
  setWebAssistantIdentityHandle(identity);
  persistenceRuntime.start();
  void persistenceRuntime.hydrate();
  return registerCapabilities(registrations).registered;
}
