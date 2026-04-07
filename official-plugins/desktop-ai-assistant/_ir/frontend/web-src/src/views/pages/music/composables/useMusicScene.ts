import { computed, onBeforeUnmount, ref } from "vue";

import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../../../runtime/events";
import { emitAssistantRuntimeEvent } from "../../../../runtime/runtimeEventBridge";
import { useViewState } from "../../../../runtime/view/state";
import type { ViewCapabilityResult, ViewResourceBinding } from "../../../../runtime/view/manifest";
import { getPianoEngine } from "../audio/pianoEngine";
import { invokeMusicMainCapability } from "../capabilities";
import { mutateLessonMatched, mutateTransportState } from "../capabilities/mutations";
import { cloneMusicResource, readMusicResourceData } from "../model/resource";
import { buildMusicMainStateSummary } from "../model/summary";
import { buildPianoKeyboardLayout } from "../model/keyboardLayout";
import { logger } from "../../../../utils/logger";

export function useMusicScene() {
  const { activeViewId, activeAnchor, activeManifest, currentResource, setActiveViewState } = useViewState();
  const isMutating = ref(false);
  const isAudioUnlocking = ref(false);
  const capabilityError = ref("");
  const transientActiveNotes = ref<string[]>([]);
  const transientTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const isMusicActive = computed(() => activeViewId.value === "music.main");
  const musicData = computed(() => {
    if (!currentResource.value) {
      return null;
    }
    return readMusicResourceData(currentResource.value);
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

  function applyNextResource(nextResource: ViewResourceBinding, nextAnchor?: string) {
    if (!activeManifest.value) {
      return;
    }
    const anchor = nextAnchor || activeAnchor.value || "music.keyboard";
    setActiveViewState({
      viewId: "music.main",
      activeAnchor: anchor,
      resource: nextResource,
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

  function mergeLessonStateFromLiveResource(resource: ViewResourceBinding): ViewResourceBinding {
    const liveResource = currentResource.value;
    if (!liveResource || liveResource.resource_type !== resource.resource_type) {
      return resource;
    }
    const nextResource = cloneMusicResource(resource);
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
    fallbackResource: ViewResourceBinding
  ): ViewCapabilityResult {
    if ("ok" in result && result.ok === false) {
      const rawNextFromError = result.data?.resource as ViewResourceBinding | undefined;
      const nextFromError = rawNextFromError && shouldPreserveLiveLessonState(capabilityId)
        ? mergeLessonStateFromLiveResource(rawNextFromError)
        : rawNextFromError;
      if (nextFromError && nextFromError.resource_type === fallbackResource.resource_type) {
        applyNextResource(nextFromError, "music.header");
      }
      return result;
    }
    const rawNextResource = result.resource || fallbackResource;
    const nextResource = shouldPreserveLiveLessonState(capabilityId)
      ? mergeLessonStateFromLiveResource(rawNextResource)
      : rawNextResource;
    applyNextResource(nextResource, result.activeAnchor || "music.keyboard");
    return result;
  }

  async function runCapability(
    capabilityId: string,
    input: Record<string, unknown>,
    baseResourceOverride?: ViewResourceBinding
  ) {
    if ((!currentResource.value && !baseResourceOverride) || isMutating.value) {
      return;
    }
    capabilityError.value = "";
    isMutating.value = true;
    try {
      const baseResource = baseResourceOverride || currentResource.value;
      if (!baseResource) {
        return;
      }
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
    if (!currentResource.value) {
      return;
    }
    const lessonTargetNote = musicData.value?.lesson.highlighted_note || "";
    logger.info("music_user_key_pressed", {
      note,
      lesson_target_note: lessonTargetNote,
      active_anchor: activeAnchor.value || "",
      resource_id: currentResource.value.resource_id || "",
    });
    emitAssistantRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.MUSIC_KEY_PRESSED,
      source: "view",
      payload: {
        view_id: "music.main",
        resource_id: currentResource.value.resource_id || "",
        note,
        source: "user",
      },
    });
    if (lessonTargetNote && lessonTargetNote === note) {
      const nextResource = mutateLessonMatched(currentResource.value, { note });
      applyNextResource(nextResource, activeAnchor.value || "music.keyboard");
      logger.info("music_lesson_note_matched_emit", {
        note,
        expected_note: lessonTargetNote,
        resource_id: nextResource.resource_id || "",
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
          resource_id: nextResource.resource_id || "",
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
    if (!isMusicActive.value || !currentResource.value || !activeManifest.value) {
      return;
    }
    const nextResource = mutateTransportState(currentResource.value, {
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

