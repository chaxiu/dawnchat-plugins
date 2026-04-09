import type { SessionStepRuntimeContext } from "./contracts/sessionStep";
import type { StepActionResult } from "./contracts/sessionStep";
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
  pendingWait: {
    action_type: "flow.wait";
    session_id: string;
    step_id?: string;
    step_index?: number;
    total_steps?: number;
    event_types: AssistantRuntimeEventType[];
    match?: Record<string, unknown>;
    timeout_ms?: number;
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

function buildWaitMatchOptions(
  payload: Record<string, unknown>,
  match: Record<string, unknown>
): {
  event_types: AssistantRuntimeEventType[];
  session_id?: string;
  step_id?: string;
  payload_match: Record<string, unknown>;
} {
  return {
    event_types: toEventTypes(payload.event_types),
    session_id: typeof payload.session_id === "string" ? payload.session_id.trim() : undefined,
    step_id: typeof payload.step_id === "string" ? payload.step_id.trim() : undefined,
    payload_match: match,
  };
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
      const payloadMatch = toRecord(input.match);
      const waitMatchOptions = buildWaitMatchOptions(input, payloadMatch);
      const pendingWait = {
        action_type: "flow.wait" as const,
        session_id: context.sessionId,
        step_id: context.stepId,
        step_index: context.stepIndex,
        total_steps: context.totalSteps,
        event_types: eventTypes,
        match: Object.keys(payloadMatch).length > 0 ? payloadMatch : undefined,
        timeout_ms: resolveTimeoutMs(input, context),
        waiting_since_ms: Date.now(),
      };
      void deps.onWaitStateChange?.({
        status: "waiting",
        sessionId: context.sessionId,
        stepId: context.stepId,
        stepIndex: context.stepIndex,
        totalSteps: context.totalSteps,
        pendingWait,
      });
      try {
        const matchedEvent = await deps.eventBus.waitForMatch({
          ...waitMatchOptions,
          timeout_ms: resolveTimeoutMs(input, context),
          signal: abortController.signal,
        });
        await deps.onWaitStateChange?.({
          status: "matched",
          sessionId: context.sessionId,
          stepId: context.stepId,
          stepIndex: context.stepIndex,
          totalSteps: context.totalSteps,
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
            pendingWait: null,
          });
          return {
            ok: false,
            error_code: "flow_wait_timeout",
            message: "flow.wait timed out before matching any event",
            data: {
              waited_event_types: eventTypes,
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
            pendingWait: null,
          });
          return {
            ok: false,
            error_code: "step_cancelled",
            message: "flow.wait cancelled",
            data: {
              waited_event_types: eventTypes,
            },
          };
        }
        await deps.onWaitStateChange?.({
          status: "failed",
          sessionId: context.sessionId,
          stepId: context.stepId,
          stepIndex: context.stepIndex,
          totalSteps: context.totalSteps,
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
