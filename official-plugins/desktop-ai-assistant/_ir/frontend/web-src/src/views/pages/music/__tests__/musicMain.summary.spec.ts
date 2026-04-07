import {
  buildMusicMainStateSummary,
  MUSIC_DEFAULT_RESOURCE,
} from "../musicMain.view";

describe("music.main summary", () => {
  it("builds summary including transport and note range", () => {
    const summary = buildMusicMainStateSummary(MUSIC_DEFAULT_RESOURCE, "music.keyboard");
    expect(summary).toEqual({
      resource_title: "AI Piano Stage",
      instrument: "piano",
      volume: 0.7,
      is_playing: false,
      active_notes: [],
      last_note: "",
      audio_context_state: "uninitialized",
      requires_user_gesture: true,
      supported_note_range: {
        min_note: "C3",
        max_note: "B6",
      },
      lesson_highlighted_note: "",
      lesson_waiting_for_match: false,
      lesson_prompt_text: "",
      last_matched_lesson_note: "",
      active_anchor: "music.keyboard",
    });
  });
});

