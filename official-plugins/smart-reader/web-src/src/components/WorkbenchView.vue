<template>
  <div class="workbench">
    <div class="workbench-header">
      <div class="workbench-left">
        <button class="button ghost" @click="$emit('back')">‹ 返回</button>
        <div class="workbench-title">{{ file?.name || '未命名文件' }}</div>
      </div>
      <div class="mode-toggle">
        <button class="active">交互模式</button>
        <button class="disabled">讲师模式</button>
      </div>
      <div class="toolbar-actions">
        <button class="button secondary">显示设置</button>
        <button class="button secondary">导出笔记</button>
      </div>
    </div>
    <div class="split-view">
      <div class="panel">
        <div class="panel-header">内容视窗</div>
        <div class="panel-body">
          <PdfViewer v-if="file" :file-id="file.id" @add-context="handleAddContext" />
          <div v-else class="empty-state">请选择文件</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">AI 伴读窗口</div>
        <div class="panel-body">
          <ChatPanel ref="chatPanelRef" :file="file" @refresh="$emit('refresh')" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PdfViewer from './PdfViewer.vue'
import ChatPanel from './ChatPanel.vue'

const chatPanelRef = ref(null)

defineProps({
  file: {
    type: Object,
    default: null
  }
})

const handleAddContext = (text) => {
  chatPanelRef.value?.appendContext?.(text)
}
</script>
