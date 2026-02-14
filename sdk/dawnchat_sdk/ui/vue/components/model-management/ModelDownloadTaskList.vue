<template>
  <div class="tasks">
    <div v-if="tasks.length === 0" class="empty">No download tasks</div>
    <div v-for="task in tasks" :key="task.taskId" class="task">
      <div class="task-head">
        <div class="title">{{ task.modelName }}</div>
        <div class="status">{{ task.status }}</div>
      </div>
      <ModelDownloadProgressBar
        :progress="task.progress"
        :status="task.status"
        :downloaded-bytes="task.downloadedBytes"
        :total-bytes="task.totalBytes"
        :speed="task.speed"
      />
      <div v-if="task.errorMessage" class="error">{{ task.errorMessage }}</div>
      <slot name="actions" :task="task"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import ModelDownloadProgressBar from './ModelDownloadProgressBar.vue'
import type { ModelDownloadTask } from '../../types/model-management'

defineProps<{ tasks: ModelDownloadTask[] }>()
</script>

<style scoped>
.tasks { display: flex; flex-direction: column; gap: 10px; }
.task { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #fff; }
.task-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.title { font-size: 13px; color: #111827; font-weight: 600; }
.status { font-size: 12px; color: #6b7280; text-transform: capitalize; }
.error { color: #b91c1c; font-size: 12px; margin-top: 6px; }
.empty { color: #9ca3af; font-size: 12px; }
</style>
