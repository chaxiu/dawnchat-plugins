<template>
  <div class="toolbar">
    <div>
      <div class="breadcrumb">媒体库 / 本地文件</div>
    </div>
    <div class="toolbar-actions">
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'grid' }" @click="$emit('toggle-view', 'grid')">⊞</button>
        <button :class="{ active: viewMode === 'list' }" @click="$emit('toggle-view', 'list')">☰</button>
      </div>
      <button class="button secondary" @click="$emit('refresh')">刷新</button>
      <label class="button">
        + 添加文件夹
        <input
          ref="fileInput"
          type="file"
          accept=".pdf"
          multiple
          class="hidden-input"
          @change="onFileChange"
        />
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  viewMode: {
    type: String,
    default: 'grid'
  }
})

const emit = defineEmits(['add-files', 'refresh', 'toggle-view'])
const fileInput = ref(null)

const onFileChange = (event) => {
  const files = Array.from(event.target.files || [])
  emit('add-files', files)
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<style scoped>
.hidden-input {
  display: none;
}
</style>
