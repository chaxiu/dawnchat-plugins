import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../events";
import { useGuideState } from "../guide/state";
import { emitAssistantRuntimeEvent } from "../runtimeEventBridge";
import { listViewRegistrations, useViewState } from "../view";
import {
  installAssistantRuntimeCapabilities,
  uninstallAssistantRuntimeCapabilities,
} from "../bootstrap";

describe("runtime bootstrap wiring", () => {
  const originalRegister = window.__DAWNCHAT_UI_REGISTER_CAPABILITY__;
  const originalUnregister = window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__;

  afterEach(() => {
    window.__DAWNCHAT_UI_REGISTER_CAPABILITY__ = originalRegister;
    window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__ = originalUnregister;
  });

  it("registers key capabilities and uninstalls cleanly", () => {
    const registered = new Set<string>();
    const unregistered = new Set<string>();
    window.__DAWNCHAT_UI_REGISTER_CAPABILITY__ = (definition) => {
      registered.add(definition.name);
      return true;
    };
    window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__ = (name) => {
      unregistered.add(name);
      return true;
    };

    const names = installAssistantRuntimeCapabilities();
    expect(listViewRegistrations().map((registration) => registration.view_id)).toEqual(
      expect.arrayContaining(["word.main", "tictactoe.main", "board.main"])
    );
    expect(names).toEqual(expect.arrayContaining([
      "assistant.session_step_execute",
      "assistant.session_step_cancel",
      "assistant.runtime.bootstrap",
      "view.open",
      "assistant.view.list",
      "assistant.view.describe",
      "assistant.view.contract",
    ]));
    expect(registered.size).toBe(names.length);
    expect(emitAssistantRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
      source: "guide",
      payload: { quiz_id: "quiz-1" },
    })).toBe(true);

    const guideState = useGuideState();
    guideState.setCurrentCard({
      card_type: "word",
      title: "pending card",
      data: { message: "pending" },
    });
    guideState.setActiveTip({
      message: "pending tip",
      level: "info",
    });
    guideState.setNarrationState({
      status: "playing",
      text: "pending narration",
      updatedAtMs: 10,
    });
    const viewState = useViewState();
    viewState.restoreViewState({
      active_view_id: "word.main",
      active_anchor: "word.header",
      current_resource: {
        resource_type: "word",
        resource_id: "word:pending",
        title: "pending resource",
        data: { word: "pending" },
      },
      active_manifest: null,
      view_state_version: 5,
    });

    uninstallAssistantRuntimeCapabilities(names);
    expect(Array.from(unregistered)).toEqual(expect.arrayContaining(names));
    expect(emitAssistantRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
      source: "guide",
      payload: { quiz_id: "quiz-2" },
    })).toBe(false);
    expect(guideState.getGuideStateSnapshot()).toEqual(expect.objectContaining({
      current_card: null,
      active_tip: null,
      narration_state: expect.objectContaining({
        status: "idle",
        text: "",
      }),
    }));
    expect(viewState.getViewStateSnapshot()).toEqual(expect.objectContaining({
      active_view_id: "",
      active_anchor: "",
      current_resource: null,
      active_manifest: null,
    }));
  });

  it("starts from clean in-memory state after reinstall", () => {
    window.__DAWNCHAT_UI_REGISTER_CAPABILITY__ = () => true;
    window.__DAWNCHAT_UI_UNREGISTER_CAPABILITY__ = () => true;

    const guideState = useGuideState();
    const viewState = useViewState();

    const firstNames = installAssistantRuntimeCapabilities();
    guideState.setCurrentCard({
      card_type: "word",
      title: "stale card",
      data: { message: "stale" },
    });
    guideState.setNarrationState({
      status: "failed",
      text: "stale narration",
      updatedAtMs: 1,
      errorMessage: "stale",
    });
    viewState.restoreViewState({
      active_view_id: "word.main",
      active_anchor: "word.meaning",
      current_resource: {
        resource_type: "word",
        resource_id: "word:stale",
        title: "stale resource",
        data: { word: "stale" },
      },
      active_manifest: null,
      view_state_version: 1,
    });
    uninstallAssistantRuntimeCapabilities(firstNames);

    const secondNames = installAssistantRuntimeCapabilities();
    expect(guideState.getGuideStateSnapshot()).toEqual(expect.objectContaining({
      current_card: null,
      active_tip: null,
      narration_state: expect.objectContaining({
        status: "idle",
        text: "",
      }),
    }));
    expect(viewState.getViewStateSnapshot()).toEqual(expect.objectContaining({
      active_view_id: "",
      active_anchor: "",
      current_resource: null,
      active_manifest: null,
    }));
    expect(emitAssistantRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.GUIDE_QUIZ_SUBMITTED,
      source: "guide",
      payload: { quiz_id: "quiz-reinstall" },
    })).toBe(true);

    uninstallAssistantRuntimeCapabilities(secondNames);
  });
});
