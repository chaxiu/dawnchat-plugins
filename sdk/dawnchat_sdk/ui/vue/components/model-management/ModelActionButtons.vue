<template>
  <div class="actions">
    <button v-if="status === 'idle' || status === 'failed' || status === 'cancelled'" @click="$emit('download')" class="btn">
      Download
    </button>
    <button v-if="status === 'pending' || status === 'downloading'" @click="$emit('pause')" class="btn">
      Pause
    </button>
    <button v-if="status === 'paused'" @click="$emit('resume')" class="btn">
      Resume
    </button>
    <button v-if="status !== 'completed' && status !== 'idle'" @click="$emit('cancel')" class="btn danger">
      Cancel
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ status: string }>()

defineEmits<{
  (e: 'download'): void
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'cancel'): void
}>()
</script>

<style scoped>
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #111827;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.btn.danger { border-color: #ef4444; color: #b91c1c; }
</style>
