import { Capacitor } from "@capacitor/core";
import { NativeAudio } from "@capgo/native-audio";

export interface SegmentPlayer {
  playFile(path: string): Promise<void>;
  stop(): Promise<void>;
}

function toFileUrl(path: string): string {
  const p = path.trim();
  if (!p) {
    return p;
  }
  if (p.startsWith("file://")) {
    return p;
  }
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `file://${normalized}`;
}

/**
 * Plays one local file at a time via @capgo/native-audio (file:// + isUrl).
 */
export function createCapgoNativeAudioSegmentPlayer(): SegmentPlayer {
  let active: { assetId: string; remove: () => Promise<void> } | null = null;

  const cleanup = async (): Promise<void> => {
    if (!active) {
      return;
    }
    const { assetId, remove } = active;
    active = null;
    try {
      await remove();
    } catch {
      // listener cleanup is best-effort
    }
    try {
      await NativeAudio.stop({ assetId });
    } catch {
      // stop before unload
    }
    try {
      await NativeAudio.unload({ assetId });
    } catch {
      // unload is best-effort
    }
  };

  return {
    async playFile(path: string): Promise<void> {
      await cleanup();
      const assetId = `dawn-tts-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const assetPath = toFileUrl(path);

      let settled = false;
      let completeResolve!: () => void;
      const completeWait = new Promise<void>((resolve) => {
        completeResolve = resolve;
      });

      const handle = await NativeAudio.addListener("complete", (ev) => {
        if (ev.assetId !== assetId || settled) {
          return;
        }
        settled = true;
        completeResolve();
      });
      active = {
        assetId,
        remove: () => handle.remove(),
      };

      try {
        await NativeAudio.preload({
          assetPath,
          assetId,
          isUrl: true,
        });
        await NativeAudio.play({ assetId });
        await completeWait;
      } finally {
        await cleanup();
      }
    },

    async stop(): Promise<void> {
      await cleanup();
    },
  };
}

/**
 * Fallback: Capacitor.convertFileSrc + hidden HTMLAudioElement (e.g. if NativeAudio fails).
 */
export function createHtmlAudioSegmentPlayer(): SegmentPlayer {
  let audio: HTMLAudioElement | null = null;

  const teardown = (): void => {
    if (!audio) {
      return;
    }
    try {
      audio.pause();
    } catch {
      // ignore
    }
    audio.removeAttribute("src");
    try {
      audio.load();
    } catch {
      // ignore
    }
    audio = null;
  };

  return {
    async playFile(path: string): Promise<void> {
      teardown();
      const url = Capacitor.convertFileSrc(toFileUrl(path));
      const el = new Audio();
      el.preload = "auto";
      el.src = url;
      el.style.display = "none";
      audio = el;

      await new Promise<void>((resolve, reject) => {
        const onEnded = (): void => {
          el.removeEventListener("ended", onEnded);
          el.removeEventListener("error", onError);
          resolve();
        };
        const onError = (): void => {
          el.removeEventListener("ended", onEnded);
          el.removeEventListener("error", onError);
          reject(new Error("html audio playback failed"));
        };
        el.addEventListener("ended", onEnded);
        el.addEventListener("error", onError);
        void el.play().catch((e) => {
          el.removeEventListener("ended", onEnded);
          el.removeEventListener("error", onError);
          reject(e instanceof Error ? e : new Error(String(e)));
        });
      });
      teardown();
    },

    async stop(): Promise<void> {
      teardown();
    },
  };
}

export function createDefaultSegmentPlayer(): SegmentPlayer {
  return createCapgoNativeAudioSegmentPlayer();
}
