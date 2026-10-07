<template>
  <div v-if="images.length > 0" class="chat-image-strip">
    <ChatPartImage v-for="(image, index) in images" :key="imageKey(image, index)" :image="image" />
  </div>
</template>

<script setup lang="ts">
import type { ChatImageInfo } from "../types";
import ChatPartImage from "./ChatPartImage.vue";

defineProps<{
  images: ChatImageInfo[];
}>();

function imageKey(image: ChatImageInfo, index: number): string {
  return `${image.mime}:${image.filename || ""}:${index}:${image.url.slice(0, 48)}`;
}
</script>

<style scoped>
.chat-image-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: flex-start;
  margin-top: 0.12rem;
}
</style>
