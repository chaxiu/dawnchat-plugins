import type { UiCapabilityHandler, UiCapabilityRegistration } from "../capabilities";
import type { WorkspacePersistenceRuntime } from "./workspaceRuntime";

class WorkspaceContractError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "WorkspaceContractError";
  }
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.trunc(value);
}

function toSuccess(data: Record<string, unknown>) {
  return {
    ok: true,
    data,
  };
}

function toFailure(error: unknown) {
  if (error instanceof WorkspaceContractError) {
    return {
      ok: false,
      error_code: error.errorCode,
      message: error.message,
    };
  }
  return {
    ok: false,
    error_code: "workspace_runtime_error",
    message: error instanceof Error ? error.message : String(error),
  };
}

function requireSurfaceAndWorkspace(payload: Record<string, unknown>) {
  const surfaceId = normalizeString(payload.surface_id);
  const workspaceId = normalizeString(payload.workspace_id);
  if (!surfaceId || !workspaceId) {
    throw new WorkspaceContractError(
      "invalid_workspace_payload",
      "surface_id and workspace_id are required"
    );
  }
  return { surfaceId, workspaceId };
}

export function createWorkspaceCapabilityRegistrations(
  workspaceRuntime: WorkspacePersistenceRuntime
): UiCapabilityRegistration[] {
  return [
    {
      definition: {
        name: "assistant.workspace.list",
        description: "List workspaces for one surface.",
        input_schema: {
          type: "object",
          properties: {
            surface_id: { type: "string", minLength: 1 },
            limit: { type: "number", minimum: 1, maximum: 100 },
          },
          required: ["surface_id"],
        },
      },
      handler: async (payload) => {
        try {
          const surfaceId = normalizeString(payload.surface_id);
          if (!surfaceId) {
            throw new WorkspaceContractError("invalid_workspace_payload", "surface_id is required");
          }
          let workspaces = await workspaceRuntime.listWorkspaces(surfaceId);
          const limit = normalizePositiveInteger(payload.limit);
          if (limit) {
            workspaces = workspaces.slice(0, limit);
          }
          return toSuccess({ workspaces });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.workspace.describe",
        description: "Describe one workspace by id.",
        input_schema: {
          type: "object",
          properties: {
            workspace_id: { type: "string", minLength: 1 },
          },
          required: ["workspace_id"],
        },
      },
      handler: async (payload) => {
        try {
          const workspaceId = normalizeString(payload.workspace_id);
          if (!workspaceId) {
            throw new WorkspaceContractError(
              "invalid_workspace_payload",
              "workspace_id is required"
            );
          }
          const workspace = await workspaceRuntime.describeWorkspace(workspaceId);
          if (!workspace) {
            throw new WorkspaceContractError("workspace_not_found", `Workspace not found: ${workspaceId}`);
          }
          return toSuccess({
            workspace: {
              workspace_id: workspace.workspace_id,
              surface_id: workspace.surface_id,
              title: workspace.title,
              created_at_ms: workspace.created_at_ms,
              updated_at_ms: workspace.updated_at_ms,
              view_id: workspace.view_id,
            },
          });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.workspace.get_current",
        description: "Get the current active workspace context for the active stateful surface.",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      handler: async () => {
        try {
          const workspace = await workspaceRuntime.getCurrentWorkspace();
          return toSuccess({ workspace });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.workspace.list_history",
        description: "List recent snapshots for one workspace.",
        input_schema: {
          type: "object",
          properties: {
            workspace_id: { type: "string", minLength: 1 },
            limit: { type: "number", minimum: 1, maximum: 100 },
          },
          required: ["workspace_id"],
        },
      },
      handler: async (payload) => {
        try {
          const workspaceId = normalizeString(payload.workspace_id);
          if (!workspaceId) {
            throw new WorkspaceContractError(
              "invalid_workspace_payload",
              "workspace_id is required"
            );
          }
          const snapshots = await workspaceRuntime.listWorkspaceHistory(workspaceId, {
            limit: normalizePositiveInteger(payload.limit),
          });
          return toSuccess({ snapshots });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.workspace.create",
        description: "Create a new workspace for one surface without navigating to it.",
        input_schema: {
          type: "object",
          properties: {
            surface_id: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
          },
          required: ["surface_id"],
        },
      },
      handler: async (payload) => {
        try {
          const surfaceId = normalizeString(payload.surface_id);
          if (!surfaceId) {
            throw new WorkspaceContractError("invalid_workspace_payload", "surface_id is required");
          }
          const workspace = await workspaceRuntime.createWorkspace(surfaceId, {
            title: normalizeString(payload.title) || undefined,
          });
          if (!workspace) {
            throw new WorkspaceContractError(
              "workspace_create_failed",
              `Failed to create workspace for surface: ${surfaceId}`
            );
          }
          return toSuccess({ workspace });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.workspace.open",
        description: "Open one workspace by restoring its current head into the target surface.",
        input_schema: {
          type: "object",
          properties: {
            surface_id: { type: "string", minLength: 1 },
            workspace_id: { type: "string", minLength: 1 },
          },
          required: ["surface_id", "workspace_id"],
        },
      },
      handler: async (payload) => {
        try {
          const { surfaceId, workspaceId } = requireSurfaceAndWorkspace(payload);
          await workspaceRuntime.openWorkspace(surfaceId, workspaceId);
          return toSuccess({
            surface_id: surfaceId,
            workspace_id: workspaceId,
            status: "opened",
          });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.workspace.rename",
        description: "Rename one workspace.",
        input_schema: {
          type: "object",
          properties: {
            workspace_id: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
          },
          required: ["workspace_id", "title"],
        },
      },
      handler: async (payload) => {
        try {
          const workspaceId = normalizeString(payload.workspace_id);
          const title = normalizeString(payload.title);
          if (!workspaceId || !title) {
            throw new WorkspaceContractError(
              "invalid_workspace_payload",
              "workspace_id and title are required"
            );
          }
          const workspace = await workspaceRuntime.renameWorkspace(workspaceId, title);
          if (!workspace) {
            throw new WorkspaceContractError("workspace_not_found", `Workspace not found: ${workspaceId}`);
          }
          return toSuccess({
            workspace_id: workspace.workspace_id,
            title: workspace.title,
            status: "updated",
          });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.workspace.checkpoint",
        description: "Append a manual checkpoint snapshot for the current active workspace.",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      handler: async () => {
        try {
          await workspaceRuntime.checkpointFromCurrentView();
          return toSuccess({ status: "checkpointed" });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
    {
      definition: {
        name: "assistant.workspace.checkout_snapshot",
        description: "Restore one snapshot sequence into the current workspace head and reopen it.",
        input_schema: {
          type: "object",
          properties: {
            workspace_id: { type: "string", minLength: 1 },
            snapshot_seq: { type: "number", minimum: 1 },
          },
          required: ["workspace_id", "snapshot_seq"],
        },
      },
      handler: async (payload) => {
        try {
          const workspaceId = normalizeString(payload.workspace_id);
          const snapshotSeq = normalizePositiveInteger(payload.snapshot_seq);
          if (!workspaceId || !snapshotSeq) {
            throw new WorkspaceContractError(
              "invalid_workspace_payload",
              "workspace_id and snapshot_seq are required"
            );
          }
          const opened = await workspaceRuntime.checkoutSnapshot(workspaceId, snapshotSeq);
          if (!opened) {
            throw new WorkspaceContractError(
              "workspace_snapshot_not_found",
              `Snapshot not found: ${workspaceId}#${snapshotSeq}`
            );
          }
          return toSuccess({
            workspace_id: workspaceId,
            snapshot_seq: snapshotSeq,
            status: "opened",
          });
        } catch (error) {
          return toFailure(error);
        }
      },
    },
  ];
}
