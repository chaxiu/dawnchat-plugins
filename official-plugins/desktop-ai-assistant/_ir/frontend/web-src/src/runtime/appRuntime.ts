import type { SessionStepRuntimeContext, StepActionResult } from "./contracts/sessionStep";
import { ASSISTANT_RUNTIME_EVENT_TYPES, type AssistantRuntimeEventInput } from "./events";
import type { WorkspaceArtifact, WorkspaceTaskProgress } from "./workspace";

type AppActionHandler = (
  payload: Record<string, unknown>,
  context: SessionStepRuntimeContext
) => StepActionResult;

export interface AppRuntimeDeps {
  setTaskProgress?: (progress: WorkspaceTaskProgress) => void;
  upsertArtifact?: (artifact: WorkspaceArtifact) => WorkspaceArtifact;
  removeArtifact?: (artifactId: string) => boolean;
  emitRuntimeEvent?: (input: AssistantRuntimeEventInput) => void;
}

export type AppRuntimeHandlers = Record<string, AppActionHandler>;

const TASK_PROGRESS_STATUSES: WorkspaceTaskProgress["status"][] = [
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

function toArtifact(raw: unknown): WorkspaceArtifact | null {
  const input = toRecord(raw);
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const kind = typeof input.kind === "string" ? input.kind.trim() : "";
  if (!id || !kind) {
    return null;
  }
  return {
    id,
    kind,
    title: typeof input.title === "string" ? input.title.trim() : undefined,
    resource_type: typeof input.resource_type === "string" ? input.resource_type.trim() : undefined,
    resource_id: typeof input.resource_id === "string" ? input.resource_id.trim() : undefined,
    view_id: typeof input.view_id === "string" ? input.view_id.trim() : undefined,
    data: Object.keys(toRecord(input.data)).length > 0 ? toRecord(input.data) : undefined,
  };
}

export function createAppRuntime(deps: AppRuntimeDeps): AppRuntimeHandlers {
  return {
    "task.progress.set": async (payload, context) => {
      if (!deps.setTaskProgress) {
        return {
          ok: false,
          error_code: "workspace_unavailable",
          message: "app.task.progress.set requires workspace task progress support in current workspace context",
        };
      }
      const input = toRecord(payload);
      const status = typeof input.status === "string" ? input.status.trim() : "";
      if (!TASK_PROGRESS_STATUSES.includes(status as WorkspaceTaskProgress["status"])) {
        return {
          ok: false,
          error_code: "invalid_app_payload",
          message: "app.task.progress.set requires payload.status",
        };
      }
      const nextProgress: WorkspaceTaskProgress = {
        status: status as WorkspaceTaskProgress["status"],
        current_task_id: typeof input.current_task_id === "string" ? input.current_task_id.trim() : context.sessionId,
        completed_steps: typeof input.completed_steps === "number" ? input.completed_steps : undefined,
        total_steps: typeof input.total_steps === "number" ? input.total_steps : undefined,
        summary: typeof input.summary === "string" ? input.summary.trim() : undefined,
      };
      deps.setTaskProgress(nextProgress);
      deps.emitRuntimeEvent?.({
        type: ASSISTANT_RUNTIME_EVENT_TYPES.WORKSPACE_TASK_PROGRESS_UPDATED,
        source: "workspace",
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
          // Assistant-facing workspace metadata, not page durable truth.
          scope: "workspace",
          task_progress: nextProgress,
        },
      };
    },
    "artifact.upsert": async (payload, context) => {
      if (!deps.upsertArtifact) {
        return {
          ok: false,
          error_code: "workspace_unavailable",
          message: "app.artifact.upsert requires workspace artifact support in active context",
        };
      }
      const artifact = toArtifact(payload.artifact);
      if (!artifact) {
        return {
          ok: false,
          error_code: "invalid_app_payload",
          message: "app.artifact.upsert requires payload.artifact with id and kind",
        };
      }
      const normalizedArtifact = deps.upsertArtifact(artifact);
      deps.emitRuntimeEvent?.({
        type: ASSISTANT_RUNTIME_EVENT_TYPES.WORKSPACE_ARTIFACT_UPSERTED,
        source: "workspace",
        session_id: context.sessionId,
        step_id: context.stepId,
        payload: {
          artifact_id: normalizedArtifact.id,
          artifact_kind: normalizedArtifact.kind,
          resource_type: normalizedArtifact.resource_type,
          resource_id: normalizedArtifact.resource_id,
          view_id: normalizedArtifact.view_id,
        },
      });
      return {
        ok: true,
        data: {
          status: "applied",
          scope: "active_context",
          artifact: normalizedArtifact,
        },
      };
    },
    "artifact.remove": async (payload, context) => {
      if (!deps.removeArtifact) {
        return {
          ok: false,
          error_code: "workspace_unavailable",
          message: "app.artifact.remove requires workspace artifact support in active context",
        };
      }
      const input = toRecord(payload);
      const artifactId = typeof input.artifact_id === "string" ? input.artifact_id.trim() : "";
      if (!artifactId) {
        return {
          ok: false,
          error_code: "invalid_app_payload",
          message: "app.artifact.remove requires payload.artifact_id",
        };
      }
      const removed = deps.removeArtifact(artifactId);
      if (!removed) {
        return {
          ok: false,
          error_code: "artifact_not_found",
          message: `Artifact not found: ${artifactId}`,
        };
      }
      deps.emitRuntimeEvent?.({
        type: ASSISTANT_RUNTIME_EVENT_TYPES.WORKSPACE_ARTIFACT_REMOVED,
        source: "workspace",
        session_id: context.sessionId,
        step_id: context.stepId,
        payload: {
          artifact_id: artifactId,
        },
      });
      return {
        ok: true,
        data: {
          status: "applied",
          scope: "active_context",
          artifact_id: artifactId,
          removed: true,
        },
      };
    },
  };
}
