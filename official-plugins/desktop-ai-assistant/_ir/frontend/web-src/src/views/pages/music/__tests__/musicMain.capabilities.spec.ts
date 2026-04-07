import {
  musicMainView,
  MUSIC_DEFAULT_RESOURCE,
} from "../musicMain.view";
import { invokeMusicMainCapability } from "../capabilities";

const { ensureRunning, playNote } = vi.hoisted(() => ({
  ensureRunning: vi.fn(async () => ({
    state: "running",
    activeNotes: [],
  })),
  playNote: vi.fn(async () => ({ ok: true, normalizedNote: "C4" })),
}));

vi.mock("../audio/pianoEngine", () => ({
  getPianoEngine: () => ({
    ensureRunning,
    playNote,
    stopAll: vi.fn(),
    getSnapshot: () => ({
      state: "running",
      activeNotes: [],
    }),
  }),
}));

describe("music.main capabilities", () => {
  afterEach(() => {
    ensureRunning.mockClear();
    playNote.mockClear();
  });

  it("exposes expected capability catalog", () => {
    expect(musicMainView.route.full_path).toBe("/views/music/main");
    expect(musicMainView.capabilities.map((item) => item.id)).toEqual([
      "music.set_instrument",
      "music.highlight_key",
      "music.play_note",
      "music.play_phrase",
      "music.stop_all",
      "music.get_transport_state",
    ]);
  });

  it("highlights one lesson key for guided practice", async () => {
    const result = await invokeMusicMainCapability("music.highlight_key", {
      note: "C4",
      prompt_text: "请先弹 C4",
    }, MUSIC_DEFAULT_RESOURCE);

    expect(result).toEqual(expect.objectContaining({
      activeAnchor: "music.keyboard",
      data: expect.objectContaining({
        highlighted_note: "C4",
        waiting_for_match: true,
        prompt_text: "请先弹 C4",
      }),
      resource: expect.objectContaining({
        data: expect.objectContaining({
          lesson: expect.objectContaining({
            highlighted_note: "C4",
            waiting_for_match: true,
          }),
        }),
      }),
    }));
  });

  it("plays one note with timing payload", async () => {
    const result = await invokeMusicMainCapability("music.play_note", {
      note: "C4",
      duration_ms: 320,
      gap_after_ms: 80,
      velocity: 0.7,
    }, MUSIC_DEFAULT_RESOURCE);

    expect(ensureRunning).toHaveBeenCalledTimes(1);
    expect(playNote).toHaveBeenCalledWith(expect.objectContaining({
      note: "C4",
      durationMs: 320,
      velocity: 0.7,
    }));
    expect(result).toEqual(expect.objectContaining({
      activeAnchor: "music.keyboard",
      data: expect.objectContaining({
        status: "applied",
        note: "C4",
        duration_ms: 320,
        gap_after_ms: 80,
      }),
    }));
  });

  it("rejects notes out of C3~B6", async () => {
    const result = await invokeMusicMainCapability("music.play_note", {
      note: "C7",
      duration_ms: 320,
    }, MUSIC_DEFAULT_RESOURCE);

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      error_code: "note_out_of_range",
    }));
  });

  it("plays phrase sequentially", async () => {
    const result = await invokeMusicMainCapability("music.play_phrase", {
      steps: [
        { note: "C4", duration_ms: 120, gap_after_ms: 10 },
        { note: "D4", duration_ms: 120, gap_after_ms: 10 },
      ],
    }, MUSIC_DEFAULT_RESOURCE);

    expect(ensureRunning).toHaveBeenCalledTimes(2);
    expect(playNote).toHaveBeenCalledTimes(2);
    expect(result).toEqual(expect.objectContaining({
      activeAnchor: "music.keyboard",
      data: expect.objectContaining({
        phrase_steps_played: 2,
      }),
    }));
  });
});

