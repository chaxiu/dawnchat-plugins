import { describe, expect, it } from "vitest";

import {
  LAUNCHER_FAB_STORAGE_VERSION,
  launcherFabPixelsToRatios,
  launcherFabRatiosToPixels,
  launcherFabStorageKey,
  parseLauncherFabPosition,
} from "../launcherFabPosition";

describe("launcherFabPosition", () => {
  it("builds a stable storage key from persistence scope", () => {
    expect(launcherFabStorageKey("plugin::session.x")).toBe(
      "assistant.launcherFab.pos.v1:plugin::session.x"
    );
  });

  it("round-trips ratios through pixels", () => {
    const pos = {
      version: LAUNCHER_FAB_STORAGE_VERSION,
      xRatio: 0.5,
      yRatio: 0.25,
    } as const;
    const fab = 48;
    const bottom = 80;
    const w = 400;
    const h = 800;
    const { left, top } = launcherFabRatiosToPixels(pos, w, h, fab, bottom);
    const back = launcherFabPixelsToRatios(left, top, w, h, fab, bottom);
    expect(back.xRatio).toBeCloseTo(0.5, 5);
    expect(back.yRatio).toBeCloseTo(0.25, 5);
  });

  it("parses stored JSON", () => {
    const raw = JSON.stringify({
      version: LAUNCHER_FAB_STORAGE_VERSION,
      xRatio: 0.1,
      yRatio: 0.9,
    });
    expect(parseLauncherFabPosition(raw)).toEqual({
      version: LAUNCHER_FAB_STORAGE_VERSION,
      xRatio: 0.1,
      yRatio: 0.9,
    });
  });

  it("returns null for invalid JSON", () => {
    expect(parseLauncherFabPosition("{")).toBeNull();
  });
});
