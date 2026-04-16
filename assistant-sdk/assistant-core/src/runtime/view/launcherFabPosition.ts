export const LAUNCHER_FAB_STORAGE_VERSION = 1 as const;

export interface LauncherFabPositionV1 {
  version: typeof LAUNCHER_FAB_STORAGE_VERSION;
  /** 0–1, horizontal anchor (left edge of FAB as ratio of viewport width). */
  xRatio: number;
  /** 0–1, vertical anchor (top edge of FAB as ratio of viewport height). */
  yRatio: number;
}

export function launcherFabStorageKey(persistenceScope: string): string {
  const safe = persistenceScope.trim() || "default";
  return `assistant.launcherFab.pos.v${LAUNCHER_FAB_STORAGE_VERSION}:${safe}`;
}

export function parseLauncherFabPosition(raw: string | null): LauncherFabPositionV1 | null {
  if (!raw) {
    return null;
  }
  try {
    const v = JSON.parse(raw) as Partial<LauncherFabPositionV1>;
    if (v?.version !== LAUNCHER_FAB_STORAGE_VERSION) {
      return null;
    }
    if (typeof v.xRatio !== "number" || typeof v.yRatio !== "number") {
      return null;
    }
    if (!Number.isFinite(v.xRatio) || !Number.isFinite(v.yRatio)) {
      return null;
    }
    return { version: LAUNCHER_FAB_STORAGE_VERSION, xRatio: v.xRatio, yRatio: v.yRatio };
  } catch {
    return null;
  }
}

export function clampRatio(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(1, Math.max(0, n));
}

/** Convert stored ratios to pixel `left` / `top` (fixed to viewport). */
export function launcherFabRatiosToPixels(
  pos: LauncherFabPositionV1,
  viewportW: number,
  viewportH: number,
  fabSize: number,
  bottomSafePx: number
): { left: number; top: number } {
  const maxX = Math.max(0, viewportW - fabSize);
  const maxY = Math.max(0, viewportH - fabSize - bottomSafePx);
  return {
    left: clampRatio(pos.xRatio) * maxX,
    top: clampRatio(pos.yRatio) * maxY,
  };
}

/** Convert pixel position to storable ratios within the draggable box. */
export function launcherFabPixelsToRatios(
  left: number,
  top: number,
  viewportW: number,
  viewportH: number,
  fabSize: number,
  bottomSafePx: number
): LauncherFabPositionV1 {
  const maxX = Math.max(1, viewportW - fabSize);
  const maxY = Math.max(1, viewportH - fabSize - bottomSafePx);
  return {
    version: LAUNCHER_FAB_STORAGE_VERSION,
    xRatio: clampRatio(left / maxX),
    yRatio: clampRatio(top / maxY),
  };
}
