<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, watch } from "vue";

import { useCoordinatePlaneScene } from "./composables/useCoordinatePlaneScene";
import { useCoordinatePlaneBoardRuntime } from "./runtime/useCoordinatePlaneBoardRuntime";

const {
  isCoordinatePlaneActive,
  scene,
  stageTitle,
} = useCoordinatePlaneScene();

const {
  boardError,
  renderToken,
  setBoardContainer,
  syncBoard,
  mount,
  unmount,
  deactivate,
} = useCoordinatePlaneBoardRuntime({ scene });

const highlightLabels = computed(() =>
  scene.value?.highlights
    .filter((item) => item.label.length > 0)
    .map((item) => item.label) || []
);

watch(
  () => scene.value,
  async () => {
    await nextTick();
    syncBoard();
  },
  { deep: true, immediate: true }
);

watch(
  () => isCoordinatePlaneActive.value,
  async (active) => {
    if (!active) {
      deactivate();
      return;
    }
    await nextTick();
    syncBoard();
  }
);

onMounted(async () => {
  await nextTick();
  mount();
});

onUnmounted(() => {
  unmount();
});
</script>

<template>
  <section class="coordinate-plane-scene" data-view-id="plane.main">
    <div v-if="isCoordinatePlaneActive && scene" class="stage-root">
      <div class="stage-backdrop" />

      <header class="floating-title">
        <p>{{ stageTitle }}</p>
        <span>Objects {{ scene.objects.length }} · Grid {{ scene.viewport.show_grid ? "On" : "Off" }}</span>
      </header>

      <main class="plane-stage">
        <section class="plane-board-shell">
          <div :ref="setBoardContainer" class="plane-board" :data-render-token="renderToken" />
          <div v-if="boardError" class="board-overlay is-error">
            <p>{{ boardError }}</p>
          </div>
          <div v-else-if="scene.objects.length === 0" class="board-overlay">
            <p>Ready for points, lines, curves, and motion.</p>
          </div>
        </section>

        <aside v-if="highlightLabels.length > 0" class="highlight-ribbon" aria-label="Scene highlights">
          <span v-for="label in highlightLabels" :key="label">{{ label }}</span>
        </aside>
      </main>
    </div>

    <div v-else class="idle">
      <p>Coordinate Plane Scene</p>
      <p>Waiting for <code>view.open</code> with <code>plane.scene</code>.</p>
    </div>
  </section>
</template>

<style scoped>
.coordinate-plane-scene {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.stage-root {
  position: relative;
  flex: 1 1 100%;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #050912;
}

.stage-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 100% at 50% 0%, rgba(48, 101, 189, 0.22) 0%, rgba(8, 12, 22, 0.9) 52%, rgba(4, 7, 14, 1) 100%),
    linear-gradient(180deg, rgba(103, 207, 255, 0.06), transparent 24%);
}

.floating-title {
  position: absolute;
  top: 12px;
  left: 50%;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateX(-50%);
  padding: 8px 14px;
  border: 1px solid rgba(120, 168, 255, 0.28);
  border-radius: 999px;
  background: rgba(7, 14, 27, 0.68);
  backdrop-filter: blur(10px);
  color: #e8f0ff;
}

.floating-title p,
.floating-title span {
  margin: 0;
}

.floating-title p {
  font-weight: 700;
}

.floating-title span {
  color: #98afd0;
  font-size: 0.82rem;
}

.plane-stage {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  padding: 0;
}

.plane-board-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.plane-board {
  width: 100%;
  height: 100%;
}

.board-overlay {
  position: absolute;
  right: 24px;
  bottom: 24px;
  padding: 10px 14px;
  border: 1px solid rgba(127, 156, 209, 0.2);
  border-radius: 14px;
  background: rgba(7, 12, 24, 0.72);
  color: #d8e4f7;
  pointer-events: none;
}

.board-overlay p {
  margin: 0;
}

.board-overlay.is-error {
  border-color: rgba(255, 143, 143, 0.38);
  color: #ffd6d6;
}

.highlight-ribbon {
  position: absolute;
  left: 24px;
  bottom: 24px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: min(70vw, 720px);
}

.highlight-ribbon span {
  padding: 6px 12px;
  border: 1px solid rgba(255, 224, 138, 0.38);
  border-radius: 999px;
  background: rgba(28, 21, 6, 0.78);
  color: #ffe8a6;
  font-size: 0.82rem;
  font-weight: 700;
}

.idle {
  min-height: min(420px, 70vh);
  display: grid;
  place-content: center;
  text-align: center;
  color: #cfd7e6;
}

.idle p {
  margin: 0.2rem 0;
}

.idle code {
  background: rgba(12, 16, 24, 0.8);
  padding: 0.1em 0.35em;
  border-radius: 6px;
}

:deep(.jxgbox) {
  border: 0;
  background: transparent;
}

:deep(.plane-board-text) {
  color: #edf4ff;
  font-weight: 650;
  user-select: none;
  pointer-events: none;
}

:deep(.plane-formula-text) {
  color: #ffe8a6;
  font-weight: 700;
  user-select: none;
  pointer-events: none;
}

@media (max-width: 900px) {
  .floating-title {
    top: 8px;
    max-width: calc(100vw - 16px);
  }

  .board-overlay,
  .highlight-ribbon {
    left: 12px;
    right: 12px;
    bottom: 12px;
  }

  .highlight-ribbon {
    right: auto;
    max-width: calc(100vw - 24px);
  }
}
</style>
