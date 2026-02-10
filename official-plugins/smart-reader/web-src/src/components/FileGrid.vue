<template>
  <div>
    <div v-if="loading" class="empty-state">正在加载...</div>
    <div v-else-if="error" class="empty-state">{{ error }}</div>
    <div v-else-if="!files.length" class="empty-state">暂无文件，请添加 PDF</div>
    <div v-else class="grid">
      <div v-for="file in files" :key="file.id" class="file-card" @click="$emit('open', file)">
        <div class="file-thumb">📄</div>
        <div class="file-title">{{ file.name }}</div>
        <div class="file-meta">
          <span>{{ file.page_count ? `${file.page_count} 页` : 'PDF' }}</span>
          <span>{{ statusLabel(file.status) }}</span>
        </div>
        <span :class="['status-badge', statusClass(file.status)]">
          {{ statusLabel(file.status) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  files: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const statusLabel = (status) => {
  if (status === 'processing') return 'Loading'
  if (status === 'ready') return 'Ready'
  if (status === 'error') return 'Error'
  return '未解析'
}

const statusClass = (status) => {
  if (status === 'processing') return 'status-processing'
  if (status === 'ready') return 'status-ready'
  if (status === 'error') return 'status-error'
  return 'status-idle'
}
</script>
