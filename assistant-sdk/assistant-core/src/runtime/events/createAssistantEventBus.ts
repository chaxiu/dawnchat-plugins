import type {
  AssistantRuntimeEventEnvelope,
  AssistantRuntimeEventInput,
  AssistantRuntimeEventMatchOptions,
} from "./assistantEventTypes";

type EventListener = (event: AssistantRuntimeEventEnvelope) => void;

interface AssistantEventBusOptions {
  now?: () => number;
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return Boolean(raw) && typeof raw === "object" && !Array.isArray(raw);
}

function matchesPayload(
  payload: Record<string, unknown>,
  expected: Record<string, unknown> | undefined
): boolean {
  if (!expected) {
    return true;
  }
  return Object.entries(expected).every(([key, value]) => payload[key] === value);
}

function matchesEvent(
  event: AssistantRuntimeEventEnvelope,
  options: AssistantRuntimeEventMatchOptions | undefined
): boolean {
  if (!options) {
    return true;
  }
  if (options.event_types && options.event_types.length > 0 && !options.event_types.includes(event.type)) {
    return false;
  }
  if (options.session_id && options.session_id !== event.session_id) {
    return false;
  }
  if (options.step_id && options.step_id !== event.step_id) {
    return false;
  }
  return matchesPayload(event.payload, options.payload_match);
}

export interface AssistantEventBus {
  emit: (input: AssistantRuntimeEventInput) => AssistantRuntimeEventEnvelope;
  subscribe: (
    listener: EventListener,
    options?: AssistantRuntimeEventMatchOptions
  ) => () => void;
  waitForMatch: (
    options: AssistantRuntimeEventMatchOptions & { timeout_ms?: number; signal?: AbortSignal }
  ) => Promise<AssistantRuntimeEventEnvelope>;
}

export function createAssistantEventBus(options: AssistantEventBusOptions = {}): AssistantEventBus {
  const now = options.now || (() => Date.now());
  const listeners = new Set<{
    listener: EventListener;
    options?: AssistantRuntimeEventMatchOptions;
  }>();

  const emit = (input: AssistantRuntimeEventInput): AssistantRuntimeEventEnvelope => {
    const event: AssistantRuntimeEventEnvelope = {
      ts_ms: now(),
      type: input.type,
      source: input.source,
      session_id: input.session_id,
      step_id: input.step_id,
      payload: isRecord(input.payload) ? input.payload : {},
    };
    for (const registration of Array.from(listeners)) {
      if (!matchesEvent(event, registration.options)) {
        continue;
      }
      registration.listener(event);
    }
    return event;
  };

  const subscribe = (
    listener: EventListener,
    options?: AssistantRuntimeEventMatchOptions
  ): (() => void) => {
    const registration = { listener, options };
    listeners.add(registration);
    return () => {
      listeners.delete(registration);
    };
  };

  const waitForMatch: AssistantEventBus["waitForMatch"] = (options) => {
    const timeoutMs = typeof options.timeout_ms === "number" && options.timeout_ms >= 0
      ? options.timeout_ms
      : undefined;
    return new Promise<AssistantRuntimeEventEnvelope>((resolve, reject) => {
      let settled = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        unsubscribe();
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        options.signal?.removeEventListener("abort", onAbort);
      };
      const settleResolve = (event: AssistantRuntimeEventEnvelope) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(event);
      };
      const settleReject = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };
      const onAbort = () => {
        settleReject(new Error("wait_aborted"));
      };
      const unsubscribe = subscribe(settleResolve, options);

      if (timeoutMs !== undefined) {
        timeoutHandle = setTimeout(() => {
          settleReject(new Error("wait_timeout"));
        }, timeoutMs);
      }
      if (options.signal?.aborted) {
        settleReject(new Error("wait_aborted"));
        return;
      }
      options.signal?.addEventListener("abort", onAbort);
    });
  };

  return {
    emit,
    subscribe,
    waitForMatch,
  };
}
