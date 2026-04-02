import type {
  AssistantRuntimeEventEnvelope,
  AssistantRuntimeEventInput,
  AssistantRuntimeEventMatchOptions,
  AssistantRuntimeEventQueryOptions,
} from "./assistantEventTypes";

type EventListener = (event: AssistantRuntimeEventEnvelope) => void;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface AssistantEventBusOptions {
  storage?: StorageLike | null;
  storageKey?: string;
  maxHistorySize?: number;
  persistWindowMs?: number;
  now?: () => number;
}

interface PersistedAssistantEventState {
  version: 1;
  stream_id: string;
  seq: number;
  updated_at_ms: number;
  history: AssistantRuntimeEventEnvelope[];
}

const DEFAULT_STORAGE_KEY = "dawnchat.assistant.runtime.events.v1";
const DEFAULT_MAX_HISTORY_SIZE = 300;
const DEFAULT_PERSIST_WINDOW_MS = 30 * 60 * 1000;

function createStreamId(now: number): string {
  return `stream-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEventId(streamId: string, seq: number, now: number): string {
  return `evt-${streamId}-${now}-${seq}`;
}

function getStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage === null) {
    return null;
  }
  if (storage) {
    return storage;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isEventEnvelope(raw: unknown): raw is AssistantRuntimeEventEnvelope {
  if (!isRecord(raw)) {
    return false;
  }
  return (
    typeof raw.event_id === "string"
    && typeof raw.seq === "number"
    && Number.isFinite(raw.seq)
    && typeof raw.type === "string"
    && typeof raw.ts_ms === "number"
    && Number.isFinite(raw.ts_ms)
    && typeof raw.source === "string"
    && isRecord(raw.payload)
  );
}

function normalizeHistory(rawHistory: unknown, maxHistorySize: number): AssistantRuntimeEventEnvelope[] {
  if (!Array.isArray(rawHistory)) {
    return [];
  }
  const history = rawHistory
    .filter(isEventEnvelope)
    .sort((left, right) => left.seq - right.seq);
  if (history.length <= maxHistorySize) {
    return history;
  }
  return history.slice(history.length - maxHistorySize);
}

function loadPersistedState(options: {
  storage: StorageLike | null;
  storageKey: string;
  maxHistorySize: number;
  persistWindowMs: number;
  now: number;
}): {
  streamId: string;
  seq: number;
  history: AssistantRuntimeEventEnvelope[];
} {
  const { storage, storageKey, maxHistorySize, persistWindowMs, now } = options;
  if (!storage) {
    return {
      streamId: createStreamId(now),
      seq: 0,
      history: [],
    };
  }
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return {
        streamId: createStreamId(now),
        seq: 0,
        history: [],
      };
    }
    const parsed = JSON.parse(raw) as PersistedAssistantEventState;
    if (
      !parsed
      || parsed.version !== 1
      || typeof parsed.stream_id !== "string"
      || !parsed.stream_id.trim()
      || typeof parsed.seq !== "number"
      || !Number.isFinite(parsed.seq)
      || typeof parsed.updated_at_ms !== "number"
      || !Number.isFinite(parsed.updated_at_ms)
    ) {
      storage.removeItem(storageKey);
      return {
        streamId: createStreamId(now),
        seq: 0,
        history: [],
      };
    }
    if (now - parsed.updated_at_ms > persistWindowMs) {
      storage.removeItem(storageKey);
      return {
        streamId: createStreamId(now),
        seq: 0,
        history: [],
      };
    }
    const history = normalizeHistory(parsed.history, maxHistorySize);
    const latestSeq = history.length > 0 ? history[history.length - 1].seq : 0;
    return {
      streamId: parsed.stream_id,
      seq: Math.max(Math.floor(parsed.seq), latestSeq),
      history,
    };
  } catch {
    storage.removeItem(storageKey);
    return {
      streamId: createStreamId(now),
      seq: 0,
      history: [],
    };
  }
}

function persistState(
  storage: StorageLike | null,
  storageKey: string,
  streamId: string,
  seq: number,
  history: AssistantRuntimeEventEnvelope[],
  now: number
): void {
  if (!storage) {
    return;
  }
  const payload: PersistedAssistantEventState = {
    version: 1,
    stream_id: streamId,
    seq,
    updated_at_ms: now,
    history,
  };
  try {
    storage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures to keep runtime events in-memory.
  }
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
  getLatestSeq: () => number;
  getRecentEvents: (options?: AssistantRuntimeEventQueryOptions) => AssistantRuntimeEventEnvelope[];
}

export function createAssistantEventBus(options: AssistantEventBusOptions = {}): AssistantEventBus {
  const now = options.now || (() => Date.now());
  const storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
  const maxHistorySize = options.maxHistorySize || DEFAULT_MAX_HISTORY_SIZE;
  const persistWindowMs = options.persistWindowMs || DEFAULT_PERSIST_WINDOW_MS;
  const storage = getStorage(options.storage);
  const persistedState = loadPersistedState({
    storage,
    storageKey,
    maxHistorySize,
    persistWindowMs,
    now: now(),
  });
  const history: AssistantRuntimeEventEnvelope[] = [...persistedState.history];
  let seq = persistedState.seq;
  let streamId = persistedState.streamId;
  const listeners = new Set<{
    listener: EventListener;
    options?: AssistantRuntimeEventMatchOptions;
  }>();

  const emit = (input: AssistantRuntimeEventInput): AssistantRuntimeEventEnvelope => {
    seq += 1;
    const eventTs = now();
    const event: AssistantRuntimeEventEnvelope = {
      event_id: createEventId(streamId, seq, eventTs),
      seq,
      type: input.type,
      ts_ms: eventTs,
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
    history.push(event);
    if (history.length > maxHistorySize) {
      history.splice(0, history.length - maxHistorySize);
    }
    persistState(storage, storageKey, streamId, seq, history, eventTs);
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

  const getRecentEvents: AssistantEventBus["getRecentEvents"] = (options) => {
    const sinceSeq = typeof options?.since_seq === "number" && Number.isFinite(options.since_seq)
      ? options.since_seq
      : 0;
    const normalizedLimit = typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(Math.floor(options.limit), 200))
      : 50;
    const filtered = history.filter((event) => {
      if (event.seq <= sinceSeq) {
        return false;
      }
      return matchesEvent(event, options);
    });
    if (filtered.length <= normalizedLimit) {
      return [...filtered];
    }
    return filtered.slice(filtered.length - normalizedLimit);
  };

  return {
    emit,
    subscribe,
    waitForMatch,
    getLatestSeq: () => seq,
    getRecentEvents,
  };
}
