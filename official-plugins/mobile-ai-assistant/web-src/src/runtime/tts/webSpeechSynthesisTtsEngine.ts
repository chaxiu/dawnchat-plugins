import type { MobileTtsEngine, MobileTtsSpeakInput, MobileTtsStatusSnapshot, SpeakOutcome } from "./types";
import { voiceHintToBcp47Lang } from "./voiceLang";

function createTaskId(): string {
  return `web-tts-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function pickVoiceForHint(
  synth: SpeechSynthesis,
  hint: string | undefined,
  lang: string
): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices.length) {
    return null;
  }
  const trimmed = typeof hint === "string" ? hint.trim() : "";
  if (trimmed) {
    const lower = trimmed.toLowerCase();
    const byUri = voices.find((v) => v.voiceURI.toLowerCase().includes(lower));
    if (byUri) {
      return byUri;
    }
    const byName = voices.find((v) => v.name.toLowerCase().includes(lower));
    if (byName) {
      return byName;
    }
  }
  const langLower = lang.toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === langLower) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(langLower.split("-")[0] || "")) ||
    null
  );
}

function isWebSpeechAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export class WebSpeechSynthesisTtsEngine implements MobileTtsEngine {
  readonly engineId = "web-speech-synthesis";

  private mutex: Promise<void> = Promise.resolve();

  private phase: MobileTtsStatusSnapshot["status"] = "idle";
  private activeTaskId: string | null = null;
  private lastError: string | undefined;
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
    if (!isWebSpeechAvailable()) {
      return {
        taskId,
        terminalStatus: "failed",
        errorMessage: "web_speech_unavailable",
      };
    }
    if (this.stopGeneration !== startedAt) {
      return { taskId, terminalStatus: "cancelled" };
    }

    const synth = window.speechSynthesis;

    if (input.interrupt !== false) {
      synth.cancel();
    }
    if (this.stopGeneration !== startedAt) {
      return { taskId, terminalStatus: "cancelled" };
    }

    this.phase = "speaking";
    this.activeTaskId = taskId;
    this.lastError = undefined;

    const langFromVoice = voiceHintToBcp47Lang(input.voice);
    const lang = langFromVoice || (typeof navigator !== "undefined" ? navigator.language : "en-US");

    await this.ensureVoicesLoaded(synth);

    if (!synth.getVoices().length) {
      this.phase = "error";
      this.activeTaskId = null;
      this.lastError = "web_speech_unavailable";
      return {
        taskId,
        terminalStatus: "failed",
        errorMessage: "web_speech_unavailable",
      };
    }

    return new Promise<SpeakOutcome>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      const picked = pickVoiceForHint(synth, input.voice, lang);
      if (picked) {
        utterance.voice = picked;
      }

      const finish = (outcome: SpeakOutcome) => {
        this.phase = outcome.terminalStatus === "failed" ? "error" : "idle";
        this.activeTaskId = null;
        if (outcome.terminalStatus === "failed") {
          this.lastError = outcome.errorMessage;
        }
        resolve(outcome);
      };

      utterance.onend = () => {
        if (this.stopGeneration !== startedAt) {
          finish({ taskId, terminalStatus: "cancelled" });
          return;
        }
        finish({ taskId, terminalStatus: "completed" });
      };

      utterance.onerror = (event) => {
        if (this.stopGeneration !== startedAt) {
          finish({ taskId, terminalStatus: "cancelled" });
          return;
        }
        const code = (event as SpeechSynthesisErrorEvent).error;
        finish({
          taskId,
          terminalStatus: "failed",
          errorMessage: String(code || "web_speech_error"),
        });
      };

      synth.speak(utterance);
    });
  }

  /** Some browsers populate voices asynchronously (Chrome). */
  private ensureVoicesLoaded(synth: SpeechSynthesis): Promise<void> {
    if (synth.getVoices().length > 0) {
      return Promise.resolve();
    }
    const schedule = globalThis.setTimeout.bind(globalThis);
    const clear = globalThis.clearTimeout.bind(globalThis);
    return new Promise((resolve) => {
      const timeoutMs = 2500;
      const timer = schedule(() => {
        synth.removeEventListener("voiceschanged", onVoices);
        resolve();
      }, timeoutMs);
      const onVoices = () => {
        clear(timer);
        synth.removeEventListener("voiceschanged", onVoices);
        resolve();
      };
      synth.addEventListener("voiceschanged", onVoices);
      try {
        synth.getVoices();
      } catch {
        clear(timer);
        synth.removeEventListener("voiceschanged", onVoices);
        resolve();
      }
    });
  }

  async stop(_reason?: string): Promise<void> {
    this.stopGeneration += 1;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
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
