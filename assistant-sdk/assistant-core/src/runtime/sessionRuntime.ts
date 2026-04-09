import type { SessionStepRuntimeContext, StepActionResult } from "./contracts/sessionStep";
import { ASSISTANT_RUNTIME_EVENT_TYPES, type AssistantRuntimeEventInput } from "./events";
import type { SessionTaskProgress } from "./observation";

type SessionActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;

export interface SessionRuntimeDeps {
  setTaskProgress?: (progress: SessionTaskProgress) => void;
  emitRuntimeEvent?: (input: AssistantRuntimeEventInput) => void;
}

export type SessionRuntimeHandlers = Record<string, SessionActionHandler>;

const TASK_PROGRESS_STATUSES: SessionTaskProgress["status"][] = [
  "idle",
  "running",
  "paused",
  "completed",
  "failed",
];

function toRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

export function createSessionRuntime(deps: SessionRuntimeDeps): SessionRuntimeHandlers {
  return {
    "task.progress.set": async (payload, context) => {
      if (!deps.setTaskProgress) {
        return {
          ok: false,
          error_code: "session_observation_unavailable",
          message: "session.task.progress.set requires session task progress support in current runtime context",
        };
      }
      const input = toRecord(payload);
      const status = typeof input.status === "string" ? input.status.trim() : "";
      if (!TASK_PROGRESS_STATUSES.includes(status as SessionTaskProgress["status"])) {
        return {
          ok: false,
          error_code: "invalid_session_payload",
          message: "session.task.progress.set requires payload.status",
        };
      }
      const nextProgress: SessionTaskProgress = {
        status: status as SessionTaskProgress["status"],
        current_task_id: typeof input.current_task_id === "string" ? input.current_task_id.trim() : context.sessionId,
        completed_steps: typeof input.completed_steps === "number" ? input.completed_steps : undefined,
        total_steps: typeof input.total_steps === "number" ? input.total_steps : undefined,
        summary: typeof input.summary === "string" ? input.summary.trim() : undefined,
      };
      deps.setTaskProgress(nextProgress);
      deps.emitRuntimeEvent?.({
        type: ASSISTANT_RUNTIME_EVENT_TYPES.SESSION_TASK_PROGRESS_UPDATED,
        source: "session",
        session_id: context.sessionId,
        step_id: context.stepId,
        payload: {
          status: nextProgress.status,
          current_task_id: nextProgress.current_task_id,
          completed_steps: nextProgress.completed_steps,
          total_steps: nextProgress.total_steps,
          summary: nextProgress.summary,
        },
      });
      return {
        ok: true,
        data: {
          status: "applied",
          scope: "session",
          task_progress: nextProgress,
        },
      };
    },
  };
}
