import { getHostOrchestrationTimer, type HostOrchestrationTimerHandle } from "./env";

export type PendingBridgeRequestSource = "bridge" | "local";

export interface PendingBridgeRequest<Result extends Record<string, unknown>> {
  source: PendingBridgeRequestSource;
  timer: HostOrchestrationTimerHandle;
  resolve?: (result: Result) => void;
}

export interface SchedulePendingBridgeRequest<Result extends Record<string, unknown>> {
  requestId: string;
  source: PendingBridgeRequestSource;
  timeoutMs: number;
  resolve?: (result: Result) => void;
}

export interface PendingBridgeRequestTracker<Result extends Record<string, unknown>> {
  finalize(requestId: string): PendingBridgeRequest<Result> | undefined;
  schedule(request: SchedulePendingBridgeRequest<Result>): void;
  failAll(
    resolver: (
      pending: PendingBridgeRequest<Result>,
      requestId: string
    ) => Result | null | undefined
  ): void;
  entries(): IterableIterator<[string, PendingBridgeRequest<Result>]>;
}

export interface CreatePendingBridgeRequestTrackerOptions<Result extends Record<string, unknown>> {
  onTimeout: (requestId: string, pending: PendingBridgeRequest<Result>) => void;
  onReplaced?: (requestId: string, pending: PendingBridgeRequest<Result>) => void;
}

export interface BridgeRequestTimeoutStrategy {
  resolveTimeoutMs(op: string, payload: Record<string, unknown>): number;
}

export interface BridgeRequestTimeoutStrategyOptions {
  defaultTimeoutMs?: number;
  sessionInvokeTimeoutMs?: number;
  sessionWaitTimeoutBufferMs?: number;
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

export function createPendingBridgeRequestTracker<Result extends Record<string, unknown>>(
  options: CreatePendingBridgeRequestTrackerOptions<Result>
): PendingBridgeRequestTracker<Result> {
  const timer = getHostOrchestrationTimer();
  const pendingRequests = new Map<string, PendingBridgeRequest<Result>>();

  const finalize = (requestId: string): PendingBridgeRequest<Result> | undefined => {
    const pending = pendingRequests.get(requestId);
    if (!pending) {
      return undefined;
    }
    timer.clearTimeout(pending.timer);
    pendingRequests.delete(requestId);
    return pending;
  };

  return {
    finalize,
    schedule(request) {
      const existing = finalize(request.requestId);
      if (existing) {
        options.onReplaced?.(request.requestId, existing);
      }
      const pending: PendingBridgeRequest<Result> = {
        source: request.source,
        timer: timer.setTimeout(() => {
          pendingRequests.delete(request.requestId);
          options.onTimeout(request.requestId, pending);
        }, request.timeoutMs),
        resolve: request.resolve,
      };
      pendingRequests.set(request.requestId, pending);
    },
    failAll(resolver) {
      for (const [requestId, pending] of Array.from(pendingRequests.entries())) {
        finalize(requestId);
        const result = resolver(pending, requestId);
        if (result && pending.source === "local") {
          pending.resolve?.(result);
        }
      }
    },
    entries() {
      return pendingRequests.entries();
    },
  };
}

export function createBridgeRequestTimeoutStrategy(
  options?: BridgeRequestTimeoutStrategyOptions
): BridgeRequestTimeoutStrategy {
  const defaultTimeoutMs = options?.defaultTimeoutMs ?? 20_000;
  const sessionInvokeTimeoutMs = options?.sessionInvokeTimeoutMs ?? 120_000;
  const sessionWaitTimeoutBufferMs = options?.sessionWaitTimeoutBufferMs ?? 5_000;

  return {
    resolveTimeoutMs(op: string, payload: Record<string, unknown>): number {
      if (op !== "capability_invoke") {
        return defaultTimeoutMs;
      }

      const functionName = String(payload.function || "").trim();
      if (functionName === "assistant.event.wait" || functionName === "assistant.session.wait_for_end") {
        const waitPayload = toRecord(payload.payload);
        const requestedTimeoutMs = typeof waitPayload.timeout_ms === "number"
          && Number.isFinite(waitPayload.timeout_ms)
          ? waitPayload.timeout_ms
          : sessionInvokeTimeoutMs;
        return Math.max(sessionInvokeTimeoutMs, requestedTimeoutMs + sessionWaitTimeoutBufferMs);
      }

      if (
        functionName.startsWith("assistant.session")
        || functionName.startsWith("assistant.session_")
        || functionName === "assistant.event.wait"
      ) {
        return sessionInvokeTimeoutMs;
      }

      return defaultTimeoutMs;
    },
  };
}
