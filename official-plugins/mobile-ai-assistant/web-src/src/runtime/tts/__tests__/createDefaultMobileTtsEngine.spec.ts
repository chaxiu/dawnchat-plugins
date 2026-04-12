import { afterEach, describe, expect, it, vi } from "vitest";

const getPlatform = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => getPlatform(),
  },
}));

describe("createDefaultMobileTtsEngine", () => {
  afterEach(() => {
    vi.resetModules();
    getPlatform.mockReset();
  });

  it("uses WebSpeech on web platform", async () => {
    getPlatform.mockReturnValue("web");
    const { createDefaultMobileTtsEngine } = await import("../createDefaultMobileTtsEngine");
    const { WebSpeechSynthesisTtsEngine } = await import("../webSpeechSynthesisTtsEngine");
    const engine = createDefaultMobileTtsEngine();
    expect(engine).toBeInstanceOf(WebSpeechSynthesisTtsEngine);
  });

  it("uses Capacitor community engine on ios", async () => {
    getPlatform.mockReturnValue("ios");
    const { createDefaultMobileTtsEngine } = await import("../createDefaultMobileTtsEngine");
    const { CapacitorCommunityTtsEngine } = await import("../capacitorCommunityTtsEngine");
    const engine = createDefaultMobileTtsEngine();
    expect(engine).toBeInstanceOf(CapacitorCommunityTtsEngine);
  });

  it("uses Capacitor community engine on android", async () => {
    getPlatform.mockReturnValue("android");
    const { createDefaultMobileTtsEngine } = await import("../createDefaultMobileTtsEngine");
    const { CapacitorCommunityTtsEngine } = await import("../capacitorCommunityTtsEngine");
    const engine = createDefaultMobileTtsEngine();
    expect(engine).toBeInstanceOf(CapacitorCommunityTtsEngine);
  });
});
