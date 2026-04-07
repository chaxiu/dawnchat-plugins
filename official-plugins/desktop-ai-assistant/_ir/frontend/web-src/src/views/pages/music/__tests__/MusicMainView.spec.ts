import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import { createManifestSnapshot } from "../../../../runtime/view";
import { useViewState } from "../../../../runtime/view/state";
import MusicMainView from "../MusicMainView.vue";
import {
  cloneMusicResource,
  musicMainView,
  MUSIC_DEFAULT_RESOURCE,
} from "../musicMain.view";

const {
  emitAssistantRuntimeEvent,
  subscribeMock,
  ensureRunningMock,
  playNoteMock,
  stopAllMock,
  snapshotState,
} = vi.hoisted(() => {
  const snapshot = { state: "suspended", activeNotes: [] as string[] };
  return {
    emitAssistantRuntimeEvent: vi.fn(() => true),
    subscribeMock: vi.fn((listener: (snapshot: { state: "running" | "suspended" | "closed" | "uninitialized"; activeNotes: string[] }) => void) => {
      listener(snapshot as { state: "running" | "suspended" | "closed" | "uninitialized"; activeNotes: string[] });
      return () => {};
    }),
    ensureRunningMock: vi.fn(async () => ({ state: "running", activeNotes: [] })),
    playNoteMock: vi.fn(async () => ({ ok: true, normalizedNote: "C4" })),
    stopAllMock: vi.fn(),
    snapshotState: snapshot,
  };
});

vi.mock("../../../../runtime/runtimeEventBridge", () => ({
  emitAssistantRuntimeEvent,
}));

vi.mock("../audio/pianoEngine", () => ({
  getPianoEngine: () => ({
    subscribe: subscribeMock,
    ensureRunning: ensureRunningMock,
    playNote: playNoteMock,
    stopAll: stopAllMock,
    unlockWithGesture: vi.fn(async () => true),
    getSnapshot: () => ({
      state: snapshotState.state,
      activeNotes: snapshotState.activeNotes,
    }),
  }),
}));

function activateView(resource = cloneMusicResource(MUSIC_DEFAULT_RESOURCE)) {
  useViewState().setActiveViewState({
    viewId: "music.main",
    activeAnchor: "music.keyboard",
    resource,
    manifest: createManifestSnapshot(musicMainView, resource, "music.keyboard"),
  });
}

describe("MusicMainView", () => {
  afterEach(() => {
    emitAssistantRuntimeEvent.mockClear();
    subscribeMock.mockClear();
    ensureRunningMock.mockClear();
    playNoteMock.mockClear();
    stopAllMock.mockClear();
    snapshotState.state = "suspended";
    snapshotState.activeNotes = [];
    useViewState().clearViewState();
  });

  it("renders unlock overlay when audio context needs user gesture", () => {
    activateView();
    const wrapper = mount(MusicMainView);
    expect(wrapper.text()).toContain("Tap to enable piano audio");
  });

  it("plays note from key click and emits key_pressed event", async () => {
    snapshotState.state = "running";
    const resource = cloneMusicResource(MUSIC_DEFAULT_RESOURCE);
    (resource.data.audio as Record<string, unknown>).audio_context_state = "running";
    (resource.data.audio as Record<string, unknown>).requires_user_gesture = false;
    activateView(resource);
    const wrapper = mount(MusicMainView);

    await wrapper.find(".piano-key.white-key").trigger("click");

    expect(emitAssistantRuntimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "assistant.music.key_pressed",
      payload: expect.objectContaining({
        note: expect.any(String),
        source: "user",
      }),
    }));
  });

  it("shows lesson target highlight and emits lesson matched event on correct key", async () => {
    snapshotState.state = "running";
    const resource = cloneMusicResource(MUSIC_DEFAULT_RESOURCE);
    (resource.data.audio as Record<string, unknown>).audio_context_state = "running";
    (resource.data.audio as Record<string, unknown>).requires_user_gesture = false;
    (resource.data.lesson as Record<string, unknown>).highlighted_note = "C3";
    (resource.data.lesson as Record<string, unknown>).waiting_for_match = true;
    (resource.data.lesson as Record<string, unknown>).prompt_text = "请先弹 C3";
    activateView(resource);
    const wrapper = mount(MusicMainView);

    expect(wrapper.text()).toContain("请先弹 C3");
    expect(wrapper.find(".lesson-overlay .lesson-halo-marker[data-note='C3']").exists()).toBe(true);

    await wrapper.find('.piano-key[data-note="C3"]').trigger("click");
    await Promise.resolve();
    await nextTick();

    expect(emitAssistantRuntimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "assistant.music.lesson_note_matched",
      payload: expect.objectContaining({
        note: "C3",
        expected_note: "C3",
        source: "user",
      }),
    }));
    expect(useViewState().currentResource.value?.data).toEqual(expect.objectContaining({
      lesson: expect.objectContaining({
        highlighted_note: "",
        waiting_for_match: false,
        prompt_text: "",
        last_matched_note: "C3",
      }),
    }));
  });

  it("keeps the latest lesson target when an older play result resolves later", async () => {
    snapshotState.state = "running";
    let resolvePlay: (() => void) | undefined;
    playNoteMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePlay = () => resolve({ ok: true, normalizedNote: "C3" });
    }));

    const resource = cloneMusicResource(MUSIC_DEFAULT_RESOURCE);
    (resource.data.audio as Record<string, unknown>).audio_context_state = "running";
    (resource.data.audio as Record<string, unknown>).requires_user_gesture = false;
    (resource.data.lesson as Record<string, unknown>).highlighted_note = "C3";
    (resource.data.lesson as Record<string, unknown>).waiting_for_match = true;
    (resource.data.lesson as Record<string, unknown>).prompt_text = "请先弹 C3";
    activateView(resource);
    const wrapper = mount(MusicMainView);

    const clickPromise = wrapper.find('.piano-key[data-note="C3"]').trigger("click");
    await Promise.resolve();

    const nextResource = cloneMusicResource(useViewState().currentResource.value!);
    (nextResource.data.lesson as Record<string, unknown>).highlighted_note = "D4";
    (nextResource.data.lesson as Record<string, unknown>).waiting_for_match = true;
    (nextResource.data.lesson as Record<string, unknown>).prompt_text = "请先弹 D4";
    activateView(nextResource);
    await nextTick();

    if (resolvePlay) {
      resolvePlay();
    }
    await clickPromise;
    await nextTick();

    expect(useViewState().currentResource.value?.data).toEqual(expect.objectContaining({
      lesson: expect.objectContaining({
        highlighted_note: "D4",
        waiting_for_match: true,
        prompt_text: "请先弹 D4",
      }),
    }));
  });
});

