import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../events";
import { createViewOpenCapabilityRegistration } from "../view";
import { BOARD_DEFAULT_RESOURCE } from "../../views/pages/board/boardMain.view";

describe("view.open", () => {
  it("opens a registered view through the top-level capability surface", async () => {
    const setActiveViewState = vi.fn(() => 1);
    const navigateToView = vi.fn();
    const emitRuntimeEvent = vi.fn();
    const registration = createViewOpenCapabilityRegistration({
      setActiveViewState,
      getViewStateSnapshot: vi.fn(() => ({
        active_view_id: "",
        active_anchor: "",
        current_resource: null,
        active_manifest: null,
        view_state_version: 0,
      })),
      getGuideStateSnapshot: vi.fn(() => ({
        current_card: null,
        active_tip: null,
        narration_state: {
          status: "idle" as const,
          text: "",
          updatedAtMs: 0,
        },
        guide_state_version: 1,
      })),
      getTaskProgressSnapshot: vi.fn(() => ({
        status: "idle" as const,
        current_task_id: "",
      })),
      getActiveResourceContextSnapshot: vi.fn(() => null),
      getContinuationSnapshot: vi.fn(() => ({
        pending_wait: null,
      })),
      navigateToView,
      emitRuntimeEvent,
    });

    const result = await registration.handler({
      view_id: "board.main",
      resource: {},
    }, {});

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "applied",
        view_id: "board.main",
        active_anchor: "board.canvas",
        route_path: "/views/board/main",
        resource_type: "board.workspace",
        resource_id: BOARD_DEFAULT_RESOURCE.resource_id,
      }),
    });
    expect(setActiveViewState).toHaveBeenCalledWith(expect.objectContaining({
      viewId: "board.main",
      activeAnchor: "board.canvas",
      resource: expect.objectContaining({
        resource_type: "board.workspace",
        resource_id: BOARD_DEFAULT_RESOURCE.resource_id,
      }),
      manifest: expect.objectContaining({
        view_id: "board.main",
      }),
    }));
    expect(navigateToView).toHaveBeenCalledWith("board.main");
    expect(emitRuntimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.VIEW_STATE_APPLIED,
      payload: expect.objectContaining({
        trigger: "view.open",
        view_id: "board.main",
      }),
      session_id: "",
      step_id: undefined,
    }));
  });
});
