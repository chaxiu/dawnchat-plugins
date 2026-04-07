import { buildPianoKeyboardLayout } from "../model/keyboardLayout";
import { MUSIC_SUPPORTED_NOTES } from "../model/notes";

describe("music keyboard layout", () => {
  it("builds white/black mapping for current range", () => {
    const layout = buildPianoKeyboardLayout(MUSIC_SUPPORTED_NOTES);
    expect(layout.white_key_count).toBe(28);
    expect(layout.white_keys[0]).toEqual(expect.objectContaining({
      note: "C3",
      white_index: 0,
    }));
    expect(layout.white_keys[layout.white_keys.length - 1]).toEqual(expect.objectContaining({
      note: "B6",
      white_index: 27,
    }));
    expect(layout.black_keys.some((key) => key.note === "C#4")).toBe(true);
    expect(layout.black_keys.some((key) => key.note === "A#6")).toBe(true);
    expect(layout.black_keys.find((key) => key.note === "C#6")).toEqual(expect.objectContaining({
      anchor_white_index: 21,
    }));
  });
});

