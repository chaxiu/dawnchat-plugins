<template>
  <div class="part-image">
    <button
      class="part-image-thumb"
      type="button"
      :aria-label="altText"
      :title="altText"
      @click="open = true"
    >
      <img :src="image.url" :alt="altText" loading="lazy" />
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        class="part-image-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="altText"
        @click.self="open = false"
        @keydown.esc.prevent="open = false"
      >
        <button class="part-image-lightbox-close" type="button" aria-label="Close" @click="open = false">
          ×
        </button>
        <img :src="image.url" :alt="altText" class="part-image-lightbox-img" />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { ChatImageInfo } from "../types";

const props = defineProps<{
  image: ChatImageInfo;
}>();

const open = ref(false);

const altText = computed(() => {
  return (
    String(props.image.alt || "").trim()
    || String(props.image.filename || "").trim()
    || "Image"
  );
});

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value) {
    open.value = false;
  }
}

watch(open, (next) => {
  if (typeof document === "undefined") return;
  document.body.style.overflow = next ? "hidden" : "";
});

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("keydown", onKeydown);
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
});
</script>

<style scoped>
.part-image {
  margin: 0.28rem 0 0.1rem;
}

.part-image-thumb {
  display: block;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-surface-2) 88%, transparent);
  cursor: zoom-in;
  overflow: hidden;
  max-width: min(100%, 280px);
}

.part-image-thumb img {
  display: block;
  max-width: 100%;
  max-height: 160px;
  width: auto;
  height: auto;
  object-fit: contain;
  vertical-align: middle;
}

.part-image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: color-mix(in srgb, #000 72%, transparent);
  cursor: zoom-out;
}

.part-image-lightbox-img {
  max-width: min(96vw, 1200px);
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 12px 40px color-mix(in srgb, #000 45%, transparent);
  cursor: default;
}

.part-image-lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: color-mix(in srgb, #000 45%, transparent);
  color: #fff;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.part-image-lightbox-close:hover {
  background: color-mix(in srgb, #000 65%, transparent);
}
</style>
