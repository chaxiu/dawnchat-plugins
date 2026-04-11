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

function postRuntimeEventToHostImpl(event: AssistantRuntimeEventEnvelope): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  window.dispatchEvent(new CustomEvent(HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE, {
    detail: event,
  }));

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: HOST_ASSISTANT_RUNTIME_EVENT_MESSAGE,
      payload: event,
    }, "*");
  }

  return true;
}

export function postMobileRuntimeEventToHost(event: AssistantRuntimeEventEnvelope): boolean {
  return postRuntimeEventToHostImpl(event);
}
