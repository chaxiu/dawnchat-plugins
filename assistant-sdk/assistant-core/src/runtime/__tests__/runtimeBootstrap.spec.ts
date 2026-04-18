import { createRuntimeBootstrapCapabilityRegistration } from "../view";

describe("assistant.runtime.bootstrap", () => {
  it("returns only global runtime guidance and startup contracts", async () => {
    const registration = createRuntimeBootstrapCapabilityRegistration({
      setActiveViewState: vi.fn(() => 1),
      getViewStateSnapshot: vi.fn(() => ({
        active_view_id: "board.main",
        active_anchor: "board.canvas",
        current_state_binding: null,
        active_manifest: null,
        view_state_version: 1,
      })),
      navigateToView: vi.fn(),
    });

    const result = await registration.handler({}, {});

    expect(result).toEqual({
      ok: true,
      data: {
        active_view_id: "board.main",
        bootstrap: expect.objectContaining({
          startup_sequence: [
            "dawnchat.ui.capability.invoke(function=assistant.runtime.bootstrap)",
            "dawnchat.ui.capability.invoke(function=assistant.view.list)",
            "dawnchat.ui.capability.invoke(function=view.open)",
            "dawnchat.ui.capability.invoke(function=assistant.view.describe)",
          ],
          global_rules: expect.objectContaining({
            entry_rule: expect.any(String),
            session_rule: expect.any(String),
            wait_rule: expect.any(String),
          }),
          tools: expect.objectContaining({
            bootstrap: expect.objectContaining({
              function: "assistant.runtime.bootstrap",
            }),
            list_views: expect.objectContaining({
              function: "assistant.view.list",
            }),
            view_contract: expect.objectContaining({
              function: "assistant.view.contract",
            }),
            workspace_get_current: expect.objectContaining({
              function: "assistant.workspace.get_current",
            }),
            workspace_open: expect.objectContaining({
              function: "assistant.workspace.open",
            }),
            checkpoint_workspace: expect.objectContaining({
              function: "assistant.workspace.checkpoint",
            }),
          }),
        }),
      },
    });
    const payload = result.data as Record<string, unknown>;
    const bootstrap = payload.bootstrap as Record<string, unknown>;
    expect(bootstrap).not.toHaveProperty("view_definition");
    expect(bootstrap).not.toHaveProperty("examples");
  });
});
