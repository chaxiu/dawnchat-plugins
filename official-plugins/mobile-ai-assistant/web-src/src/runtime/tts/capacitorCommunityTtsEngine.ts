import { QueueStrategy, TextToSpeech } from "@capacitor-community/text-to-speech";

import type { MobileTtsEngine, MobileTtsSpeakInput, MobileTtsStatusSnapshot, SpeakOutcome } from "./types";
import { voiceHintToBcp47Lang } from "./voiceLang";

function createTaskId(): string {
  return `cap-tts-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class CapacitorCommunityTtsEngine implements MobileTtsEngine {
  readonly engineId = "capacitor-community-text-to-speech";

  private mutex: Promise<void> = Promise.resolve();

  private phase: MobileTtsStatusSnapshot["status"] = "idle";
  private activeTaskId: string | null = null;
  private lastError: string | undefined;
  /** Incremented on every `stop()`; compared to a snapshot taken when `speak()` is invoked (covers mutex delay). */
  private stopGeneration = 0;

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
      await TextToSpeech.stop();
    }
    if (this.stopGeneration !== startedAt) {
      return { taskId, terminalStatus: "cancelled" };
    }

    this.phase = "speaking";
    this.activeTaskId = taskId;
    this.lastError = undefined;

    const lang = voiceHintToBcp47Lang(input.voice);

    try {
      await TextToSpeech.speak({
        text,
        lang,
        queueStrategy: QueueStrategy.Flush,
      });
      if (this.stopGeneration !== startedAt) {
        this.phase = "idle";
        this.activeTaskId = null;
        return { taskId, terminalStatus: "cancelled" };
      }
      this.phase = "idle";
      this.activeTaskId = null;
      return { taskId, terminalStatus: "completed" };
    } catch (error) {
      const message = String(error);
      this.lastError = message;
      this.phase = "error";
      this.activeTaskId = null;
      if (this.stopGeneration !== startedAt) {
        return { taskId, terminalStatus: "cancelled" };
      }
      return { taskId, terminalStatus: "failed", errorMessage: message };
    }
  }

  async stop(_reason?: string): Promise<void> {
    this.stopGeneration += 1;
    try {
      await TextToSpeech.stop();
    } catch {
      // stop is best-effort
    }
  }

  async getStatus(): Promise<MobileTtsStatusSnapshot> {
    return {
      status: this.phase,
      taskId: this.activeTaskId || undefined,
      error: this.lastError,
    };
  }
}
