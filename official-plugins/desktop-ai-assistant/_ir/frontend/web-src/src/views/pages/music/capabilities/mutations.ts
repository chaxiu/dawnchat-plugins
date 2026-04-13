import type { ViewCapabilityResult, ViewStateBinding } from "../../../../runtime/view";
import { buildOperationError } from "../../../shared/viewUtils";
import { normalizeMusicNote } from "../model/notes";
import { cloneMusicResource, readMusicResourceData } from "../model/resource";
import { MUSIC_INSTRUMENTS } from "../model/types";

export interface PlayNoteMutationStart {
  state_binding: ViewStateBinding;
  normalizedNote: string;
  durationMs: number;
  gapAfterMs: number;
  velocity: number;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

export function mutateSetInstrument(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const instrument = typeof input.instrument === "string" ? input.instrument.trim() : "";
  if (!MUSIC_INSTRUMENTS.includes(instrument as (typeof MUSIC_INSTRUMENTS)[number])) {
    return buildOperationError(
      "invalid_view_capability_input",
      `music.set_instrument requires input.instrument to be one of: ${MUSIC_INSTRUMENTS.join(", ")}`
    );
  }

  const nextResource = cloneMusicResource(state_binding);
  const music = readMusicResourceData(nextResource);
  music.instrument = instrument as (typeof MUSIC_INSTRUMENTS)[number];
  music.volume = clampNumber(input.volume, music.volume, 0, 1);
  return {
    state_binding: nextResource,
    activeAnchor: "music.header",
    data: {
      status: "applied",
      instrument: music.instrument,
      volume: music.volume,
    },
  };
}

export function mutateHighlightKey(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const clear = input.clear === true;
  const normalizedNote = clear ? "" : (normalizeMusicNote(String(input.note || "")) || "");
  if (!clear && !normalizedNote) {
    return buildOperationError(
      "note_out_of_range",
      "music.highlight_key requires note within supported range C3~B6"
    );
  }
  const nextResource = cloneMusicResource(state_binding);
  const music = readMusicResourceData(nextResource);
  music.lesson.highlighted_note = normalizedNote;
  music.lesson.waiting_for_match = Boolean(normalizedNote);
  music.lesson.prompt_text = typeof input.prompt_text === "string" ? input.prompt_text.trim() : "";
  if (clear) {
    music.lesson.highlighted_note = "";
    music.lesson.waiting_for_match = false;
    music.lesson.prompt_text = "";
  }
  return {
    state_binding: nextResource,
    activeAnchor: "music.keyboard",
    data: {
      status: "applied",
      highlighted_note: music.lesson.highlighted_note,
      waiting_for_match: music.lesson.waiting_for_match,
      prompt_text: music.lesson.prompt_text,
    },
  };
}

export function mutateLessonMatched(
  state_binding: ViewStateBinding,
  input: {
    note: string;
  }
): ViewStateBinding {
  const nextResource = cloneMusicResource(state_binding);
  const music = readMusicResourceData(nextResource);
  music.lesson.last_matched_note = input.note;
  music.lesson.highlighted_note = "";
  music.lesson.waiting_for_match = false;
  music.lesson.prompt_text = "";
  return nextResource;
}

export function mutateTransportState(
  state_binding: ViewStateBinding,
  input: {
    audioContextState?: "running" | "suspended" | "closed" | "uninitialized";
    requiresUserGesture?: boolean;
    activeNotes?: string[];
  }
): ViewStateBinding {
  const nextResource = cloneMusicResource(state_binding);
  const music = readMusicResourceData(nextResource);
  if (input.audioContextState) {
    music.audio.audio_context_state = input.audioContextState;
  }
  if (typeof input.requiresUserGesture === "boolean") {
    music.audio.requires_user_gesture = input.requiresUserGesture;
  }
  if (Array.isArray(input.activeNotes)) {
    music.playback.active_notes = input.activeNotes;
    music.playback.is_playing = input.activeNotes.length > 0;
  }
  return nextResource;
}

export function mutatePlayNoteStart(
  state_binding: ViewStateBinding,
  input: Record<string, unknown>
): PlayNoteMutationStart | ReturnType<typeof buildOperationError> {
  const normalizedNote = normalizeMusicNote(String(input.note || ""));
  if (!normalizedNote) {
    return buildOperationError(
      "note_out_of_range",
      "music.play_note requires note within supported range C3~B6"
    );
  }
  const durationMs = Math.trunc(clampNumber(input.duration_ms, 360, 30, 4000));
  const gapAfterMs = Math.trunc(clampNumber(input.gap_after_ms, 0, 0, 3000));
  const velocity = clampNumber(input.velocity, 0.8, 0, 1);

  const nextResource = cloneMusicResource(state_binding);
  const music = readMusicResourceData(nextResource);
  music.playback.active_notes = [normalizedNote];
  music.playback.last_note = normalizedNote;
  music.playback.last_duration_ms = durationMs;
  music.playback.last_gap_after_ms = gapAfterMs;
  music.playback.last_velocity = velocity;
  music.playback.is_playing = true;
  music.playback.played_notes_count += 1;

  return {
    state_binding: nextResource,
    normalizedNote,
    durationMs,
    gapAfterMs,
    velocity,
  };
}

export function mutatePlayNoteEnd(state_binding: ViewStateBinding): ViewStateBinding {
  const nextResource = cloneMusicResource(state_binding);
  const music = readMusicResourceData(nextResource);
  music.playback.active_notes = [];
  music.playback.is_playing = false;
  return nextResource;
}

export function mutateStopAll(state_binding: ViewStateBinding): ViewCapabilityResult {
  const nextResource = cloneMusicResource(state_binding);
  const music = readMusicResourceData(nextResource);
  music.playback.active_notes = [];
  music.playback.is_playing = false;
  return {
    state_binding: nextResource,
    activeAnchor: "music.panel",
    data: {
      status: "applied",
      stopped: true,
    },
  };
}

