import type { composeAssistantCoreRuntime } from "@dawnchat/assistant-core";

type AssistantCorePersistenceRuntime = ReturnType<typeof composeAssistantCoreRuntime>["persistenceRuntime"];
type AssistantCoreTaskRuntime = ReturnType<typeof composeAssistantCoreRuntime>["taskRuntime"];

declare global {
  interface Window {
    __DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__?: {
      persistenceRuntime?: AssistantCorePersistenceRuntime | null;
      taskRuntime?: AssistantCoreTaskRuntime | null;
    };
  }
}

let persistenceRuntimeHandle: AssistantCorePersistenceRuntime | null = null;
let taskRuntimeHandle: AssistantCoreTaskRuntime | null = null;

function getSharedRuntimeHandles() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!window.__DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__) {
    window.__DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__ = {};
  }
  return window.__DAWNCHAT_ASSISTANT_RUNTIME_HANDLES__;
}

export function setPersistenceRuntimeHandle(
  runtime: AssistantCorePersistenceRuntime | null
) {
  persistenceRuntimeHandle = runtime;
  const shared = getSharedRuntimeHandles();
  if (shared) {
    shared.persistenceRuntime = runtime;
  }
}

export function getPersistenceRuntimeHandle(): AssistantCorePersistenceRuntime | null {
  return persistenceRuntimeHandle;
}

export function setTaskRuntimeHandle(runtime: AssistantCoreTaskRuntime | null) {
  taskRuntimeHandle = runtime;
  const shared = getSharedRuntimeHandles();
  if (shared) {
    shared.taskRuntime = runtime;
  }
}

export function getTaskRuntimeHandle(): AssistantCoreTaskRuntime | null {
  return taskRuntimeHandle;
}
