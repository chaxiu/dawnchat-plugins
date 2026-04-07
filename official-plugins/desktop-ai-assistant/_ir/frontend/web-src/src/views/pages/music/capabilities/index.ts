import type { ViewCapabilityResult, ViewResourceBinding } from "../../../../runtime/view";
import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../../../runtime/events";
import { emitAssistantRuntimeEvent } from "../../../../runtime/runtimeEventBridge";
import { buildOperationError } from "../../../shared/viewUtils";
import { getPianoEngine } from "../audio/pianoEngine";
import { readMusicResourceData } from "../model/resource";
import {
  mutateHighlightKey,
  mutatePlayNoteEnd,
  mutatePlayNoteStart,
  mutateSetInstrument,
  mutateStopAll,
  mutateTransportState,
} from "./mutations";

function isFailure(result: ViewCapabilityResult): result is {
  ok: false;
  error_code: string;
  message: string;
  data?: Record<string, unknown>;
} {
  return "ok" in result && result.ok === false;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

function emitMusicEvent(
  type: string,
  payload: Record<string, unknown>
) {
  emitAssistantRuntimeEvent({
    type: type as (typeof ASSISTANT_RUNTIME_EVENT_TYPES)[keyof typeof ASSISTANT_RUNTIME_EVENT_TYPES],
    source: "view",
    payload,
  });
}

async function playMusicNote(
  input: Record<string, unknown>,
  resource: ViewResourceBinding
): Promise<ViewCapabilityResult> {
  const startResult = mutatePlayNoteStart(resource, input);
  if ("ok" in startResult) {
    return startResult;
  }

  const {
    resource: startResource,
    normalizedNote,
    durationMs,
    gapAfterMs,
    velocity,
  } = startResult;
  const music = readMusicResourceData(startResource);
  const engine = getPianoEngine();
  const ensure = await engine.ensureRunning();
  const contextRunning = ensure.state === "running";
  if (!contextRunning) {
    const failedResource = mutateTransportState(startResource, {
      audioContextState: ensure.state,
      requiresUserGesture: true,
      activeNotes: [],
    });
    return buildOperationError(
      "audio_context_not_running",
      "Audio context is not running, user gesture is required to enable sound.",
      {
        resource: failedResource,
      }
    );
  }

  const withRunningState = mutateTransportState(startResource, {
    audioContextState: "running",
    requiresUserGesture: false,
    activeNotes: [normalizedNote],
  });
  emitMusicEvent(ASSISTANT_RUNTIME_EVENT_TYPES.MUSIC_NOTE_STARTED, {
    view_id: "music.main",
    resource_id: withRunningState.resource_id || "",
    note: normalizedNote,
    duration_ms: durationMs,
    gap_after_ms: gapAfterMs,
    velocity,
    instrument: music.instrument,
  });

  const playResult = await engine.playNote({
    note: normalizedNote,
    durationMs,
    velocity,
    volume: music.volume,
  });
  const endedResource = mutatePlayNoteEnd(
    mutateTransportState(withRunningState, {
      audioContextState: engine.getSnapshot().state,
      requiresUserGesture: engine.getSnapshot().state !== "running",
      activeNotes: [],
    })
  );
  if (!playResult.ok) {
    return buildOperationError(
      "audio_context_not_running",
      "Unable to play note because audio context is unavailable.",
      {
        resource: endedResource,
      }
    );
  }

  emitMusicEvent(ASSISTANT_RUNTIME_EVENT_TYPES.MUSIC_NOTE_ENDED, {
    view_id: "music.main",
    resource_id: endedResource.resource_id || "",
    note: normalizedNote,
    duration_ms: durationMs,
  });
  if (gapAfterMs > 0) {
    await waitMs(gapAfterMs);
  }
  return {
    resource: endedResource,
    activeAnchor: "music.keyboard",
    data: {
      status: "applied",
      note: normalizedNote,
      duration_ms: durationMs,
      gap_after_ms: gapAfterMs,
      velocity,
    },
  };
}

export async function invokeMusicMainCapability(
  capabilityId: string,
  input: Record<string, unknown>,
  resource: ViewResourceBinding
): Promise<ViewCapabilityResult> {
  if (capabilityId === "music.set_instrument") {
    return mutateSetInstrument(resource, input);
  }
  if (capabilityId === "music.highlight_key") {
    return mutateHighlightKey(resource, input);
  }
  if (capabilityId === "music.play_note") {
    return playMusicNote(input, resource);
  }
  if (capabilityId === "music.stop_all") {
    const engine = getPianoEngine();
    engine.stopAll();
    emitMusicEvent(ASSISTANT_RUNTIME_EVENT_TYPES.MUSIC_SEQUENCE_STOPPED, {
      view_id: "music.main",
      resource_id: resource.resource_id || "",
      reason: "manual_stop",
    });
    return mutateStopAll(
      mutateTransportState(resource, {
        audioContextState: engine.getSnapshot().state,
        requiresUserGesture: engine.getSnapshot().state !== "running",
        activeNotes: [],
      })
    );
  }
  if (capabilityId === "music.get_transport_state") {
    const engine = getPianoEngine();
    const snapshot = engine.getSnapshot();
    const nextResource = mutateTransportState(resource, {
      audioContextState: snapshot.state,
      requiresUserGesture: snapshot.state !== "running",
      activeNotes: snapshot.activeNotes,
    });
    return {
      resource: nextResource,
      activeAnchor: "music.header",
      data: {
        status: "applied",
        audio_context_state: snapshot.state,
        active_notes: snapshot.activeNotes,
        lesson_highlighted_note: readMusicResourceData(nextResource).lesson.highlighted_note || "",
      },
    };
  }
  if (capabilityId === "music.play_phrase") {
    const rawSteps = Array.isArray(input.steps) ? input.steps : [];
    if (rawSteps.length === 0) {
      return buildOperationError(
        "invalid_view_capability_input",
        "music.play_phrase requires input.steps as a non-empty array"
      );
    }
    let currentResource = resource;
    let played = 0;
    for (const step of rawSteps) {
      if (!step || typeof step !== "object" || Array.isArray(step)) {
        return buildOperationError(
          "invalid_view_capability_input",
          "music.play_phrase requires each step to be an object"
        );
      }
      const stepResult = await playMusicNote(step as Record<string, unknown>, currentResource);
      if (isFailure(stepResult)) {
        return stepResult;
      }
      currentResource = stepResult.resource || currentResource;
      played += 1;
    }
    return {
      resource: currentResource,
      activeAnchor: "music.keyboard",
      data: {
        status: "applied",
        phrase_steps_played: played,
      },
    };
  }
  return buildOperationError(
    "view_capability_not_found",
    `View capability not found: ${capabilityId}`
  );
}

