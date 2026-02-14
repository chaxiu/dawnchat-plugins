<template>
  <div class="progress-wrap">
    <div class="progress-header">
      <span class="status">{{ statusText }}</span>
      <span class="value">{{ safeProgress.toFixed(1) }}%</span>
    </div>
    <div class="bar">
      <div class="fill" :style="{ width: `${safeProgress}%` }"></div>
    </div>
    <div class="meta">
      <span v-if="totalBytes > 0">{{ formatSize(downloadedBytes) }} / {{ formatSize(totalBytes) }}</span>
      <span v-if="speed">{{ speed }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    progress: number
    status: string
    downloadedBytes?: number
    totalBytes?: number
    speed?: string
  }>(),
  {
    downloadedBytes: 0,
    totalBytes: 0,
    speed: ''
  }
)

const safeProgress = computed(() => Math.max(0, Math.min(100, Number(props.progress || 0))))

const statusText = computed(() => {
  const status = props.status
  if (status === 'pending') return 'Pending'
  if (status === 'downloading') return 'Downloading'
  if (status === 'paused') return 'Paused'
  if (status === 'completed') return 'Completed'
  if (status === 'failed') return 'Failed'
  if (status === 'cancelled') return 'Cancelled'
  return status || 'Unknown'
})

function formatSize(bytes: number): string {
  const n = Number(bytes || 0)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
</script>

<style scoped>
.progress-wrap { display: flex; flex-direction: column; gap: 6px; }
.progress-header { display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; }
.bar { width: 100%; height: 8px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
.fill { height: 100%; background: #2563eb; transition: width 0.2s ease; }
.meta { display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
</style>
