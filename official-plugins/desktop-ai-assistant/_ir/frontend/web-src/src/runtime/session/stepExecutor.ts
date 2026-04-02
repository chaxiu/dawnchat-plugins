import type { UiCapabilityHandler, UiCapabilityRegistration } from "../capabilities";
import { createAppRuntime } from "../appRuntime";
import type {
  SessionStepCancelHandler,
  SessionStepRuntimeContext,
  StepActionResult,
} from "../contracts/sessionStep";
import { createFlowRuntime, type FlowWaitStateChange } from "../flowRuntime";
import { createGuideRuntime } from "../guide/runtime";
import type { GuideNarrationState, GuideTipPayload } from "../guide/state";
import { createViewRuntime } from "../view";
import { ASSISTANT_RUNTIME_EVENT_TYPES, type AssistantEventBus, type AssistantRuntimeEventInput } from "../events";
import type { SetActiveViewStateInput, ViewStateSnapshot } from "../view";
import type { WorkspaceArtifact, WorkspaceTaskProgress } from "../workspace";
import type { AssistantCardPayload } from "../../cards/types";

export type { SessionStepRuntimeContext } from "../contracts/sessionStep";

type StepActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;
type StepRuntimeHandlers = Record<string, StepActionHandler>;

interface ActiveStepExecution {
  sessionId: string;
  stepId?: string;
  stepIndex?: number;
  totalSteps?: number;
  cancelled: boolean;
  cancelReason?: string;
  cancelHandlers: Set<SessionStepCancelHandler>;
}

export interface SessionStepExecutorDeps {
  setCurrentCard: (card: AssistantCardPayload) => number;
  setActiveTip: (tip: GuideTipPayload | null) => void;
  setNarrationState: (state: GuideNarrationState) => void;
  setActiveViewState: (state: SetActiveViewStateInput) => number;
  getViewStateSnapshot: () => ViewStateSnapshot;
  setTaskProgress?: (progress: WorkspaceTaskProgress) => void;
  upsertArtifact?: (artifact: WorkspaceArtifact) => WorkspaceArtifact;
  removeArtifact?: (artifactId: string) => boolean;
  navigateToView: (viewId: string) => Promise<void> | void;
  onStepApplied?: (payload: {
    sessionId: string;
    stepId?: string;
    stepIndex?: number;
    totalSteps?: number;
    actionType: string;
    timeoutMs?: number;
  }) => void | Promise<void>;
  onStepStarted?: (payload: {
    sessionId: string;
    stepId?: string;
    stepIndex?: number;
    totalSteps?: number;
    actionType: string;
    timeoutMs?: number;
  }) => void | Promise<void>;
  onStepFailed?: (payload: {
    sessionId: string;
    stepId?: string;
    stepIndex?: number;
    totalSteps?: number;
    actionType: string;
    errorCode?: string;
    message?: string;
  }) => void | Promise<void>;
  onStepCancelled?: (payload: {
    sessionId: string;
    stepId?: string;
    stepIndex?: number;
    totalSteps?: number;
    reason?: string;
  }) => void | Promise<void>;
  onActiveSessionsChanged?: (sessionIds: string[]) => void;
  eventBus?: AssistantEventBus;
  onFlowWaitStateChanged?: (input: FlowWaitStateChange) => void | Promise<void>;
  emitRuntimeEvent?: (input: AssistantRuntimeEventInput) => void;
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function parseRuntimeActionType(actionType: string): {
  namespace: string;
  actionName: string;
} | null {
  const separatorIndex = actionType.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex === actionType.length - 1) {
    return null;
  }
  return {
    namespace: actionType.slice(0, separatorIndex),
    actionName: actionType.slice(separatorIndex + 1),
  };
}

function parseStepPayload(raw: Record<string, unknown>) {
  const sessionId = typeof raw.session_id === "string" ? raw.session_id.trim() : "";
  const stepId = typeof raw.step_id === "string" ? raw.step_id : undefined;
  const stepIndex = typeof raw.step_index === "number" && Number.isFinite(raw.step_index)
    ? raw.step_index
    : undefined;
  const totalSteps = typeof raw.total_steps === "number" && Number.isFinite(raw.total_steps)
    ? raw.total_steps
    : undefined;
  const action = toRecord(raw.action);
  const actionType = String(action.type || "").trim();
  const actionPayload = toRecord(action.payload);
  const timeoutMs = typeof raw.timeout_ms === "number" && Number.isFinite(raw.timeout_ms) ? raw.timeout_ms : undefined;
  return {
    sessionId,
    stepId,
    stepIndex,
    totalSteps,
    timeoutMs,
    actionType,
    actionPayload,
  };
}

function parseCancelPayload(raw: Record<string, unknown>) {
  return {
    sessionId: typeof raw.session_id === "string" ? raw.session_id.trim() : "",
    stepId: typeof raw.step_id === "string" ? raw.step_id.trim() : "",
    reason: typeof raw.reason === "string" ? raw.reason.trim() : "",
  };
}

function buildStepExecutionSchema(): Record<string, unknown> {
  const flowWaitPayloadSchema = {
    type: "object",
    properties: {
      event_types: {
        type: "array",
        minItems: 1,
        items: { type: "string" },
      },
      match: { type: "object" },
      timeout_ms: { type: "number", minimum: 0 },
      session_id: { type: "string" },
      step_id: { type: "string" },
    },
    required: ["event_types"],
  };
  return {
    type: "object",
    properties: {
      session_id: { type: "string" },
      step_id: { type: "string" },
      step_index: { type: "number", minimum: 0 },
      total_steps: { type: "number", minimum: 1 },
      action: {
        type: "object",
        properties: {
          type: { type: "string" },
          payload: { type: "object" },
        },
        required: ["type"],
        allOf: [
          {
            if: {
              properties: {
                type: { const: "flow.wait" },
              },
              required: ["type"],
            },
            then: {
              properties: {
                payload: flowWaitPayloadSchema,
              },
            },
          },
        ],
      },
      timeout_ms: { type: "number", minimum: 0 },
    },
    required: ["session_id", "action"],
  };
}

function buildStepCancelSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      session_id: { type: "string" },
      step_id: { type: "string" },
      reason: { type: "string" },
    },
    required: ["session_id"],
  };
}

export function createSessionStepCapabilityHandlers(deps: SessionStepExecutorDeps): {
  execute: UiCapabilityHandler;
  cancel: UiCapabilityHandler;
} {
  const emitRuntimeEvent = (input: AssistantRuntimeEventInput) => {
    deps.emitRuntimeEvent?.(input);
  };
  const runtimeHandlers: Record<string, StepRuntimeHandlers> = {
    guide: createGuideRuntime({
      ...deps,
      emitRuntimeEvent,
    }),
    view: createViewRuntime({
      ...deps,
      emitRuntimeEvent,
    }),
    app: createAppRuntime({
      setTaskProgress: deps.setTaskProgress,
      upsertArtifact: deps.upsertArtifact,
      removeArtifact: deps.removeArtifact,
      emitRuntimeEvent,
    }),
    flow: deps.eventBus
      ? createFlowRuntime({
          eventBus: deps.eventBus,
          onWaitStateChange: deps.onFlowWaitStateChanged,
        })
      : {},
  };
  const activeExecutionBySessionId = new Map<string, ActiveStepExecution>();
  const syncVisualSessionState = () => {
    deps.onActiveSessionsChanged?.(Array.from(activeExecutionBySessionId.keys()));
  };

  const execute: UiCapabilityHandler = async (rawPayload) => {
    const {
      sessionId,
      stepId,
      stepIndex,
      totalSteps,
      timeoutMs,
      actionType,
      actionPayload,
    } = parseStepPayload(rawPayload);
    if (!sessionId) {
      return {
        ok: false,
        error_code: "invalid_step",
        message: "Missing session_id in step payload",
      };
    }
    if (!actionType) {
      return {
        ok: false,
        error_code: "invalid_step",
        message: "Missing action.type in step payload",
      };
    }
    const parsedActionType = parseRuntimeActionType(actionType);
    if (!parsedActionType) {
      return {
        ok: false,
        error_code: "unsupported_action",
        message: `Unsupported action.type: ${actionType}`,
      };
    }
    const { namespace, actionName } = parsedActionType;
    const namespaceHandlers = runtimeHandlers[namespace];
    if (!namespaceHandlers) {
      return {
        ok: false,
        error_code: "unsupported_namespace",
        message: `Unsupported action namespace: ${namespace}`,
      };
    }
    const handler = namespaceHandlers[actionName];
    if (!handler) {
      return {
        ok: false,
        error_code: "unsupported_action",
        message: `Unsupported action.type: ${actionType}`,
      };
    }
    const execution: ActiveStepExecution = {
      sessionId,
      stepId,
      stepIndex,
      totalSteps,
      cancelled: false,
      cancelHandlers: new Set<SessionStepCancelHandler>(),
    };
    activeExecutionBySessionId.set(sessionId, execution);
    syncVisualSessionState();
    emitRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_STARTED,
      source: "session",
      session_id: sessionId,
      step_id: stepId,
      payload: {
        action_type: actionType,
        step_index: stepIndex,
        total_steps: totalSteps,
        timeout_ms: timeoutMs,
      },
    });
    await deps.onStepStarted?.({
      sessionId,
      stepId,
      stepIndex,
      totalSteps,
      actionType,
      timeoutMs,
    });
    const context: SessionStepRuntimeContext = {
      sessionId,
      stepId,
      stepIndex,
      totalSteps,
      timeoutMs,
      isCancelled: () => execution.cancelled,
      onCancel: (cancelHandler) => {
        execution.cancelHandlers.add(cancelHandler);
      },
    };
    try {
      const result = await handler(actionPayload, context);
      if (!result.ok) {
        if (result.error_code === "step_cancelled") {
          return result;
        }
        emitRuntimeEvent({
          type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_FAILED,
          source: "session",
          session_id: sessionId,
          step_id: stepId,
          payload: {
            action_type: actionType,
            step_index: stepIndex,
            total_steps: totalSteps,
            error_code: result.error_code,
            message: result.message,
          },
        });
        await deps.onStepFailed?.({
          sessionId,
          stepId,
          stepIndex,
          totalSteps,
          actionType,
          errorCode: result.error_code,
          message: result.message,
        });
        return result;
      }
      emitRuntimeEvent({
        type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_COMPLETED,
        source: "session",
        session_id: sessionId,
        step_id: stepId,
        payload: {
          action_type: actionType,
          step_index: stepIndex,
          total_steps: totalSteps,
        },
      });
      await deps.onStepApplied?.({
        sessionId,
        stepId,
        stepIndex,
        totalSteps,
        actionType,
        timeoutMs,
      });
      return {
        ...result,
        data: {
          ...toRecord(result.data),
          session_id: sessionId,
          step_id: stepId,
          step_index: stepIndex,
          total_steps: totalSteps,
          action_type: actionType,
          timeout_ms: timeoutMs,
        },
      };
    } finally {
      if (activeExecutionBySessionId.get(sessionId) === execution) {
        activeExecutionBySessionId.delete(sessionId);
        syncVisualSessionState();
      }
    }
  };

  const cancel: UiCapabilityHandler = async (rawPayload) => {
    const { sessionId, stepId, reason } = parseCancelPayload(rawPayload);
    if (!sessionId) {
      return {
        ok: false,
        error_code: "invalid_arguments",
        message: "session_id is required",
      };
    }
    const activeExecution = activeExecutionBySessionId.get(sessionId);
    if (!activeExecution) {
      return {
        ok: true,
        data: {
          session_id: sessionId,
          step_id: stepId,
          active_step_found: false,
          cancel_requested: false,
        },
      };
    }
    if (stepId && activeExecution.stepId && activeExecution.stepId !== stepId) {
      return {
        ok: true,
        data: {
          session_id: sessionId,
          step_id: activeExecution.stepId,
          active_step_found: false,
          cancel_requested: false,
        },
      };
    }
    activeExecution.cancelled = true;
    activeExecution.cancelReason = reason || undefined;
    const cancelHandlers = Array.from(activeExecution.cancelHandlers);
    await Promise.allSettled(
      cancelHandlers.map(async (cancelHandler) => {
        await cancelHandler();
      })
    );
    await deps.onStepCancelled?.({
      sessionId,
      stepId: activeExecution.stepId,
      stepIndex: activeExecution.stepIndex,
      totalSteps: activeExecution.totalSteps,
      reason: activeExecution.cancelReason,
    });
    emitRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_STEP_CANCELLED,
      source: "session",
      session_id: sessionId,
      step_id: activeExecution.stepId,
      payload: {
        reason: activeExecution.cancelReason,
      },
    });
    return {
      ok: true,
      data: {
        session_id: sessionId,
        step_id: activeExecution.stepId || "",
        active_step_found: true,
        cancel_requested: true,
        reason: activeExecution.cancelReason || "",
      },
    };
  };

  return {
    execute,
    cancel,
  };
}

export function createSessionStepHandler(deps: SessionStepExecutorDeps): UiCapabilityHandler {
  return createSessionStepCapabilityHandlers(deps).execute;
}

export function createSessionStepCapabilityRegistrations(
  deps: SessionStepExecutorDeps
): UiCapabilityRegistration[] {
  const handlers = createSessionStepCapabilityHandlers(deps);
  return [
    {
      definition: {
        name: "assistant.session_step_execute",
        description: "Execute a session step with plugin-controlled action payload",
        input_schema: buildStepExecutionSchema(),
      },
      handler: handlers.execute,
    },
    {
      definition: {
        name: "assistant.session_step_cancel",
        description: "Cancel the currently running plugin-owned session step",
        input_schema: buildStepCancelSchema(),
      },
      handler: handlers.cancel,
    },
  ];
}

export function createSessionStepCapabilityRegistration(
  deps: SessionStepExecutorDeps
): UiCapabilityRegistration {
  return createSessionStepCapabilityRegistrations(deps)[0];
}
