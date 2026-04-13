import {
  openMusicMainView,
  validateMusicResource,
} from "../musicMain.view";

describe("music.main resource", () => {
  it("opens music.main with normalized payload", () => {
    const result = openMusicMainView({
      state_binding: {
        binding_type: "music.piano",
        title: "Promo Piano",
        data: {
          instrument: "piano",
          volume: 0.55,
          keyboard: {
            min_note: "C3",
            max_note: "B4",
            supported_notes: ["C3", "C#3", "D3"],
          },
          lesson: {
            highlighted_note: "C4",
            waiting_for_match: true,
            prompt_text: "请先弹 C4",
          },
        },
      },
    });
    expect(result).toEqual(expect.objectContaining({
      state_binding: expect.objectContaining({
        binding_type: "music.piano",
        title: "Promo Piano",
        data: expect.objectContaining({
          instrument: "piano",
          volume: 0.55,
          keyboard: expect.objectContaining({
            min_note: "C3",
            max_note: "B4",
          }),
          lesson: expect.objectContaining({
            highlighted_note: "C4",
            waiting_for_match: true,
            prompt_text: "请先弹 C4",
          }),
        }),
      }),
      activeAnchor: "music.keyboard",
    }));
  });

  it("rejects invalid resource type", () => {
    const result = validateMusicResource({
      binding_type: "wrong.resource",
      data: {},
    });
    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_resource",
      message: "music.main requires state_binding.binding_type to be 'music.piano'",
      data: undefined,
    });
  });
});

