import { registerCapabilities } from "../capabilities";
import { installRuntimeEventEmitter } from "../runtimeEventBridge";

import { composeMobileAssistantRuntime } from "./composeMobileAssistantRuntime";
import {
  setPersistenceRuntimeHandle,
  setTaskRuntimeHandle,
  setRuntimeCapabilityRegistrations,
  setMobileAssistantIdentityHandle,
} from "./runtimeHandles";

export function installAssistantRuntimeCapabilities(): string[] {
  const runtime = composeMobileAssistantRuntime() as ReturnType<typeof composeMobileAssistantRuntime> & {
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
  setMobileAssistantIdentityHandle(identity);
  persistenceRuntime.start();
  void persistenceRuntime.hydrate();
  return registerCapabilities(registrations).registered;
}
