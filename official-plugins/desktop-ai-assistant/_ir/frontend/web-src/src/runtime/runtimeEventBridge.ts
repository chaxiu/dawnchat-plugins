import type { AssistantRuntimeEventEnvelope, AssistantRuntimeEventInput } from "./events";

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
  if (typeof window === "undefined" || !window.parent || window.parent === window) {
    return false;
  }
  try {
    window.parent.postMessage({
      type: HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE,
      payload: event,
    }, "*");
    return true;
  } catch {
    return false;
  }
}
