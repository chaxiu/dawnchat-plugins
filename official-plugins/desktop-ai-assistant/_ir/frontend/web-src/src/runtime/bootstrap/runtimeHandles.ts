import type { composeAssistantCoreRuntime } from "@dawnchat/assistant-core";

type AssistantCorePersistenceRuntime = ReturnType<typeof composeAssistantCoreRuntime>["persistenceRuntime"];

let persistenceRuntimeHandle: AssistantCorePersistenceRuntime | null = null;

export function setPersistenceRuntimeHandle(
  runtime: AssistantCorePersistenceRuntime | null
) {
  persistenceRuntimeHandle = runtime;
}

export function getPersistenceRuntimeHandle(): AssistantCorePersistenceRuntime | null {
  return persistenceRuntimeHandle;
}
