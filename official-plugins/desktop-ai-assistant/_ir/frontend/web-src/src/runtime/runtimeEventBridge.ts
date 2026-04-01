import type { AssistantRuntimeEventInput } from "./events";

type RuntimeEventEmitter = (input: AssistantRuntimeEventInput) => void;

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
