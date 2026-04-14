import { afterEach, describe, expect, it, vi } from "vitest";

const getPlatform = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => getPlatform(),
  },
  registerPlugin: vi.fn(() => ({
    synthesizeToFile: vi.fn(),
  })),
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

  it("uses Dawn TTS engine on ios", async () => {
    getPlatform.mockReturnValue("ios");
    const { createDefaultMobileTtsEngine } = await import("../createDefaultMobileTtsEngine");
    const { DawnTtsMobileEngine } = await import("../dawnTtsMobileEngine");
    const engine = createDefaultMobileTtsEngine();
    expect(engine).toBeInstanceOf(DawnTtsMobileEngine);
  });

  it("uses Dawn TTS engine on android", async () => {
    getPlatform.mockReturnValue("android");
    const { createDefaultMobileTtsEngine } = await import("../createDefaultMobileTtsEngine");
    const { DawnTtsMobileEngine } = await import("../dawnTtsMobileEngine");
    const engine = createDefaultMobileTtsEngine();
    expect(engine).toBeInstanceOf(DawnTtsMobileEngine);
  });

  it("uses Capacitor community engine when VITE_USE_CAPACITOR_COMMUNITY_TTS=1", async () => {
    vi.stubEnv("VITE_USE_CAPACITOR_COMMUNITY_TTS", "1");
    getPlatform.mockReturnValue("android");
    const { createDefaultMobileTtsEngine } = await import("../createDefaultMobileTtsEngine");
    const { CapacitorCommunityTtsEngine } = await import("../capacitorCommunityTtsEngine");
    const engine = createDefaultMobileTtsEngine();
    expect(engine).toBeInstanceOf(CapacitorCommunityTtsEngine);
    vi.unstubAllEnvs();
  });
});
