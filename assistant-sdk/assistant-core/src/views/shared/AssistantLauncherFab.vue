<script setup lang="ts">
import { LayoutGrid } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ASSISTANT_LAUNCHER_ROUTE, ASSISTANT_SPLASH_ROUTE } from "../../runtime/view/assistantNavigationRoutes";
import {
  LAUNCHER_FAB_STORAGE_VERSION,
  launcherFabPixelsToRatios,
  launcherFabRatiosToPixels,
  launcherFabStorageKey,
  parseLauncherFabPosition,
  type LauncherFabPositionV1,
} from "../../runtime/view/launcherFabPosition";
import { normalizeAssistantNavKey } from "../../runtime/view/launcherNavigation";

const props = defineProps<{
  /** IndexedDB / workspace scope suffix; must match {@link ComposeAssistantCoreRuntimeOptions.persistenceScope}. */
  persistenceScope: string;
}>();

const FAB_SIZE = 48;

const DEFAULT_POS: LauncherFabPositionV1 = {
  version: LAUNCHER_FAB_STORAGE_VERSION,
  xRatio: 0.88,
  yRatio: 0.72,
};

const route = useRoute();
const router = useRouter();

const isHidden = computed(() => {
  const key = normalizeAssistantNavKey(route.fullPath);
  return (
    key === normalizeAssistantNavKey(ASSISTANT_LAUNCHER_ROUTE)
    || key === normalizeAssistantNavKey(ASSISTANT_SPLASH_ROUTE)
  );
});

const position = ref<LauncherFabPositionV1>({ ...DEFAULT_POS });
const dragging = ref(false);
const suppressNextClick = ref(false);

const fabStyle = ref<Record<string, string>>({});

function readBottomSafePx(): number {
  if (typeof window === "undefined") {
    return 16;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--assistant-chat-dock-peek-height")
    .trim();
  const n = Number.parseFloat(raw);
  const dock = Number.isFinite(n) ? n : 0;
  return dock + 12;
}

function syncFabStyle() {
  if (typeof window === "undefined") {
    return;
  }
  const bottomSafe = readBottomSafePx();
  const { left, top } = launcherFabRatiosToPixels(
    position.value,
    window.innerWidth,
    window.innerHeight,
    FAB_SIZE,
    bottomSafe
  );
  fabStyle.value = {
    position: "fixed",
    left: `${left}px`,
    top: `${top}px`,
    width: `${FAB_SIZE}px`,
    height: `${FAB_SIZE}px`,
    zIndex: "9999",
  };
}

function loadFromStorage() {
  if (typeof localStorage === "undefined") {
    return;
  }
  const key = launcherFabStorageKey(props.persistenceScope);
  const parsed = parseLauncherFabPosition(localStorage.getItem(key));
  position.value = parsed ?? { ...DEFAULT_POS };
}

function persistPosition() {
  if (typeof localStorage === "undefined") {
    return;
  }
  const key = launcherFabStorageKey(props.persistenceScope);
  localStorage.setItem(key, JSON.stringify(position.value));
}

function onFabClick(e: MouseEvent) {
  if (suppressNextClick.value) {
    suppressNextClick.value = false;
    e.preventDefault();
    return;
  }
  void router.push(ASSISTANT_LAUNCHER_ROUTE);
}

let activePointerId: number | null = null;
let dragStartClientX = 0;
let dragStartClientY = 0;
let dragStartLeft = 0;
let dragStartTop = 0;

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) {
    return;
  }
  suppressNextClick.value = false;
  dragging.value = true;
  activePointerId = e.pointerId;
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  dragStartClientX = e.clientX;
  dragStartClientY = e.clientY;
  const bottomSafe = readBottomSafePx();
  const { left, top } = launcherFabRatiosToPixels(
    position.value,
    window.innerWidth,
    window.innerHeight,
    FAB_SIZE,
    bottomSafe
  );
  dragStartLeft = left;
  dragStartTop = top;
  e.preventDefault();
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== activePointerId) {
    return;
  }
  const dx = e.clientX - dragStartClientX;
  const dy = e.clientY - dragStartClientY;
  const bottomSafe = readBottomSafePx();
  const nextLeft = dragStartLeft + dx;
  const nextTop = dragStartTop + dy;
  position.value = launcherFabPixelsToRatios(
    nextLeft,
    nextTop,
    window.innerWidth,
    window.innerHeight,
    FAB_SIZE,
    bottomSafe
  );
  syncFabStyle();
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerId !== activePointerId) {
    return;
  }
  const moved =
    Math.abs(e.clientX - dragStartClientX) + Math.abs(e.clientY - dragStartClientY) > 8;
  suppressNextClick.value = moved;
  dragging.value = false;
  activePointerId = null;
  try {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  } catch {
    // ignore
  }
  persistPosition();
}

function onResize() {
  syncFabStyle();
}

watch(
  () => props.persistenceScope,
  () => {
    loadFromStorage();
    syncFabStyle();
  }
);

onMounted(() => {
  loadFromStorage();
  syncFabStyle();
  window.addEventListener("resize", onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onResize);
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  if (window.visualViewport) {
    window.visualViewport.removeEventListener("resize", onResize);
  }
});
</script>

<template>
  <button
    v-if="!isHidden"
    type="button"
    class="assistant-launcher-fab"
    :class="{ 'assistant-launcher-fab--dragging': dragging }"
    :style="fabStyle"
    aria-label="Open app launcher"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @click="onFabClick"
  >
    <LayoutGrid :size="24" aria-hidden="true" />
  </button>
</template>

<style scoped>
.assistant-launcher-fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  touch-action: none;
  backdrop-filter: blur(8px);
}

.assistant-launcher-fab:hover {
  border-color: rgba(59, 130, 246, 0.55);
}

.assistant-launcher-fab--dragging {
  cursor: grabbing;
  opacity: 0.92;
}
</style>
