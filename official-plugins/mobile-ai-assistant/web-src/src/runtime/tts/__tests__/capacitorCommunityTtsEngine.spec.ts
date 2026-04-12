import { beforeEach, describe, expect, it, vi } from "vitest";

const speakMock = vi.fn();
const stopMock = vi.fn();

vi.mock("@capacitor-community/text-to-speech", () => ({
  TextToSpeech: {
    speak: (...args: unknown[]) => speakMock(...args),
    stop: (...args: unknown[]) => stopMock(...args),
  },
  QueueStrategy: {
    Flush: 0,
    Add: 1,
  },
}));

import { CapacitorCommunityTtsEngine } from "../capacitorCommunityTtsEngine";

describe("CapacitorCommunityTtsEngine", () => {
  beforeEach(() => {
    speakMock.mockReset();
    stopMock.mockReset();
    speakMock.mockResolvedValue(undefined);
    stopMock.mockResolvedValue(undefined);
  });

  it("returns completed after native speak resolves", async () => {
    const engine = new CapacitorCommunityTtsEngine();
    const out = await engine.speak({ text: "hello world" });
    expect(out.terminalStatus).toBe("completed");
    expect(out.taskId).toMatch(/^cap-tts-/);
    expect(speakMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "hello world",
        queueStrategy: 0,
      })
    );
  });

  it("maps voice hint to lang", async () => {
    const engine = new CapacitorCommunityTtsEngine();
    await engine.speak({ text: "ni hao", voice: "zh-CN-XiaoxiaoNeural" });
    expect(speakMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lang: "zh-CN",
      })
    );
  });

  it("returns cancelled when stop runs before speak finishes", async () => {
    let finishSpeak: (() => void) | undefined;
    speakMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishSpeak = resolve;
        })
    );
    const engine = new CapacitorCommunityTtsEngine();
    const speakPromise = engine.speak({ text: "long", interrupt: false });
    await engine.stop();
    finishSpeak?.();
    const out = await speakPromise;
    expect(out.terminalStatus).toBe("cancelled");
    expect(stopMock).toHaveBeenCalled();
  });

  it("returns cancelled when stop runs before mutex starts the utterance", async () => {
    speakMock.mockImplementation(() => new Promise<void>(() => undefined));
    const engine = new CapacitorCommunityTtsEngine();
    const speakPromise = engine.speak({ text: "queued", interrupt: false });
    await engine.stop();
    const out = await speakPromise;
    expect(out.terminalStatus).toBe("cancelled");
  });
});
