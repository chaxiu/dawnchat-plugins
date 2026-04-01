import type { UiCapabilityHandler, UiCapabilityRegistration } from "./capabilities";
import { createGuideRuntime } from "./guideRuntime";
import type { GuideNarrationState, GuideTipPayload } from "./guideState";
import { createViewRuntime } from "./viewRuntime";
import type { WorkspaceCheckpointSummary } from "./checkpointTypes";
import type { SetActiveViewStateInput, ViewStateSnapshot } from "./viewState";
import type { WorkspaceSnapshot } from "./workspaceTypes";
import type { AssistantCardPayload } from "../cards/types";

type StepActionResult = {
  ok: boolean;
  data?: Record<string, unknown>;
  error_code?: string;
  message?: string;
} | Promise<{
  ok: boolean;
  data?: Record<string, unknown>;
  error_code?: string;
  message?: string;
}>;
type StepCancelHandler = () => void | Promise<void>;

export interface SessionStepRuntimeContext {
  sessionId: string;
  stepId?: string;
  timeoutMs?: number;
  isCancelled: () => boolean;
  onCancel: (handler: StepCancelHandler) => void;
}

type StepActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;
type StepRuntimeHandlers = Record<string, StepActionHandler>;

interface ActiveStepExecution {
  sessionId: string;
  stepId?: string;
  cancelled: boolean;
  cancelReason?: string;
  cancelHandlers: Set<StepCancelHandler>;
}

export interface SessionStepExecutorDeps {
  setCurrentCard: (card: AssistantCardPayload) => number;
  setActiveTip: (tip: GuideTipPayload | null) => void;
  setNarrationState: (state: GuideNarrationState) => void;
  setActiveViewState: (state: SetActiveViewStateInput) => number;
  getViewStateSnapshot: () => ViewStateSnapshot;
  getWorkspaceSnapshot?: () => WorkspaceSnapshot;
  getCheckpointSummary?: () => WorkspaceCheckpointSummary | null;
  navigateToView: (viewId: string) => Promise<void> | void;
  onStepApplied?: (payload: {
    sessionId: string;
    stepId?: string;
    actionType: string;
    timeoutMs?: number;
  }) => void | Promise<void>;
  onStepFailed?: (payload: {
    sessionId: string;
    stepId?: string;
    actionType: string;
    errorCode?: string;
    message?: string;
  }) => void | Promise<void>;
  onStepCancelled?: (payload: {
    sessionId: string;
    stepId?: string;
    reason?: string;
  }) => void | Promise<void>;
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
  const action = toRecord(raw.action);
  const actionType = String(action.type || "").trim();
  const actionPayload = toRecord(action.payload);
  const timeoutMs = typeof raw.timeout_ms === "number" && Number.isFinite(raw.timeout_ms) ? raw.timeout_ms : undefined;
  return {
    sessionId,
    stepId,
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
  return {
    type: "object",
    properties: {
      session_id: { type: "string" },
      step_id: { type: "string" },
      action: {
        type: "object",
        properties: {
          type: { type: "string" },
          payload: { type: "object" },
        },
        required: ["type"],
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
  const runtimeHandlers: Record<string, StepRuntimeHandlers> = {
    guide: createGuideRuntime(deps),
    view: createViewRuntime(deps),
    app: {},
    flow: {},
  };
  const activeExecutionBySessionId = new Map<string, ActiveStepExecution>();

  const execute: UiCapabilityHandler = async (rawPayload) => {
    const { sessionId, stepId, timeoutMs, actionType, actionPayload } = parseStepPayload(rawPayload);
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
      cancelled: false,
      cancelHandlers: new Set<StepCancelHandler>(),
    };
    activeExecutionBySessionId.set(sessionId, execution);
    const context: SessionStepRuntimeContext = {
      sessionId,
      stepId,
      timeoutMs,
      isCancelled: () => execution.cancelled,
      onCancel: (cancelHandler) => {
        execution.cancelHandlers.add(cancelHandler);
      },
    };
    try {
      const result = await handler(actionPayload, context);
      if (!result.ok) {
        await deps.onStepFailed?.({
          sessionId,
          stepId,
          actionType,
          errorCode: result.error_code,
          message: result.message,
        });
        return result;
      }
      await deps.onStepApplied?.({
        sessionId,
        stepId,
        actionType,
        timeoutMs,
      });
      return {
        ...result,
        data: {
          ...toRecord(result.data),
          session_id: sessionId,
          step_id: stepId,
          action_type: actionType,
          timeout_ms: timeoutMs,
        },
      };
    } finally {
      if (activeExecutionBySessionId.get(sessionId) === execution) {
        activeExecutionBySessionId.delete(sessionId);
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
      reason: activeExecution.cancelReason,
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
