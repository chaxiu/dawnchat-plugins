import { beforeEach, describe, expect, it, vi } from "vitest";

import { DawnTtsMobileEngine } from "../dawnTtsMobileEngine";
import type { SegmentPlayer } from "../segmentPlayer";

describe("DawnTtsMobileEngine", () => {
  const synthesizeMock = vi.fn();

  beforeEach(() => {
    synthesizeMock.mockReset();
  });

  function createDeferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }

  it("returns completed after all segments play", async () => {
    synthesizeMock.mockImplementation(async ({ text }: { text: string }) => ({
      path: `/tmp/${text}.mp3`,
    }));
    const player: SegmentPlayer = {
      playFile: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const engine = new DawnTtsMobileEngine({
      dawn: { synthesizeToFile: synthesizeMock },
      segmentPlayer: player,
    });
    const out = await engine.speak({ text: "Hello.", interrupt: false });
    expect(out.terminalStatus).toBe("completed");
    expect(synthesizeMock).toHaveBeenCalledTimes(1);
    expect(player.playFile).toHaveBeenCalledTimes(1);
  });

  it("starts synthesizing the next segment before current playback finishes", async () => {
    synthesizeMock.mockImplementation(async ({ text }: { text: string }) => ({
      path: `/cache/${text.replace(/\s+/g, "_")}.mp3`,
    }));

    const playStarted = createDeferred<void>();
    const playContinue = createDeferred<void>();
    let playCall = 0;
    const playFile = vi.fn(async () => {
      playCall += 1;
      if (playCall === 1) {
        playStarted.resolve();
        await playContinue.promise;
      }
    });
    const player: SegmentPlayer = {
      playFile,
      stop: vi.fn().mockResolvedValue(undefined),
    };

    const engine = new DawnTtsMobileEngine({
      dawn: { synthesizeToFile: synthesizeMock },
      segmentPlayer: player,
    });

    const text = "你好，DawnChat! Please review this change.";
    const speakPromise = engine.speak({ text, interrupt: false });

    await playStarted.promise;
    expect(synthesizeMock).toHaveBeenCalledTimes(2);
    expect(synthesizeMock.mock.calls.map((c) => c[0].text)).toEqual([
      "你好，DawnChat!",
      "Please review this change.",
    ]);

    playContinue.resolve();
    const out = await speakPromise;
    expect(out.terminalStatus).toBe("completed");
    expect(playFile).toHaveBeenCalledTimes(2);
  });

  it("returns cancelled when stop() runs during playback", async () => {
    const gate = createDeferred<void>();
    synthesizeMock.mockResolvedValue({ path: "/tmp/a.mp3" });
    const playFile = vi.fn(async () => {
      await gate.promise;
    });
    const player: SegmentPlayer = {
      playFile,
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const engine = new DawnTtsMobileEngine({
      dawn: { synthesizeToFile: synthesizeMock },
      segmentPlayer: player,
    });
    const speakPromise = engine.speak({ text: "One segment only.", interrupt: false });
    await vi.waitFor(() => expect(playFile).toHaveBeenCalled());
    await engine.stop();
    gate.resolve(undefined);
    const out = await speakPromise;
    expect(out.terminalStatus).toBe("cancelled");
    expect(player.stop).toHaveBeenCalled();
  });

  it("returns cancelled when stop() runs before mutex starts the utterance", async () => {
    synthesizeMock.mockImplementation(() => new Promise(() => undefined));
    const player: SegmentPlayer = {
      playFile: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const engine = new DawnTtsMobileEngine({
      dawn: { synthesizeToFile: synthesizeMock },
      segmentPlayer: player,
    });
    const speakPromise = engine.speak({ text: "queued", interrupt: false });
    await engine.stop();
    const out = await speakPromise;
    expect(out.terminalStatus).toBe("cancelled");
  });

  it("serializes two speak calls via mutex", async () => {
    synthesizeMock.mockImplementation(async ({ text }: { text: string }) => ({
      path: `/tmp/${text}.mp3`,
    }));
    const order: string[] = [];
    const player: SegmentPlayer = {
      playFile: vi.fn(async () => {
        order.push("play");
      }),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const engine = new DawnTtsMobileEngine({
      dawn: { synthesizeToFile: synthesizeMock },
      segmentPlayer: player,
    });
    const p1 = engine.speak({ text: "First.", interrupt: false });
    const p2 = engine.speak({ text: "Second.", interrupt: false });
    await Promise.all([p1, p2]);
    expect(order).toEqual(["play", "play"]);
  });

  it("maps auth-like errors to a readable message", async () => {
    synthesizeMock.mockRejectedValue(new Error("not_authenticated"));
    const engine = new DawnTtsMobileEngine({
      dawn: { synthesizeToFile: synthesizeMock },
      segmentPlayer: {
        playFile: vi.fn(),
        stop: vi.fn().mockResolvedValue(undefined),
      },
    });
    const out = await engine.speak({ text: "Hi.", interrupt: false });
    expect(out.terminalStatus).toBe("failed");
    expect(out.errorMessage).toMatch(/未登录|会话/);
  });
});
