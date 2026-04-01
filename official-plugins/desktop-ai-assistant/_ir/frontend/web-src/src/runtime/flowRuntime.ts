import type { SessionStepRuntimeContext } from "./sessionStepExecutor";
import type { StepActionResult } from "./viewRuntime.shared";
import type { AssistantEventBus, AssistantRuntimeEventType } from "./events";

type FlowActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;

export interface FlowRuntimeDeps {
  eventBus: AssistantEventBus;
  onWaitStateChange?: (input: FlowWaitStateChange) => void | Promise<void>;
}

export interface FlowWaitStateChange {
  status: "waiting" | "matched" | "timed_out" | "cancelled" | "failed";
  sessionId: string;
  stepId?: string;
  stepIndex?: number;
  totalSteps?: number;
  eventCursorSeq: number;
  pendingWait: {
    action_type: "flow.wait";
    session_id: string;
    step_id?: string;
    step_index?: number;
    total_steps?: number;
    event_types: AssistantRuntimeEventType[];
    match?: Record<string, unknown>;
    timeout_ms?: number;
    event_cursor_seq: number;
    waiting_since_ms: number;
  } | null;
}

type FlowRuntimeHandlers = Record<string, FlowActionHandler>;

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function toEventTypes(raw: unknown): AssistantRuntimeEventType[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean) as AssistantRuntimeEventType[];
}

function resolveTimeoutMs(payload: Record<string, unknown>, context: SessionStepRuntimeContext): number | undefined {
  const payloadTimeout = payload.timeout_ms;
  if (typeof payloadTimeout === "number" && Number.isFinite(payloadTimeout) && payloadTimeout >= 0) {
    return payloadTimeout;
  }
  if (typeof context.timeoutMs === "number" && Number.isFinite(context.timeoutMs) && context.timeoutMs >= 0) {
    return context.timeoutMs;
  }
  return undefined;
}

function buildRecentEventsSummary(
  eventBus: AssistantEventBus,
  sessionId: string,
  eventTypes: AssistantRuntimeEventType[],
  stepId?: string
) {
  return eventBus.getRecentEvents({
    session_id: sessionId,
    step_id: stepId,
    event_types: eventTypes,
    limit: 10,
  }).map((event) => ({
    seq: event.seq,
    type: event.type,
    ts_ms: event.ts_ms,
    source: event.source,
    step_id: event.step_id,
    payload: event.payload,
  }));
}

export function createFlowRuntime(deps: FlowRuntimeDeps): FlowRuntimeHandlers {
  return {
    wait: async (payload, context) => {
      if (context.isCancelled()) {
        return {
          ok: false,
          error_code: "step_cancelled",
          message: "flow.wait cancelled before start",
        };
      }
      const input = toRecord(payload);
      const eventTypes = toEventTypes(input.event_types);
      if (eventTypes.length === 0) {
        return {
          ok: false,
          error_code: "invalid_flow_payload",
          message: "flow.wait requires payload.event_types as a non-empty string array",
        };
      }
      const abortController = new AbortController();
      context.onCancel(() => {
        abortController.abort();
      });
      const eventCursorSeq = deps.eventBus.getLatestSeq();
      const pendingWait = {
        action_type: "flow.wait" as const,
        session_id: context.sessionId,
        step_id: context.stepId,
        step_index: context.stepIndex,
        total_steps: context.totalSteps,
        event_types: eventTypes,
        match: Object.keys(toRecord(input.match)).length > 0 ? toRecord(input.match) : undefined,
        timeout_ms: resolveTimeoutMs(input, context),
        event_cursor_seq: eventCursorSeq,
        waiting_since_ms: Date.now(),
      };
      void deps.onWaitStateChange?.({
        status: "waiting",
        sessionId: context.sessionId,
        stepId: context.stepId,
        stepIndex: context.stepIndex,
        totalSteps: context.totalSteps,
        eventCursorSeq,
        pendingWait,
      });
      try {
        const matchedEvent = await deps.eventBus.waitForMatch({
          event_types: eventTypes,
          session_id: typeof input.session_id === "string" ? input.session_id.trim() : undefined,
          step_id: typeof input.step_id === "string" ? input.step_id.trim() : undefined,
          payload_match: toRecord(input.match),
          timeout_ms: resolveTimeoutMs(input, context),
          signal: abortController.signal,
        });
        await deps.onWaitStateChange?.({
          status: "matched",
          sessionId: context.sessionId,
          stepId: context.stepId,
          stepIndex: context.stepIndex,
          totalSteps: context.totalSteps,
          eventCursorSeq: matchedEvent.seq,
          pendingWait: null,
        });
        return {
          ok: true,
          data: {
            status: "matched",
            matched_event: matchedEvent,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "flow wait failed";
        if (message === "wait_timeout") {
          await deps.onWaitStateChange?.({
            status: "timed_out",
            sessionId: context.sessionId,
            stepId: context.stepId,
            stepIndex: context.stepIndex,
            totalSteps: context.totalSteps,
            eventCursorSeq: deps.eventBus.getLatestSeq(),
            pendingWait: null,
          });
          const recentEvents = buildRecentEventsSummary(
            deps.eventBus,
            context.sessionId,
            eventTypes,
            context.stepId
          );
          return {
            ok: false,
            error_code: "flow_wait_timeout",
            message: "flow.wait timed out before matching any event",
            data: {
              latest_seq: deps.eventBus.getLatestSeq(),
              waited_event_types: eventTypes,
              recent_events: recentEvents,
            },
          };
        }
        if (message === "wait_aborted" || context.isCancelled()) {
          await deps.onWaitStateChange?.({
            status: "cancelled",
            sessionId: context.sessionId,
            stepId: context.stepId,
            stepIndex: context.stepIndex,
            totalSteps: context.totalSteps,
            eventCursorSeq: deps.eventBus.getLatestSeq(),
            pendingWait: null,
          });
          const recentEvents = buildRecentEventsSummary(
            deps.eventBus,
            context.sessionId,
            eventTypes,
            context.stepId
          );
          return {
            ok: false,
            error_code: "step_cancelled",
            message: "flow.wait cancelled",
            data: {
              latest_seq: deps.eventBus.getLatestSeq(),
              waited_event_types: eventTypes,
              recent_events: recentEvents,
            },
          };
        }
        await deps.onWaitStateChange?.({
          status: "failed",
          sessionId: context.sessionId,
          stepId: context.stepId,
          stepIndex: context.stepIndex,
          totalSteps: context.totalSteps,
          eventCursorSeq: deps.eventBus.getLatestSeq(),
          pendingWait: null,
        });
        return {
          ok: false,
          error_code: "flow_wait_failed",
          message,
        };
      }
    },
  };
}
