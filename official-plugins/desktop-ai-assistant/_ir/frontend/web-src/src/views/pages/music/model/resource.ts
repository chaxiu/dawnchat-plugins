import type {
  ViewOpenSuccess,
  ViewOperationFailure,
  ViewResourceBinding,
} from "../../../../runtime/view/manifest";
import {
  buildOperationError,
  cloneViewResource,
  isViewOperationFailure,
  toRecord,
} from "../../../shared/viewUtils";
import { MUSIC_NOTE_RANGE, MUSIC_SUPPORTED_NOTES } from "./notes";
import {
  createDefaultMusicResourceData,
  MUSIC_INSTRUMENTS,
  type MusicAudioState,
  type MusicInstrument,
  type MusicLessonState,
  type MusicPlaybackState,
  type MusicResourceData,
} from "./types";

const MUSIC_RESOURCE_TYPE = "music.piano";
const MUSIC_RESOURCE_ID = "music:piano-demo";
const MUSIC_RESOURCE_TITLE = "AI Piano Stage";

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function parseInstrument(raw: unknown): MusicInstrument {
  if (MUSIC_INSTRUMENTS.includes(raw as MusicInstrument)) {
    return raw as MusicInstrument;
  }
  return "piano";
}

function normalizePlayback(raw: unknown, fallback: MusicPlaybackState): MusicPlaybackState {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const activeNotes = Array.isArray(source.active_notes)
    ? source.active_notes.map((item) => String(item || "").trim()).filter((item) => MUSIC_SUPPORTED_NOTES.includes(item))
    : fallback.active_notes;
  return {
    active_notes: activeNotes,
    last_note: typeof source.last_note === "string" ? source.last_note.trim() : fallback.last_note,
    is_playing: Boolean(source.is_playing),
    last_duration_ms: Math.trunc(clampNumber(source.last_duration_ms, fallback.last_duration_ms, 0, 10000)),
    last_gap_after_ms: Math.trunc(clampNumber(source.last_gap_after_ms, fallback.last_gap_after_ms, 0, 10000)),
    last_velocity: clampNumber(source.last_velocity, fallback.last_velocity, 0, 1),
    played_notes_count: Math.trunc(clampNumber(source.played_notes_count, fallback.played_notes_count, 0, 1_000_000)),
  };
}

function normalizeAudio(raw: unknown, fallback: MusicAudioState): MusicAudioState {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const audioState = source.audio_context_state;
  return {
    audio_context_state:
      audioState === "running"
      || audioState === "suspended"
      || audioState === "closed"
      || audioState === "uninitialized"
        ? audioState
        : fallback.audio_context_state,
    requires_user_gesture: typeof source.requires_user_gesture === "boolean"
      ? source.requires_user_gesture
      : fallback.requires_user_gesture,
  };
}

function normalizeLesson(raw: unknown, fallback: MusicLessonState): MusicLessonState {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const highlightedNote = typeof source.highlighted_note === "string"
    ? source.highlighted_note.trim()
    : fallback.highlighted_note;
  const lastMatchedNote = typeof source.last_matched_note === "string"
    ? source.last_matched_note.trim()
    : fallback.last_matched_note;
  const normalizedHighlightedNote = MUSIC_SUPPORTED_NOTES.includes(highlightedNote) ? highlightedNote : "";
  return {
    highlighted_note: normalizedHighlightedNote,
    waiting_for_match: normalizedHighlightedNote !== "" && (typeof source.waiting_for_match === "boolean"
      ? source.waiting_for_match
      : fallback.waiting_for_match),
    prompt_text: typeof source.prompt_text === "string" ? source.prompt_text.trim() : fallback.prompt_text,
    last_matched_note: MUSIC_SUPPORTED_NOTES.includes(lastMatchedNote) ? lastMatchedNote : "",
  };
}

export const MUSIC_DEFAULT_RESOURCE: ViewResourceBinding = {
  resource_type: MUSIC_RESOURCE_TYPE,
  resource_id: MUSIC_RESOURCE_ID,
  title: MUSIC_RESOURCE_TITLE,
  data: createDefaultMusicResourceData() as unknown as Record<string, unknown>,
};

export function cloneMusicResource(resource: ViewResourceBinding): ViewResourceBinding {
  return cloneViewResource(resource);
}

export function readMusicResourceData(resource: ViewResourceBinding): MusicResourceData {
  return resource.data as unknown as MusicResourceData;
}

export function normalizeMusicResource(raw: Record<string, unknown>): ViewResourceBinding {
  const defaults = createDefaultMusicResourceData();
  const rawData = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
    ? raw.data as Record<string, unknown>
    : {};
  const rawKeyboard = rawData.keyboard && typeof rawData.keyboard === "object" && !Array.isArray(rawData.keyboard)
    ? rawData.keyboard as Record<string, unknown>
    : {};
  const supportedNotes = Array.isArray(rawKeyboard.supported_notes)
    ? rawKeyboard.supported_notes
        .map((item) => String(item || "").trim())
        .filter((item) => MUSIC_SUPPORTED_NOTES.includes(item))
    : defaults.keyboard.supported_notes;

  return {
    resource_type: MUSIC_RESOURCE_TYPE,
    resource_id: typeof raw.resource_id === "string" && raw.resource_id.trim()
      ? raw.resource_id.trim()
      : MUSIC_RESOURCE_ID,
    title: typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : MUSIC_RESOURCE_TITLE,
    data: {
      keyboard: {
        min_note: typeof rawKeyboard.min_note === "string" ? rawKeyboard.min_note.trim() : MUSIC_NOTE_RANGE.min,
        max_note: typeof rawKeyboard.max_note === "string" ? rawKeyboard.max_note.trim() : MUSIC_NOTE_RANGE.max,
        supported_notes: supportedNotes.length > 0 ? supportedNotes : [...MUSIC_SUPPORTED_NOTES],
      },
      instrument: parseInstrument(rawData.instrument),
      volume: clampNumber(rawData.volume, defaults.volume, 0, 1),
      playback: normalizePlayback(rawData.playback, defaults.playback),
      audio: normalizeAudio(rawData.audio, defaults.audio),
      lesson: normalizeLesson(rawData.lesson, defaults.lesson),
    } as unknown as Record<string, unknown>,
  };
}

export function validateMusicResource(
  payload: Record<string, unknown>
): ViewResourceBinding | ViewOperationFailure {
  if (Object.keys(payload).length === 0) {
    return cloneMusicResource(MUSIC_DEFAULT_RESOURCE);
  }

  const resourceType = typeof payload.resource_type === "string" && payload.resource_type.trim()
    ? payload.resource_type.trim()
    : MUSIC_RESOURCE_TYPE;
  if (resourceType !== MUSIC_RESOURCE_TYPE) {
    return buildOperationError(
      "invalid_view_resource",
      `music.main requires resource.resource_type to be '${MUSIC_RESOURCE_TYPE}'`
    );
  }

  const rawData = payload.data;
  if (rawData !== undefined && (!rawData || typeof rawData !== "object" || Array.isArray(rawData))) {
    return buildOperationError(
      "invalid_view_resource",
      "music.main requires resource.data to be an object"
    );
  }

  return normalizeMusicResource(payload);
}

export function openMusicMainView(payload: Record<string, unknown>): ViewOpenSuccess | ViewOperationFailure {
  const input = toRecord(payload);
  const normalizedResource = validateMusicResource(toRecord(input.resource));
  if (isViewOperationFailure(normalizedResource)) {
    return normalizedResource;
  }
  const initialAnchor = typeof input.initial_anchor === "string" ? input.initial_anchor.trim() : "";
  return {
    resource: normalizedResource,
    activeAnchor: initialAnchor || "music.keyboard",
    data: {
      status: "applied",
      resource_id: normalizedResource.resource_id || "",
    },
  };
}

