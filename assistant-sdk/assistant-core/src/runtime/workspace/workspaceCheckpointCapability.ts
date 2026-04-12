import type { UiCapabilityHandler, UiCapabilityRegistration } from "../capabilities";
import type { WorkspacePersistenceRuntime } from "./workspaceRuntime";

function buildCheckpointSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {},
  };
}

export function createWorkspaceCheckpointCapabilityRegistration(
  workspaceRuntime: WorkspacePersistenceRuntime
): UiCapabilityRegistration {
  const handler: UiCapabilityHandler = async () => {
    await workspaceRuntime.checkpointFromCurrentView();
    return {
      ok: true,
      data: {
        status: "checkpointed",
      },
    };
  };

  return {
    definition: {
      name: "assistant.workspace_checkpoint",
      description: "Append a manual_checkpoint snapshot for the active workspace (stateful view).",
      input_schema: buildCheckpointSchema(),
    },
    handler,
  };
}
