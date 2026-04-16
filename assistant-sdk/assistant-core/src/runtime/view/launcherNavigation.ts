import { ref, type Ref } from "vue";
import type { Router } from "vue-router";

import { ASSISTANT_LAUNCHER_ROUTE, ASSISTANT_SPLASH_ROUTE } from "./assistantNavigationRoutes";

/** Last non-auxiliary route fullPath for Launcher "Back". */
export const launcherContentExitFullPath: Ref<string | null> = ref(null);

const installedNav = new WeakMap<Router, true>();

/**
 * Strip hash/query for comparing assistant routes (hash mode uses `/#/views/...`).
 */
export function normalizeAssistantNavKey(pathOrFullPath: string): string {
  let segment = pathOrFullPath.trim();
  const hashIdx = segment.indexOf("#");
  if (hashIdx !== -1) {
    segment = segment.slice(hashIdx + 1);
  }
  const q = segment.indexOf("?");
  if (q !== -1) {
    segment = segment.slice(0, q);
  }
  if (segment.length > 1 && segment.endsWith("/")) {
    segment = segment.slice(0, -1);
  }
  return segment || "/";
}

export interface InstallAssistantLauncherNavigationOptions {
  /** Extra routes (normalized) that should not overwrite {@link launcherContentExitFullPath}. */
  auxiliaryNavKeys?: string[];
}

function defaultAuxiliaryKeys(extra?: string[]): Set<string> {
  const set = new Set<string>([
    normalizeAssistantNavKey(ASSISTANT_LAUNCHER_ROUTE),
    normalizeAssistantNavKey(ASSISTANT_SPLASH_ROUTE),
  ]);
  for (const e of extra ?? []) {
    set.add(normalizeAssistantNavKey(e));
  }
  return set;
}

/**
 * Tracks the last "content" route so Launcher Back can return without relying on browser history depth.
 * Safe to call once per Router instance (subsequent calls are no-ops).
 */
export function installAssistantLauncherNavigation(
  router: Router,
  options?: InstallAssistantLauncherNavigationOptions
): void {
  if (installedNav.has(router)) {
    return;
  }
  installedNav.set(router, true);
  const auxiliary = defaultAuxiliaryKeys(options?.auxiliaryNavKeys);

  router.afterEach((to) => {
    const key = normalizeAssistantNavKey(to.fullPath);
    if (auxiliary.has(key)) {
      return;
    }
    launcherContentExitFullPath.value = to.fullPath;
  });
}

export function getLauncherContentExitFullPath(): string | null {
  return launcherContentExitFullPath.value;
}

/** Vitest / harness only: clears the tracked exit route between cases. */
export function resetLauncherContentExitForTests(): void {
  launcherContentExitFullPath.value = null;
}

/**
 * Navigate back from the Launcher page to the last tracked content route.
 */
/**
 * Whether Launcher should show a Back control: there is a tracked non-launcher content route
 * distinct from the current location (e.g. cold start on launcher only → false).
 */
export function hasLauncherBackTarget(router: Router): boolean {
  const target = launcherContentExitFullPath.value;
  if (!target?.trim()) {
    return false;
  }
  const currentKey = normalizeAssistantNavKey(router.currentRoute.value.fullPath);
  return normalizeAssistantNavKey(target) !== currentKey;
}

export async function goBackFromAssistantLauncher(router: Router): Promise<void> {
  if (!hasLauncherBackTarget(router)) {
    return;
  }
  const target = launcherContentExitFullPath.value;
  if (!target) {
    return;
  }
  await router.push(target);
}
