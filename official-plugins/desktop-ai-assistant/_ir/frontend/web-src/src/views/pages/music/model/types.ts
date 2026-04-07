import { MUSIC_NOTE_RANGE, MUSIC_SUPPORTED_NOTES } from "./notes";

export const MUSIC_INSTRUMENTS = ["piano"] as const;
export type MusicInstrument = (typeof MUSIC_INSTRUMENTS)[number];

export interface MusicKeyboardConfig {
  min_note: string;
  max_note: string;
  supported_notes: string[];
}

export interface MusicPlaybackState {
  active_notes: string[];
  last_note: string;
  is_playing: boolean;
  last_duration_ms: number;
  last_gap_after_ms: number;
  last_velocity: number;
  played_notes_count: number;
}

export interface MusicAudioState {
  audio_context_state: "running" | "suspended" | "closed" | "uninitialized";
  requires_user_gesture: boolean;
}

export interface MusicLessonState {
  highlighted_note: string;
  waiting_for_match: boolean;
  prompt_text: string;
  last_matched_note: string;
}

export interface MusicResourceData {
  keyboard: MusicKeyboardConfig;
  instrument: MusicInstrument;
  volume: number;
  playback: MusicPlaybackState;
  audio: MusicAudioState;
  lesson: MusicLessonState;
}

export function createDefaultMusicResourceData(): MusicResourceData {
  return {
    keyboard: {
      min_note: MUSIC_NOTE_RANGE.min,
      max_note: MUSIC_NOTE_RANGE.max,
      supported_notes: [...MUSIC_SUPPORTED_NOTES],
    },
    instrument: "piano",
    volume: 0.7,
    playback: {
      active_notes: [],
      last_note: "",
      is_playing: false,
      last_duration_ms: 0,
      last_gap_after_ms: 0,
      last_velocity: 0.8,
      played_notes_count: 0,
    },
    audio: {
      audio_context_state: "uninitialized",
      requires_user_gesture: true,
    },
    lesson: {
      highlighted_note: "",
      waiting_for_match: false,
      prompt_text: "",
      last_matched_note: "",
    },
  };
}

