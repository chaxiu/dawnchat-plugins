import { describe, expect, it } from "vitest";

import { voiceHintToBcp47Lang } from "../voiceLang";

describe("voiceHintToBcp47Lang", () => {
  it("maps Azure-style hints to BCP 47", () => {
    expect(voiceHintToBcp47Lang("zh-CN-XiaoxiaoNeural")).toBe("zh-CN");
    expect(voiceHintToBcp47Lang("en-US-JennyNeural")).toBe("en-US");
  });

  it("returns undefined for empty or non-matching hints", () => {
    expect(voiceHintToBcp47Lang(undefined)).toBeUndefined();
    expect(voiceHintToBcp47Lang("")).toBeUndefined();
    expect(voiceHintToBcp47Lang("default")).toBeUndefined();
  });
});
