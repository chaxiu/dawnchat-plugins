import type { ViewResourceBinding } from "../../../../runtime/view";
import { readMusicResourceData } from "./resource";

export function buildMusicMainStateSummary(resource: ViewResourceBinding, activeAnchor?: string) {
  const music = readMusicResourceData(resource);
  return {
    resource_title: resource.title || "",
    instrument: music.instrument,
    volume: music.volume,
    is_playing: music.playback.is_playing,
    active_notes: Array.isArray(music.playback.active_notes) ? [...music.playback.active_notes] : [],
    last_note: music.playback.last_note || "",
    audio_context_state: music.audio.audio_context_state,
    requires_user_gesture: music.audio.requires_user_gesture,
    supported_note_range: {
      min_note: music.keyboard.min_note,
      max_note: music.keyboard.max_note,
    },
    lesson_highlighted_note: music.lesson.highlighted_note || "",
    lesson_waiting_for_match: music.lesson.waiting_for_match,
    lesson_prompt_text: music.lesson.prompt_text || "",
    last_matched_lesson_note: music.lesson.last_matched_note || "",
    active_anchor: activeAnchor || "",
  };
}

