import { describe, expect, it, vi } from "vitest";

import { createMobileHostVoiceAdapter } from "../mobileHostVoiceAdapter";
import type { MobileTtsEngine, MobileTtsStatusSnapshot } from "../types";

function makeMockEngine(overrides: Partial<MobileTtsEngine> & { engineId?: string }): MobileTtsEngine {
  return {
    engineId: overrides.engineId ?? "mock-tts",
    speak: overrides.speak ?? vi.fn(),
    stop: overrides.stop ?? vi.fn().mockResolvedValue(undefined),
    getStatus:
      overrides.getStatus ??
      vi.fn().mockResolvedValue({ status: "idle" } satisfies MobileTtsStatusSnapshot),
  };
}

describe("createMobileHostVoiceAdapter", () => {
  it("returns ok with task_id when engine completes", async () => {
    const speak = vi.fn().mockResolvedValue({
      taskId: "t-1",
      terminalStatus: "completed",
    });
    const voice = createMobileHostVoiceAdapter(makeMockEngine({ speak }));
    const result = await voice.speak!({ text: "hello" });
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      task_id: "t-1",
      status: "completed",
      engine: "mock-tts",
    });
  });

  it("returns cancelled shape when engine reports cancelled", async () => {
    const speak = vi.fn().mockResolvedValue({
      taskId: "t-2",
      terminalStatus: "cancelled",
    });
    const voice = createMobileHostVoiceAdapter(makeMockEngine({ speak }));
    const result = await voice.speak!({ text: "hello" });
    expect(result.ok).toBe(false);
    expect(result.data).toMatchObject({
      task_id: "t-2",
      status: "cancelled",
      engine: "mock-tts",
    });
  });

  it("rejects empty text", async () => {
    const speak = vi.fn();
    const voice = createMobileHostVoiceAdapter(makeMockEngine({ speak }));
    const result = await voice.speak!({ text: "   " });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe("invalid_arguments");
    expect(speak).not.toHaveBeenCalled();
  });

  it("stop delegates to engine", async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    const getStatus = vi.fn().mockResolvedValue({
      status: "idle",
      taskId: "tid",
    } satisfies MobileTtsStatusSnapshot);
    const voice = createMobileHostVoiceAdapter(makeMockEngine({ stop, getStatus }));
    const result = await voice.stop!({ task_id: "tid" });
    expect(stop).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});
