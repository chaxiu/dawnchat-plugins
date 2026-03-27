<script setup lang="ts">
const props = defineProps<{
  title?: string;
  data: Record<string, unknown>;
}>();

const mediaType = String(props.data.media_type || "image");
const src = String(props.data.src || "");
const caption = String(props.data.caption || "");
</script>

<template>
  <section class="card">
    <h3>{{ title || "多媒体卡片" }}</h3>
    <img v-if="mediaType === 'image' && src" :src="src" :alt="caption || 'image'" />
    <video v-else-if="mediaType === 'video' && src" :src="src" controls />
    <audio v-else-if="mediaType === 'audio' && src" :src="src" controls />
    <p v-if="caption" class="caption">{{ caption }}</p>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  background: #fff;
}
img,
video,
audio {
  width: 100%;
  border-radius: 8px;
}
.caption {
  margin: 8px 0 0;
  color: #475569;
}
</style>
