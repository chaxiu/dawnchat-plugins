import Soundfont from "soundfont-player";

import { normalizeMusicNote, noteToFrequency } from "../model/notes";

export type PianoEngineState = "running" | "suspended" | "closed" | "uninitialized";

export interface PianoPlayInput {
  note: string;
  durationMs: number;
  velocity: number;
  volume: number;
}

export interface PianoEngineSnapshot {
  state: PianoEngineState;
  activeNotes: string[];
}

interface PlayingHandle {
  stop: (when?: number) => void;
}

type PianoBackendName = "soundfont" | "synth";

interface ActiveVoice {
  handle: PlayingHandle;
  backend: PianoBackendName;
}

type PianoEngineListener = (snapshot: PianoEngineSnapshot) => void;

interface PianoBackend {
  name: PianoBackendName;
  ensureReady: (ctx: AudioContext) => Promise<boolean>;
  play: (ctx: AudioContext, note: string, input: PianoPlayInput) => PlayingHandle | null;
}

function getAudioContextCtor():
  | (new () => AudioContext)
  | null {
  if (typeof window === "undefined") {
    return null;
  }
  const ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return ctor || null;
}

function waitMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, durationMs));
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class PianoEngine {
  private audioContext: AudioContext | null = null;

  private readonly soundfontBackend: PianoBackend;

  private readonly synthBackend: PianoBackend;

  private preferredBackend: PianoBackendName = "soundfont";

  private activeBackend: PianoBackendName = "soundfont";

  private activeVoices = new Map<string, ActiveVoice>();

  private listeners = new Set<PianoEngineListener>();

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  private getContextState(): PianoEngineState {
    if (!this.audioContext) {
      return "uninitialized";
    }
    if (this.audioContext.state === "running" || this.audioContext.state === "suspended" || this.audioContext.state === "closed") {
      return this.audioContext.state;
    }
    return "uninitialized";
  }

  private ensureContext(): AudioContext | null {
    if (this.audioContext && this.audioContext.state !== "closed") {
      return this.audioContext;
    }
    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      return null;
    }
    this.audioContext = new Ctor();
    this.audioContext.onstatechange = () => {
      this.notify();
    };
    this.notify();
    return this.audioContext;
  }

  private getBackend(name: PianoBackendName): PianoBackend {
    return name === "soundfont" ? this.soundfontBackend : this.synthBackend;
  }

  private async resolvePlaybackBackend(ctx: AudioContext): Promise<PianoBackend | null> {
    if (this.preferredBackend === "soundfont") {
      const soundfont = this.getBackend("soundfont");
      if (await soundfont.ensureReady(ctx)) {
        this.activeBackend = "soundfont";
        return soundfont;
      }
      const synth = this.getBackend("synth");
      if (await synth.ensureReady(ctx)) {
        this.activeBackend = "synth";
        return synth;
      }
      return null;
    }
    const preferred = this.getBackend(this.preferredBackend);
    if (await preferred.ensureReady(ctx)) {
      this.activeBackend = this.preferredBackend;
      return preferred;
    }
    return null;
  }

  constructor() {
    let loadedInstrument: null | {
      play: (note: string, when?: number, options?: { gain?: number; duration?: number }) => PlayingHandle;
    } = null;
    let loadPromise: Promise<void> | null = null;
    let instrumentContext: AudioContext | null = null;

    const getSoundfontUrl = (instrumentName: string, format: string): string => {
      return `/soundfonts/FluidR3_GM/${instrumentName}-${format}.js`;
    };

    this.soundfontBackend = {
      name: "soundfont",
      ensureReady: async (ctx: AudioContext): Promise<boolean> => {
        if (instrumentContext !== ctx) {
          loadedInstrument = null;
          loadPromise = null;
          instrumentContext = ctx;
        }
        if (loadedInstrument) {
          return true;
        }
        if (loadPromise) {
          await loadPromise;
          return loadedInstrument !== null;
        }
        const loader = Soundfont as unknown as {
          instrument: (
            audioContext: AudioContext,
            instrumentName: string,
            options?: Record<string, unknown>
          ) => Promise<{
            play: (note: string, when?: number, options?: { gain?: number; duration?: number }) => PlayingHandle;
          }>;
        };
        loadPromise = loader.instrument(ctx, "acoustic_grand_piano", {
          format: "mp3",
          soundfont: "FluidR3_GM",
          nameToUrl: (instrumentName: string, _soundfont: string, format: string) =>
            getSoundfontUrl(instrumentName, format),
        }).then((instrument) => {
          loadedInstrument = instrument;
          instrumentContext = ctx;
        }).catch(() => {
          loadedInstrument = null;
        }).finally(() => {
          loadPromise = null;
        });
        await loadPromise;
        return loadedInstrument !== null;
      },
      play: (_ctx: AudioContext, note: string, input: PianoPlayInput): PlayingHandle | null => {
        if (!loadedInstrument) {
          return null;
        }
        const durationSec = Math.max(0.02, input.durationMs / 1000);
        const gain = clamp(input.velocity, 0, 1) * clamp(input.volume, 0, 1);
        return loadedInstrument.play(note, _ctx.currentTime, {
          gain,
          duration: durationSec,
        });
      },
    };

    this.synthBackend = {
      name: "synth",
      ensureReady: async () => true,
      play: (ctx: AudioContext, note: string, input: PianoPlayInput): PlayingHandle | null => {
        const frequency = noteToFrequency(note);
        if (!frequency) {
          return null;
        }
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filterNode = ctx.createBiquadFilter();
        filterNode.type = "lowpass";
        filterNode.frequency.value = 1800;

        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(
          clamp(input.velocity, 0, 1) * clamp(input.volume, 0, 1),
          ctx.currentTime + 0.01
        );
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.max(0.02, input.durationMs / 1000));

        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();

        return {
          stop: (when?: number) => {
            try {
              const stopTime = typeof when === "number" ? when : ctx.currentTime;
              gainNode.gain.cancelScheduledValues(stopTime);
              gainNode.gain.setValueAtTime(0.0001, stopTime);
              oscillator.stop(stopTime);
              oscillator.disconnect();
              gainNode.disconnect();
            } catch {
              // ignored
            }
          },
        };
      },
    };
  }

  getSnapshot(): PianoEngineSnapshot {
    return {
      state: this.getContextState(),
      activeNotes: Array.from(this.activeVoices.keys()),
    };
  }

  subscribe(listener: PianoEngineListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async ensureRunning(): Promise<PianoEngineSnapshot> {
    const ctx = this.ensureContext();
    if (!ctx) {
      return this.getSnapshot();
    }
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        // ignored, caller checks state.
      }
    }
    this.notify();
    return this.getSnapshot();
  }

  async unlockWithGesture(): Promise<boolean> {
    const snapshot = await this.ensureRunning();
    return snapshot.state === "running";
  }

  async playNote(input: PianoPlayInput): Promise<{ ok: boolean; normalizedNote?: string }> {
    const normalizedNote = normalizeMusicNote(input.note);
    if (!normalizedNote) {
      return { ok: false };
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      return { ok: false };
    }
    if (ctx.state !== "running") {
      return { ok: false, normalizedNote };
    }
    const backend = await this.resolvePlaybackBackend(ctx);
    if (!backend) {
      return { ok: false, normalizedNote };
    }

    this.stopNote(normalizedNote);
    let handle = backend.play(ctx, normalizedNote, input);
    let selectedBackend = backend;
    if (!handle && backend.name === "soundfont") {
      const fallback = this.getBackend("synth");
      const fallbackReady = await fallback.ensureReady(ctx);
      if (fallbackReady) {
        handle = fallback.play(ctx, normalizedNote, input);
        if (handle) {
          selectedBackend = fallback;
          this.activeBackend = "synth";
        }
      }
    }
    if (!handle) {
      return { ok: false, normalizedNote };
    }
    this.activeVoices.set(normalizedNote, {
      handle,
      backend: selectedBackend.name,
    });
    this.notify();

    await waitMs(input.durationMs);
    this.stopNote(normalizedNote);
    return { ok: true, normalizedNote };
  }

  stopNote(note: string) {
    const voice = this.activeVoices.get(note);
    if (!voice) {
      return;
    }
    try {
      voice.handle.stop(this.audioContext?.currentTime || 0);
    } catch {
      // ignored.
    }
    this.activeVoices.delete(note);
    this.notify();
  }

  stopAll() {
    Array.from(this.activeVoices.keys()).forEach((note) => {
      this.stopNote(note);
    });
  }
}

let singleton: PianoEngine | null = null;

export function getPianoEngine(): PianoEngine {
  if (!singleton) {
    singleton = new PianoEngine();
  }
  return singleton;
}

