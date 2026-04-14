import { describe, expect, it } from "vitest";

import {
  MAX_SEGMENT_CHARS,
  chunkSentence,
  normalizeTextForTtsSplit,
  splitTtsSegments,
} from "../splitTtsSegments";

describe("splitTtsSegments", () => {
  it("returns empty for blank input", () => {
    expect(splitTtsSegments("")).toEqual([]);
    expect(splitTtsSegments("   \n\t  ")).toEqual([]);
  });

  it("matches synthesis_service mixed-language boundaries", () => {
    const text = "你好，DawnChat! Please review this change. 然后继续下一步。Final check?";
    expect(splitTtsSegments(text)).toEqual([
      "你好，DawnChat!",
      "Please review this change.",
      "然后继续下一步。",
      "Final check?",
    ]);
  });

  it("chunks long Latin text with soft boundaries (max_chars=20)", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda";
    expect(splitTtsSegments(text, 20)).toEqual([
      "alpha beta gamma",
      "delta epsilon zeta",
      "eta theta iota kappa",
      "lambda",
    ]);
  });

  it("normalizes special punctuation like synthesis_service", () => {
    expect(splitTtsSegments("Hello❓ Next step❗")).toEqual(["Hello?", "Next step!"]);
  });

  it("exports default max aligned with Edge/kernel", () => {
    expect(MAX_SEGMENT_CHARS).toBe(120);
  });

  it("splits very long unbroken CJK with hard cut at maxChars", () => {
    const unit = "字";
    const text = unit.repeat(250);
    const segs = splitTtsSegments(text, 120);
    expect(segs.every((s) => s.length <= 120)).toBe(true);
    expect(segs.join("")).toBe(text);
  });

  it("normalizeTextForTtsSplit trims and collapses whitespace", () => {
    expect(normalizeTextForTtsSplit("  a \n b  ")).toBe("a b");
  });
});

describe("chunkSentence", () => {
  it("returns single chunk when short enough", () => {
    expect(chunkSentence("hello", 120)).toEqual(["hello"]);
  });
});
