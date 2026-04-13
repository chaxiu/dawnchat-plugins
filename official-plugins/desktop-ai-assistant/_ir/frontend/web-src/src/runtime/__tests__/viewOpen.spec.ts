import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../events";
import { createViewOpenCapabilityRegistration } from "../view";

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
        current_state_binding: null,
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
      getActiveStateBindingContextSnapshot: vi.fn(() => null),
      getContinuationSnapshot: vi.fn(() => ({
        pending_wait: null,
      })),
      navigateToView,
      emitRuntimeEvent,
    });

    const result = await registration.handler({
      view_id: "word.main",
      state_binding: {
        binding_type: "word",
        data: {
          word: "Evolution",
          meaning: "逐步演化",
          etymology: ["e- + volvere"],
        },
      },
    }, {});

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "applied",
        view_id: "word.main",
        active_anchor: "word.header",
        route_path: "/views/word/main",
        binding_type: "word",
        binding_label: "word:evolution",
      }),
    });
    expect(setActiveViewState).toHaveBeenCalledWith(expect.objectContaining({
      viewId: "word.main",
      activeAnchor: "word.header",
      state_binding: expect.objectContaining({
        binding_type: "word",
        binding_label: "word:evolution",
      }),
      manifest: expect.objectContaining({
        view_id: "word.main",
      }),
    }));
    expect(navigateToView).toHaveBeenCalledWith("word.main");
    expect(emitRuntimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.VIEW_STATE_APPLIED,
      payload: expect.objectContaining({
        trigger: "view.open",
        view_id: "word.main",
      }),
      session_id: "",
      step_id: undefined,
    }));
  });
});
