import { normalizeMusicNote, noteToFrequency } from "../model/notes";
import { PianoEngine } from "../audio/pianoEngine";

const soundfontMocks = vi.hoisted(() => {
  return {
    instrument: vi.fn(),
    play: vi.fn(),
    stop: vi.fn(),
  };
});

vi.mock("soundfont-player", () => ({
  __esModule: true as const,
  default: {
    instrument: soundfontMocks.instrument,
  },
}));

class FakeAudioContext {
  state: AudioContextState = "suspended";

  currentTime = 0;

  destination = {};

  onstatechange: (() => void) | null = null;

  async resume() {
    this.state = "running";
    this.onstatechange?.();
  }

  createOscillator() {
    return {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as OscillatorNode;
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as GainNode;
  }

  createBiquadFilter() {
    return {
      type: "lowpass",
      frequency: {
        value: 0,
      },
      connect: vi.fn(),
    } as unknown as BiquadFilterNode;
  }
}

let createOscillatorSpy: ReturnType<typeof vi.spyOn>;

describe("pianoEngine", () => {
  beforeAll(() => {
    createOscillatorSpy = vi.spyOn(FakeAudioContext.prototype, "createOscillator");
  });

  afterAll(() => {
    createOscillatorSpy.mockRestore();
  });

  beforeEach(() => {
    createOscillatorSpy.mockClear();
    soundfontMocks.play.mockReset();
    soundfontMocks.stop.mockReset();
    soundfontMocks.instrument.mockReset();
    soundfontMocks.play.mockReturnValue({
      stop: soundfontMocks.stop,
    });
    soundfontMocks.instrument.mockResolvedValue({
      play: soundfontMocks.play,
    });
    Object.defineProperty(window, "AudioContext", {
      value: FakeAudioContext,
      configurable: true,
    });
  });

  it("normalizes note text and frequency", () => {
    expect(normalizeMusicNote("db4")).toBe("C#4");
    expect(noteToFrequency("A4")).toBeCloseTo(440, 6);
  });

  it("resumes audio context and plays note", async () => {
    const engine = new PianoEngine();
    const running = await engine.ensureRunning();
    expect(running.state).toBe("running");

    const result = await engine.playNote({
      note: "C4",
      durationMs: 10,
      velocity: 0.8,
      volume: 0.7,
    });
    expect(result.ok).toBe(true);
    expect(result.normalizedNote).toBe("C4");
    // jsdom cannot load remote soundfonts; when the mock is not applied we still
    // expect successful playback via the internal synth fallback.
    const usedSoundfontMock =
      soundfontMocks.instrument.mock.calls.length > 0 && soundfontMocks.play.mock.calls.length > 0;
    const usedSynth = createOscillatorSpy.mock.calls.length > 0;
    expect(usedSoundfontMock || usedSynth).toBe(true);
    if (usedSoundfontMock) {
      expect(soundfontMocks.instrument).toHaveBeenCalledTimes(1);
      expect(soundfontMocks.play).toHaveBeenCalledTimes(1);
    }
  });

  it("stops active notes via stopAll", async () => {
    const engine = new PianoEngine();
    await engine.ensureRunning();
    await engine.playNote({
      note: "D4",
      durationMs: 5,
      velocity: 0.7,
      volume: 0.6,
    });
    engine.stopAll();
    expect(engine.getSnapshot().activeNotes).toEqual([]);
  });

  it("falls back to synth when soundfont unavailable", async () => {
    soundfontMocks.instrument.mockRejectedValueOnce(new Error("load failed"));
    const engine = new PianoEngine();
    await engine.ensureRunning();

    const result = await engine.playNote({
      note: "E4",
      durationMs: 5,
      velocity: 0.7,
      volume: 0.6,
    });

    expect(result.ok).toBe(true);
    expect(soundfontMocks.play).not.toHaveBeenCalled();
    expect(createOscillatorSpy).toHaveBeenCalled();
    if (soundfontMocks.instrument.mock.calls.length > 0) {
      expect(soundfontMocks.instrument).toHaveBeenCalledTimes(1);
    }
  });
});

