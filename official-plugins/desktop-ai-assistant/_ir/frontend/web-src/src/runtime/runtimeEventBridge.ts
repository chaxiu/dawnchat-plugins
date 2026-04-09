import {
  HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE,
  emitAssistantRuntimeEvent,
  installRuntimeEventEmitter,
  uninstallRuntimeEventEmitter,
} from "@dawnchat/assistant-core/runtime";
import type { AssistantRuntimeEventEnvelope } from "@dawnchat/assistant-core";

export {
  HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE,
  emitAssistantRuntimeEvent,
  installRuntimeEventEmitter,
  uninstallRuntimeEventEmitter,
};

export function postDesktopRuntimeEventToHost(event: AssistantRuntimeEventEnvelope): boolean {
  if (typeof window === "undefined" || !window.parent || window.parent === window) {
    throw new Error("desktop assistant runtime requires a parent window to post runtime events");
  }
  window.parent.postMessage({
    type: HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE,
    payload: event,
  }, "*");
  return true;
}
