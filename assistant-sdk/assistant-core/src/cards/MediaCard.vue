<script setup lang="ts">
const props = defineProps<{
  title?: string;
  data: Record<string, unknown>;
}>();
const emit = defineEmits<{
  completed: [{ reason?: string; dismiss_after_ms?: number }];
}>();

const mediaType = String(props.data.media_type || "image");
const src = String(props.data.src || "");
const caption = String(props.data.caption || "");

function onPlaybackEnded() {
  emit("completed", {
    reason: "media_playback_completed",
    dismiss_after_ms: 2400,
  });
}
</script>

<template>
  <section class="card">
    <header class="card-head">
      <span class="chip">Media</span>
      <h3>{{ title || "多媒体卡片" }}</h3>
    </header>
    <img v-if="mediaType === 'image' && src" :src="src" :alt="caption || 'image'" class="media" />
    <video v-else-if="mediaType === 'video' && src" :src="src" controls class="media" @ended="onPlaybackEnded" />
    <audio v-else-if="mediaType === 'audio' && src" :src="src" controls class="media" @ended="onPlaybackEnded" />
    <p v-if="caption" class="caption">{{ caption }}</p>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  padding: 14px 16px 16px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.7));
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.16);
}
.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.chip {
  font-size: 0.72rem;
  border-radius: 999px;
  padding: 4px 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #67e8f9;
  border: 1px solid rgba(34, 211, 238, 0.3);
  background: rgba(21, 94, 117, 0.34);
}
h3 {
  margin: 0;
  font-size: 1.02rem;
  color: #eff6ff;
}
.media {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.55);
}
.caption {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.55;
}
</style>
