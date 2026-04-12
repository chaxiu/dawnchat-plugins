import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WebSpeechSynthesisTtsEngine } from "../webSpeechSynthesisTtsEngine";

describe("WebSpeechSynthesisTtsEngine", () => {
  let lastUtterance: {
    text: string;
    lang: string;
    voice: SpeechSynthesisVoice | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechSynthesisErrorEvent) => void) | null;
  } | null;

  const speakFn = vi.fn((u: InstanceType<typeof SpeechSynthesisUtterance>) => {
    lastUtterance = u as typeof lastUtterance extends null ? never : NonNullable<typeof lastUtterance>;
  });
  const cancelFn = vi.fn();
  const getVoicesFn = vi.fn((): SpeechSynthesisVoice[] => [
    {
      default: true,
      lang: "en-US",
      localService: true,
      name: "English US",
      voiceURI: "en-US-default",
    } as SpeechSynthesisVoice,
  ]);

  beforeEach(() => {
    lastUtterance = null;
    speakFn.mockClear();
    cancelFn.mockClear();
    getVoicesFn.mockClear();
    getVoicesFn.mockReturnValue([
      {
        default: true,
        lang: "en-US",
        localService: true,
        name: "English US",
        voiceURI: "en-US-default",
      } as SpeechSynthesisVoice,
    ]);

    class MockUtterance {
      text = "";
      lang = "";
      voice: SpeechSynthesisVoice | null = null;
      onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null;
      onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => void) | null = null;
      constructor(text?: string) {
        this.text = text ?? "";
      }
    }

    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
      MockUtterance as unknown as typeof SpeechSynthesisUtterance;

    (globalThis as unknown as { window: Window & typeof globalThis }).window = {
      speechSynthesis: {
        speak: speakFn,
        cancel: cancelFn,
        getVoices: getVoicesFn,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      navigator: { language: "en-US" },
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
  });

  async function flushMutexJob(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it("completes when utterance fires onend", async () => {
    const engine = new WebSpeechSynthesisTtsEngine();
    const p = engine.speak({ text: "hello" });
    await flushMutexJob();
    expect(lastUtterance).toBeTruthy();
    lastUtterance!.onend?.();
    const out = await p;
    expect(out.terminalStatus).toBe("completed");
    expect(out.taskId).toMatch(/^web-tts-/);
  });

  it("treats cancel as cancelled", async () => {
    const engine = new WebSpeechSynthesisTtsEngine();
    const p = engine.speak({ text: "hello" });
    await flushMutexJob();
    await engine.stop();
    lastUtterance!.onend?.();
    const out = await p;
    expect(out.terminalStatus).toBe("cancelled");
    expect(cancelFn).toHaveBeenCalled();
  });

  it("fails when no voices are available", async () => {
    getVoicesFn.mockReturnValue([]);
    vi.useFakeTimers();
    const engine = new WebSpeechSynthesisTtsEngine();
    const p = engine.speak({ text: "hello" });
    await flushMutexJob();
    await vi.advanceTimersByTimeAsync(2600);
    const out = await p;
    vi.useRealTimers();
    expect(out.terminalStatus).toBe("failed");
    expect(out.errorMessage).toBe("web_speech_unavailable");
  });
});
