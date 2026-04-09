import type { AssistantRuntimeEventEnvelope, AssistantRuntimeEventInput } from "./events";
import { getAssistantHostAdapter } from "./hostAdapter";

type RuntimeEventEmitter = (input: AssistantRuntimeEventInput) => void;

export const HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE = "DAWNCHAT_ASSISTANT_RUNTIME_EVENT";

let runtimeEventEmitter: RuntimeEventEmitter | null = null;

export function installRuntimeEventEmitter(emitter: RuntimeEventEmitter) {
  runtimeEventEmitter = emitter;
}

export function uninstallRuntimeEventEmitter() {
  runtimeEventEmitter = null;
}

export function emitAssistantRuntimeEvent(input: AssistantRuntimeEventInput): boolean {
  if (!runtimeEventEmitter) {
    return false;
  }
  runtimeEventEmitter(input);
  return true;
}

export function postAssistantRuntimeEventToHost(event: AssistantRuntimeEventEnvelope): boolean {
  const adapter = getAssistantHostAdapter();
  if (adapter?.postRuntimeEventToHost) {
    return adapter.postRuntimeEventToHost(event);
  }
  throw new Error("assistant host adapter with postRuntimeEventToHost is required");
}
