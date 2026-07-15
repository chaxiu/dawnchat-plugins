import {
  IFRAME_UI_AGENT_MESSAGE,
  type HostInvokeRequest,
} from "@dawnchat/host-orchestration-sdk/assistant-client";

const HOST_INVOKE_TIMEOUT_MS = 5000;

type PendingRequest = {
  resolve: (result: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: number;
};

const pendingRequests = new Map<string, PendingRequest>();
let listenerInstalled = false;

function ensureListener() {
  if (listenerInstalled || typeof window === "undefined") {
    return;
  }
  window.addEventListener("message", (event: MessageEvent<Record<string, unknown>>) => {
    if (!event.data || typeof event.data !== "object") {
      return;
    }
    if (event.data.type !== IFRAME_UI_AGENT_MESSAGE.HOST_INVOKE_RESULT) {
      return;
    }
    const requestId = String(event.data.requestId || "").trim();
    if (!requestId) {
      return;
    }
    const pending = pendingRequests.get(requestId);
    if (!pending) {
      return;
    }
    window.clearTimeout(pending.timer);
    pendingRequests.delete(requestId);
    const result = event.data.result;
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      pending.reject(new Error("invalid host invoke result"));
      return;
    }
    pending.resolve(result as Record<string, unknown>);
  });
  listenerInstalled = true;
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `host_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function invokeDesktopHost(
  functionName: string,
  payload: Record<string, unknown> = {},
  options: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  if (typeof window === "undefined" || !window.parent || window.parent === window) {
    throw new Error("desktop assistant runtime requires a parent window for host invoke");
  }
  ensureListener();
  const requestId = createRequestId();
  const request: HostInvokeRequest = {
    functionName,
    payload,
    options,
  };
  return await new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`host invoke timeout: ${functionName}`));
    }, HOST_INVOKE_TIMEOUT_MS);
    pendingRequests.set(requestId, {
      resolve,
      reject,
      timer,
    });
    window.parent.postMessage(
      {
        type: IFRAME_UI_AGENT_MESSAGE.HOST_INVOKE_REQUEST,
        requestId,
        payload: request,
      },
      "*"
    );
  });
}
