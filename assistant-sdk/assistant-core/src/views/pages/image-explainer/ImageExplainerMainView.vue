<script setup lang="ts">
import { computed } from "vue";

import { useImageExplainerScene } from "./composables/useImageExplainerScene";

const {
  currentPage,
  deck,
  getHighlightsForImage,
  isImageExplainerActive,
  stageTitle,
} = useImageExplainerScene();

const hasImages = computed(() => Boolean(currentPage.value && currentPage.value.images.length > 0));

function highlightStyle(highlight: {
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}) {
  if (highlight.shape === "circle") {
    const diameter = `${Math.max(0, highlight.radius) * 200}%`;
    return {
      left: `${highlight.x * 100}%`,
      top: `${highlight.y * 100}%`,
      width: diameter,
      height: diameter,
      borderRadius: "999px",
    };
  }
  return {
    left: `${highlight.x * 100}%`,
    top: `${highlight.y * 100}%`,
    width: `${highlight.width * 100}%`,
    height: `${highlight.height * 100}%`,
    borderRadius: "18px",
  };
}
</script>

<template>
  <section class="image-explainer-scene" data-view-id="image.explainer">
    <div v-if="isImageExplainerActive" class="stage-root">
      <div class="stage-backdrop" />

      <header v-if="stageTitle" class="floating-title">
        <p>{{ stageTitle }}</p>
      </header>

      <main class="image-stage" :class="currentPage?.layout === 'split' ? 'is-split' : 'is-single'">
        <template v-if="hasImages && currentPage">
          <article
            v-for="image in currentPage.images"
            :key="image.id"
            class="image-panel"
          >
            <img
              class="stage-image"
              :src="image.src"
              :alt="image.alt"
              draggable="false"
            >
            <div class="image-overlay" aria-hidden="true">
              <div
                v-for="highlight in getHighlightsForImage(image.id)"
                :key="highlight.id"
                class="highlight-region"
                :class="highlight.shape === 'circle' ? 'is-circle' : 'is-rect'"
                :style="highlightStyle(highlight)"
              >
                <span v-if="highlight.label" class="highlight-label">{{ highlight.label }}</span>
              </div>
            </div>
          </article>
        </template>

        <div v-else class="empty-stage">
          <p>{{ deck?.title || "AI Visual Explainer" }}</p>
          <p>Waiting for images.</p>
        </div>
      </main>
    </div>

    <div v-else class="idle">
      <p>Image Explainer Scene</p>
      <p>Waiting for <code>view.open</code> with <code>image.deck</code>.</p>
    </div>
  </section>
</template>

<style scoped>
.image-explainer-scene {
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
  background: #050608;
}

.stage-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(110% 90% at 50% 50%, rgba(36, 42, 54, 0.28) 0%, rgba(6, 7, 11, 0.92) 58%, rgba(3, 4, 7, 1) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 20%);
}

.floating-title {
  position: absolute;
  top: 10px;
  left: 50%;
  z-index: 2;
  transform: translateX(-50%);
  max-width: min(92vw, 960px);
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(9, 11, 17, 0.5);
  backdrop-filter: blur(8px);
}

.floating-title p {
  margin: 0;
  color: #f5f7fb;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.image-stage {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  display: grid;
  gap: 0;
}

.image-stage.is-single {
  grid-template-columns: minmax(0, 1fr);
}

.image-stage.is-split {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px;
}

.image-panel {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  height: 100%;
}

.stage-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  user-select: none;
}

.image-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.highlight-region {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 3px solid rgba(255, 238, 164, 0.98);
  box-shadow:
    0 0 0 9999px rgba(1, 3, 8, 0.48),
    0 0 0 3px rgba(255, 255, 255, 0.42),
    0 0 28px rgba(255, 226, 128, 0.75);
}

.highlight-region.is-rect {
  min-width: 20px;
  min-height: 20px;
}

.highlight-region.is-circle {
  min-width: 26px;
  min-height: 26px;
}

.highlight-label {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%);
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(8, 10, 16, 0.84);
  color: #f9f0ca;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
}

.empty-stage,
.idle {
  min-height: min(420px, 70vh);
  display: grid;
  place-content: center;
  text-align: center;
  color: #cfd7e6;
}

.empty-stage p,
.idle p {
  margin: 0.2rem 0;
}

.idle code {
  background: rgba(12, 16, 24, 0.8);
  padding: 0.1em 0.35em;
  border-radius: 6px;
}

@media (max-width: 900px) {
  .image-stage.is-split {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 2px;
  }

  .image-stage {
    padding: 0;
  }

  .floating-title {
    top: 8px;
    max-width: calc(100vw - 16px);
  }
}
</style>
