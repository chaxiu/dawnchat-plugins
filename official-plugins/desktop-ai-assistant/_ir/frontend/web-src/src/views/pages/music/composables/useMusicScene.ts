import { computed, onBeforeUnmount, ref } from "vue";

import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../../../runtime/events";
import { emitAssistantRuntimeEvent } from "../../../../runtime/runtimeEventBridge";
import { useViewState } from "../../../../runtime/view/state";
import type { ViewCapabilityResult, ViewStateBinding } from "../../../../runtime/view/manifest";
import { getPianoEngine } from "../audio/pianoEngine";
import { mutateLessonMatched, mutateTransportState } from "../capabilities/mutations";
import { cloneMusicResource, readMusicResourceData } from "../model/resource";
import { buildMusicMainStateSummary } from "../model/summary";
import { buildPianoKeyboardLayout } from "../model/keyboardLayout";
import { logger } from "../../../../utils/logger";

export function useMusicScene() {
  const { activeViewId, activeAnchor, activeManifest, currentStateBinding, setActiveViewState } = useViewState();
  const isMutating = ref(false);
  const isAudioUnlocking = ref(false);
  const capabilityError = ref("");
  const transientActiveNotes = ref<string[]>([]);
  const transientTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const isMusicActive = computed(() => activeViewId.value === "music.main");
  const musicData = computed(() => {
    if (!currentStateBinding.value) {
      return null;
    }
    return readMusicResourceData(currentStateBinding.value);
  });
  const activeNotes = computed(() => musicData.value?.playback.active_notes || []);
  const visualActiveNotes = computed(() => {
    const set = new Set<string>([...activeNotes.value, ...transientActiveNotes.value]);
    return Array.from(set);
  });
  const supportedNotes = computed(() => musicData.value?.keyboard.supported_notes || []);
  const keyboardLayout = computed(() => buildPianoKeyboardLayout(supportedNotes.value));
  const requiresAudioUnlock = computed(() => Boolean(musicData.value?.audio.requires_user_gesture));

  function markTransientActive(note: string, durationMs = 180) {
    if (!transientActiveNotes.value.includes(note)) {
      transientActiveNotes.value = [...transientActiveNotes.value, note];
    }
    const timer = transientTimers.get(note);
    if (timer) {
      clearTimeout(timer);
    }
    const nextTimer = setTimeout(() => {
      transientActiveNotes.value = transientActiveNotes.value.filter((item) => item !== note);
      transientTimers.delete(note);
    }, Math.max(80, durationMs));
    transientTimers.set(note, nextTimer);
  }

  function applyNextResource(nextResource: ViewStateBinding, nextAnchor?: string) {
    if (!activeManifest.value) {
      return;
    }
    const anchor = nextAnchor || activeAnchor.value || "music.keyboard";
    setActiveViewState({
      viewId: "music.main",
      activeAnchor: anchor,
      state_binding: nextResource,
      manifest: {
        ...activeManifest.value,
        state_summary: buildMusicMainStateSummary(nextResource, anchor),
      },
    });
  }

  function shouldPreserveLiveLessonState(capabilityId: string): boolean {
    return capabilityId === "music.play_note"
      || capabilityId === "music.play_phrase"
      || capabilityId === "music.stop_all"
      || capabilityId === "music.get_transport_state";
  }

  function mergeLessonStateFromLiveResource(state_binding: ViewStateBinding): ViewStateBinding {
    const liveResource = currentStateBinding.value;
    if (!liveResource || liveResource.binding_type !== state_binding.binding_type) {
      return state_binding;
    }
    const nextResource = cloneMusicResource(state_binding);
    const nextMusic = readMusicResourceData(nextResource);
    const liveMusic = readMusicResourceData(liveResource);
    nextMusic.lesson = {
      highlighted_note: liveMusic.lesson.highlighted_note,
      waiting_for_match: liveMusic.lesson.waiting_for_match,
      prompt_text: liveMusic.lesson.prompt_text,
      last_matched_note: liveMusic.lesson.last_matched_note,
    };
    return nextResource;
  }

  function applyCapabilityResult(
    capabilityId: string,
    result: ViewCapabilityResult,
    fallbackResource: ViewStateBinding
  ): ViewCapabilityResult {
    if ("ok" in result && result.ok === false) {
      const rawNextFromError = result.data?.state_binding as ViewStateBinding | undefined;
      const nextFromError = rawNextFromError && shouldPreserveLiveLessonState(capabilityId)
        ? mergeLessonStateFromLiveResource(rawNextFromError)
        : rawNextFromError;
      if (nextFromError && nextFromError.binding_type === fallbackResource.binding_type) {
        applyNextResource(nextFromError, "music.header");
      }
      return result;
    }
    const rawNextResource = result.state_binding || fallbackResource;
    const nextResource = shouldPreserveLiveLessonState(capabilityId)
      ? mergeLessonStateFromLiveResource(rawNextResource)
      : rawNextResource;
    applyNextResource(nextResource, result.activeAnchor || "music.keyboard");
    return result;
  }

  async function runCapability(
    capabilityId: string,
    input: Record<string, unknown>,
    baseResourceOverride?: ViewStateBinding
  ) {
    if ((!currentStateBinding.value && !baseResourceOverride) || isMutating.value) {
      return;
    }
    capabilityError.value = "";
    isMutating.value = true;
    try {
      const baseResource = baseResourceOverride || currentStateBinding.value;
      if (!baseResource) {
        return;
      }
      const { invokeMusicMainCapability } = await import("../capabilities");
      const result = await invokeMusicMainCapability(capabilityId, input, baseResource);
      const applied = applyCapabilityResult(capabilityId, result, baseResource);
      if ("ok" in applied && applied.ok === false) {
        capabilityError.value = applied.message;
      }
    } finally {
      isMutating.value = false;
    }
  }

  async function playNoteFromUser(note: string) {
    if (!currentStateBinding.value) {
      return;
    }
    const lessonTargetNote = musicData.value?.lesson.highlighted_note || "";
    logger.info("music_user_key_pressed", {
      note,
      lesson_target_note: lessonTargetNote,
      active_anchor: activeAnchor.value || "",
      binding_label: currentStateBinding.value.binding_label || "",
    });
    emitAssistantRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.MUSIC_KEY_PRESSED,
      source: "view",
      payload: {
        view_id: "music.main",
        binding_label: currentStateBinding.value.binding_label || "",
        note,
        source: "user",
      },
    });
    if (lessonTargetNote && lessonTargetNote === note) {
      const nextResource = mutateLessonMatched(currentStateBinding.value, { note });
      applyNextResource(nextResource, activeAnchor.value || "music.keyboard");
      logger.info("music_lesson_note_matched_emit", {
        note,
        expected_note: lessonTargetNote,
        binding_label: nextResource.binding_label || "",
        waiting_for_match: nextResource.data && typeof nextResource.data === "object"
          ? (nextResource.data as Record<string, unknown>).lesson
            && typeof (nextResource.data as Record<string, unknown>).lesson === "object"
            ? Boolean(((nextResource.data as Record<string, unknown>).lesson as Record<string, unknown>).waiting_for_match)
            : undefined
          : undefined,
      });
      emitAssistantRuntimeEvent({
        type: ASSISTANT_RUNTIME_EVENT_TYPES.MUSIC_LESSON_NOTE_MATCHED,
        source: "view",
        payload: {
          view_id: "music.main",
          binding_label: nextResource.binding_label || "",
          note,
          expected_note: lessonTargetNote,
          source: "user",
        },
      });
      markTransientActive(note, 240);
      await runCapability("music.play_note", {
        note,
        duration_ms: 320,
        gap_after_ms: 0,
        velocity: 0.9,
      }, nextResource);
      return;
    }
    markTransientActive(note, 240);
    await runCapability("music.play_note", {
      note,
      duration_ms: 320,
      gap_after_ms: 0,
      velocity: 0.9,
    });
  }

  async function stopAll() {
    await runCapability("music.stop_all", {});
  }

  async function setInstrument(instrument: string) {
    await runCapability("music.set_instrument", { instrument });
  }

  async function refreshTransportState() {
    await runCapability("music.get_transport_state", {});
  }

  async function unlockAudioByGesture() {
    isAudioUnlocking.value = true;
    capabilityError.value = "";
    try {
      const engine = getPianoEngine();
      await engine.unlockWithGesture();
      await refreshTransportState();
    } finally {
      isAudioUnlocking.value = false;
    }
  }

  const engine = getPianoEngine();
  const unsubscribe = engine.subscribe((snapshot) => {
    if (!isMusicActive.value || !currentStateBinding.value || !activeManifest.value) {
      return;
    }
    const nextResource = mutateTransportState(currentStateBinding.value, {
      audioContextState: snapshot.state,
      requiresUserGesture: snapshot.state !== "running",
      activeNotes: snapshot.activeNotes,
    });
    applyNextResource(nextResource, activeAnchor.value || "music.keyboard");
  });
  onBeforeUnmount(() => {
    unsubscribe();
    transientTimers.forEach((timer) => clearTimeout(timer));
    transientTimers.clear();
  });

  return {
    activeAnchor,
    activeNotes,
    capabilityError,
    keyboardLayout,
    isAudioUnlocking,
    isMusicActive,
    isMutating,
    musicData,
    playNoteFromUser,
    refreshTransportState,
    requiresAudioUnlock,
    setInstrument,
    stopAll,
    supportedNotes,
    visualActiveNotes,
    unlockAudioByGesture,
  };
}

