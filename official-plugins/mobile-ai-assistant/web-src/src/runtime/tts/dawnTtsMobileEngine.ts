import type { DawnTtsPlugin } from "@dawnchat/capacitor-dawn-tts";

import type { SegmentPlayer } from "./segmentPlayer";
import { splitTtsSegments } from "./splitTtsSegments";
import type { MobileTtsEngine, MobileTtsSpeakInput, MobileTtsStatusSnapshot, SpeakOutcome } from "./types";

function createTaskId(): string {
  return `dawn-tts-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class SpeakCancelledError extends Error {
  readonly code = "SPEAK_CANCELLED";
  constructor() {
    super("speak cancelled");
    this.name = "SpeakCancelledError";
  }
}

function mapSynthError(err: unknown): string {
  const raw = String(err);
  if (/not_authenticated|401|unauthor/i.test(raw)) {
    return "未登录或会话已失效，无法使用语音合成";
  }
  return raw;
}

export interface DawnTtsMobileEngineOptions {
  dawn: DawnTtsPlugin;
  segmentPlayer: SegmentPlayer;
}

/**
 * Dawn-TTS on device: split → synthesize segments → queue play with lookahead prefetch.
 * Mutex + stopGeneration match {@link CapacitorCommunityTtsEngine}.
 */
export class DawnTtsMobileEngine implements MobileTtsEngine {
  readonly engineId = "dawn-tts-mobile";

  private readonly dawn: DawnTtsPlugin;
  private readonly segmentPlayer: SegmentPlayer;

  private mutex: Promise<void> = Promise.resolve();

  private phase: MobileTtsStatusSnapshot["status"] = "idle";
  private activeTaskId: string | null = null;
  private lastError: string | undefined;
  private stopGeneration = 0;

  constructor(options: DawnTtsMobileEngineOptions) {
    this.dawn = options.dawn;
    this.segmentPlayer = options.segmentPlayer;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.mutex.then(fn, fn);
    this.mutex = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async speak(input: MobileTtsSpeakInput): Promise<SpeakOutcome> {
    const taskId = createTaskId();
    const startedAt = this.stopGeneration;
    return this.enqueue(() => this.speakExclusive(input, startedAt, taskId));
  }

  private async speakExclusive(
    input: MobileTtsSpeakInput,
    startedAt: number,
    taskId: string
  ): Promise<SpeakOutcome> {
    const text = String(input.text || "").trim();
    if (!text) {
      return { taskId, terminalStatus: "failed", errorMessage: "text is empty" };
    }
    if (this.stopGeneration !== startedAt) {
      return { taskId, terminalStatus: "cancelled" };
    }

    if (input.interrupt !== false) {
      await this.segmentPlayer.stop().catch(() => undefined);
    }
    if (this.stopGeneration !== startedAt) {
      return { taskId, terminalStatus: "cancelled" };
    }

    this.phase = "speaking";
    this.activeTaskId = taskId;
    this.lastError = undefined;

    const voice = typeof input.voice === "string" ? input.voice : undefined;
    const segments = splitTtsSegments(text);
    if (segments.length === 0) {
      this.phase = "idle";
      this.activeTaskId = null;
      return { taskId, terminalStatus: "failed", errorMessage: "text is empty after split" };
    }

    const synthPath = async (segmentText: string): Promise<string> => {
      if (this.stopGeneration !== startedAt) {
        throw new SpeakCancelledError();
      }
      const res = await this.dawn.synthesizeToFile({
        text: segmentText,
        voice,
      });
      if (this.stopGeneration !== startedAt) {
        throw new SpeakCancelledError();
      }
      return res.path;
    };

    try {
      let prefetch: Promise<string> | null = null;

      const schedulePrefetch = (segmentIndex: number): void => {
        if (segmentIndex + 1 >= segments.length) {
          prefetch = null;
          return;
        }
        const nextText = segments[segmentIndex + 1]!;
        prefetch = synthPath(nextText);
      };

      let path = await synthPath(segments[0]!);
      schedulePrefetch(0);

      for (let i = 0; i < segments.length; i++) {
        if (this.stopGeneration !== startedAt) {
          this.phase = "idle";
          this.activeTaskId = null;
          await this.segmentPlayer.stop();
          return { taskId, terminalStatus: "cancelled" };
        }

        if (i > 0) {
          path = await (prefetch ?? synthPath(segments[i]!));
          schedulePrefetch(i);
        }

        await this.segmentPlayer.playFile(path);

        if (this.stopGeneration !== startedAt) {
          this.phase = "idle";
          this.activeTaskId = null;
          await this.segmentPlayer.stop();
          return { taskId, terminalStatus: "cancelled" };
        }
      }

      if (this.stopGeneration !== startedAt) {
        this.phase = "idle";
        this.activeTaskId = null;
        return { taskId, terminalStatus: "cancelled" };
      }
      this.phase = "idle";
      this.activeTaskId = null;
      return { taskId, terminalStatus: "completed" };
    } catch (error) {
      await this.segmentPlayer.stop().catch(() => undefined);
      if (error instanceof SpeakCancelledError || this.stopGeneration !== startedAt) {
        this.phase = "idle";
        this.activeTaskId = null;
        return { taskId, terminalStatus: "cancelled" };
      }
      const message = mapSynthError(error);
      this.lastError = message;
      this.phase = "error";
      this.activeTaskId = null;
      if (this.stopGeneration !== startedAt) {
        return { taskId, terminalStatus: "cancelled" };
      }
      return { taskId, terminalStatus: "failed", errorMessage: message };
    }
  }

  private async stopInternal(): Promise<void> {
    this.stopGeneration += 1;
    try {
      await this.segmentPlayer.stop();
    } catch {
      // best-effort
    }
  }

  async stop(_reason?: string): Promise<void> {
    await this.stopInternal();
  }

  async getStatus(): Promise<MobileTtsStatusSnapshot> {
    return {
      status: this.phase,
      taskId: this.activeTaskId || undefined,
      error: this.lastError,
    };
  }
}
